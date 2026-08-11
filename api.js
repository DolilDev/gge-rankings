// gge-rankings — api.js (split from app.js; classic script, shared global scope).
// Load order: config → i18n → state → api → render → features → main. All wiring + init() live in main.js (loaded last).

// ── API with retry ──
const CACHE=new Map();
const EVENT_CATALOGS=new Map();
function cGet(k){const e=CACHE.get(k);return(e&&Date.now()<e.x)?e.v:null}
function cSet(k,v,ttl){CACHE.set(k,{v,x:Date.now()+ttl})}
async function fetchRetry(url,retries=2){
  for(let i=0;i<=retries;i++){
    try{
      const r=await fetch(url);
      if(r.ok)return r;
      if(r.status>=500&&i<retries){await delay(400*(i+1));continue}
      return r;
    }catch(e){
      if(i===retries)throw e;
      await delay(400*(i+1));
    }
  }
}
async function ggeGet(url,fresh=false){
  const hit=fresh?null:cGet(url);if(hit)return hit;
  try{
    const r=await fetchRetry(url);if(!r||!r.ok)return null;
    const d=await r.json();cSet(url,d,60000);return d;
  }catch(e){console.warn('ggeGet failed:',e.message);return null}
}
function ggeUrl(server,lt,sv,lid){
  const svEnc=encodeURIComponent(sv);
  let p=`%22LT%22:${lt},%22SV%22:%22${svEnc}%22`;
  if(lid)p=`%22LT%22:${lt},%22LID%22:${lid},%22SV%22:%22${svEnc}%22`;
  return`${GGE_API}/${server}/hgh/${p}`;
}
function ggeGlobalUrl(server,lt,rank,lid){
  let p=`"LT":${lt},"R":${rank}`;if(lid)p=`"LT":${lt},"LID":${lid},"R":${rank}`;
  return`${GGE_API}/${server}/llsp/${p.replace(/"/g,'%22')}`;
}

// ── gge-tracker API (alliance members) ──
// Maps our server code (ALL_SERVERS[].code) to gge-tracker's `gge-server` header value.
// Returns null when gge-tracker doesn't track that server (e.g. the NET* / Sieć worlds).
function ggtServer(code){
  if(!code)return null;
  const alias={AR1:'SA1',LATAM1:'HIS1',W1:'WORLD1',W2:'WORLD2'};
  const supported=new Set(['INT1','INT2','INT3','ASIA','AU1','BR1','BG1','CN1','HANT1','CZ1','DE1','EG1','FR1','GB1','GR1','ES1','ES2','NL1','IN1','IT1','JP1','ARAB1','LT1','SKN1','PL1','PT1','RO1','RU1','SK1','US1','TR1','HU1','HU2','AE1','SA1','HIS1','WORLD1','WORLD2','GLOBAL','KR1','E4K_BR1','E4K_HANT1','E4K_FR1','E4K_DE1','E4K_DE2','E4K_US1','E4K_INT2','E4K_CN1','E4K_GB1','E4K_RU1']);
  const s=alias[code]||code;
  return supported.has(s)?s:null;
}
async function ggtGet(path,srv){
  const key=`ggt:${srv}:${path}`;
  const hit=cGet(key);if(hit)return hit;
  try{
    const r=await timeout(fetch(`${GGE_TRACKER_API}/${path}`,{headers:{'gge-server':srv}}),10000);
    if(!r||!r.ok)return null;
    const d=await r.json();cSet(key,d,60000);return d;
  }catch(e){console.warn('ggtGet failed:',e.message);return null}
}
// Resolve an alliance by name (→ gge-tracker id) then fetch its member list.
// Returns {players,name} | {unsupported} | {notFound} | {error}.
async function ggtAllianceMembers(name,code){
  const srv=ggtServer(code);
  if(!srv)return{unsupported:true};
  if(!name)return{notFound:true};
  const byName=await ggtGet(`alliances/name/${encodeURIComponent(name)}`,srv);
  if(byName===null)return{error:true};
  if(byName.error||byName.alliance_id==null)return{notFound:true};
  const det=await ggtGet(`alliances/id/${encodeURIComponent(byName.alliance_id)}`,srv);
  if(det===null)return{error:true};
  if(det.error||!Array.isArray(det.players))return{notFound:true};
  return{name:det.alliance_name||name,players:det.players};
}

// ── Events ──
function evname(k){return S.texts[k]||L(EV_LABELS[k]||k.replace(/_/g,' '))}
function catname(c){
  if(!c)return'';const v=c.value;
  if(v!=null&&v!==''){
    if(c.name==='level_placeholder')return v==='70'?'✦ 70+':(`Lv ${v}`);
    if(c.name==='legendaryLevel_placeholder')return`✦ ${v}`;
    if(c.name==='dialog_ci_filter01_all')return'Wszyscy';
    const t=S.texts[c.name];return t?t.replace(/%s|\{[^}]*\}/gi,v).trim():String(v);
  }
  if(c.name==='dialog_ci_filter01_all')return'Wszyscy';
  if(c.name?.includes('blueList'))return'🔵 Niebiescy';
  if(c.name?.includes('redList'))return'🔴 Czerwoni';
  return S.texts[c.name]||c.name||'';
}
function evList(){return S.events[S.allianceMode?'alliance':'player']||{}}
function curEv(){return evList()[S.eventKey]||{}}
function curCat(){const c=curEv().categories;if(!c?.length)return{};return c[Math.min(S.catIdx,c.length-1)]||{}}
function curLT(){return curCat().eventid??curEv().id}
function isGlobal(){return!!curEv().global}
// Synthetic ranking: there is no server-side "player glory" board, so we build one client-side
// by pooling the top players from a broad base board (nobility) and re-sorting by the chosen
// field. curEv().synthetic holds that field name (e.g. 'glory').
function synthActive(){return!S.allianceMode&&!!curEv().synthetic}
function synthField(){return curEv().synthetic||null}

// ── Parse ──
function parseRows(data){
  if(!data||data.return_code!==0)return{rows:[],total:0};
  const c=data.content||{};const L=c.L||[];const total=c.LR||c.T||L.length;
  const rows=L.map(entry=>{
    if(!Array.isArray(entry))return null;
    // Most leaderboards: [rank, score, payload]. Some event boards (e.g. cargo/Karawan)
    // prepend a flag: [flag, rank, score, payload]. Locate the payload (the first array or
    // object) and read the two numbers right before it as rank and score, so the shifted
    // layout doesn't leave every row but #1 with rank 0 (which the page assembler drops).
    const num=value=>{
      if(value===null||value===undefined||value==='')return null;
      const parsed=Number(value);return Number.isFinite(parsed)?parsed:null;
    };
    let pIdx=entry.findIndex(x=>Array.isArray(x)||(x&&typeof x==='object'));
    if(pIdx<2)pIdx=2;
    const rank=num(entry[pIdx-2]),score=num(entry[pIdx-1]),obj=entry[pIdx]||{};
    if(rank==null)return null;
    const isArr=Array.isArray(obj);
    let name,al,alTag,members,honor,might,glory,level,legendLevel,avp,hf,rpt,rank2,pre,suf,ap,vp,banned,prot,emblem;
    let allianceId=null;
    if(isArr){
      const strs=obj.filter(x=>typeof x==='string'&&x.length>0);
      name=strs[0]||'—';
      if(S.allianceMode){
        allianceId=num(obj[0]);
        members=num(obj[2]);
      }
    }else{
      name=typeof obj.N==='string'&&obj.N?obj.N:'—';
      al=typeof obj.AN==='string'&&obj.AN?obj.AN:null;
      alTag=typeof obj.AT==='string'&&obj.AT?obj.AT:null;
      members=num(obj.MC??obj.NM??obj.MCount??obj.memberCount??obj.members??obj.M);honor=num(obj.H);might=num(obj.MP);
      glory=num(obj.CF);level=num(obj.L);legendLevel=num(obj.LL);
      avp=num(obj.AVP);hf=num(obj.HF);rpt=num(obj.RPT);
      rank2=num(obj.R);pre=num(obj.PRE);suf=num(obj.SUF);
      ap=num(obj.AP);vp=num(obj.VP);
      // Coat of arms (rendered client-side from the baked pack via Crest). See crest.js.
      emblem=(obj.E&&typeof obj.E==='object')?obj.E:null;
      // The highscore payload carries no reliable ban/protection flag (PF/VF/DUM don't track it —
      // even level-3 beginners under protection show nothing). Protection comes from gge-tracker
      // instead (peace_disabled_at), shown in the alliance member-stats list.
      banned=false;prot=false;
    }
    return{rank,score,name,al,alTag,allianceId,members,honor,might,glory,level,legendLevel,avp,hf,rpt,rank2,pre,suf,ap,vp,banned,prot,emblem:emblem||null};
  }).filter(Boolean);
  return{rows,total};
}

// ── Load ──
async function loadTexts(){
  try{const r=await timeout(fetch(TEXTS_URL(S.lang)),4000);if(r.ok){const d=await r.json();if(d)S.texts=d;}}catch{}
}
async function getEventCatalog(game){
  if(EVENT_CATALOGS.has(game))return EVENT_CATALOGS.get(game);
  const pending=(async()=>{
    try{
      const r=await timeout(fetch(EVENTS_URL(game)),6000);
      if(!r.ok)return null;
      const data=await r.json();
      return data&&typeof data==='object'&&data.player&&typeof data.player==='object'?data:null;
    }catch{return null}
  })();
  EVENT_CATALOGS.set(game,pending);
  const catalog=await pending;
  if(!catalog)EVENT_CATALOGS.delete(game);
  return catalog;
}
async function loadEvents(){
  const game=srvGame(S.server);
  const catalog=await getEventCatalog(game);
  if(catalog)S.events=JSON.parse(JSON.stringify(catalog));
  if(!S.events.player){
    S.events={
      player:{
        honorPoints:{id:5,categories:[{id:6,name:'level_placeholder',value:'70'},{id:5,name:'level_placeholder',value:'50-69'},{id:4,name:'level_placeholder',value:'40-59'},{id:3,name:'level_placeholder',value:'30-39'},{id:2,name:'level_placeholder',value:'20-29'},{id:1,name:'level_placeholder',value:'1-19'}]},
        playerMight:{id:6,categories:[{id:6,name:'level_placeholder',value:'70'},{id:5,name:'level_placeholder',value:'50-69'},{id:4,name:'level_placeholder',value:'40-59'},{id:3,name:'level_placeholder',value:'30-39'},{id:2,name:'level_placeholder',value:'20-29'},{id:1,name:'level_placeholder',value:'1-19'}]}
      },
      alliance:{allianceHonor:{id:10,categories:[{id:1,name:'dialog_ci_filter01_all'}]},allianceMight:{id:11,categories:[{id:1,name:'dialog_ci_filter01_all'}]}},
      player_to_alliance:[['honorPoints','allianceHonor'],['playerMight','allianceMight']]
    };
  }
  injectRequiredGgeEvents();
  injectSyntheticEvents();
  normalizeCats();validateEv();buildEventSel();
}
// The live game can publish a leaderboard before the shared event catalogue is refreshed.
// Add only missing definitions so newer catalogue metadata always wins.
function injectRequiredGgeEvents(){
  const p=S.events.player;
  if(srvGame(S.server)!=='gge'||!p)return;
  for(const [key,event] of Object.entries(REQUIRED_GGE_PLAYER_EVENTS)){
    if(!p[key])p[key]=JSON.parse(JSON.stringify(event));
  }
}
// Add the client-side "Chwała" (glory) player ranking right after Might. It reuses the nobility
// board (a single, level-agnostic list of every player, each row carrying CF/glory) as its pool
// source. GGE only — E4K isn't guaranteed to expose that board.
function injectSyntheticEvents(){
  const p=S.events.player;
  if(srvGame(S.server)!=='gge'||!p||p.playerGlory)return;
  const baseLT=p.dialog_BeggingKnights_nobilityPoints?.id??2;
  const glory={id:baseLT,synthetic:'glory'};
  const rebuilt={};
  for(const k of Object.keys(p)){rebuilt[k]=p[k];if(k==='playerMight')rebuilt.playerGlory=glory}
  if(!rebuilt.playerGlory)rebuilt.playerGlory=glory; // no Might key → just append
  S.events.player=rebuilt;
}
function validateEv(){
  const l=evList();
  if(!(S.eventKey in l))S.eventKey=Object.keys(l)[0]||'';
  const count=l[S.eventKey]?.categories?.length||1;
  S.catIdx=Math.max(0,Math.min(Number.isInteger(S.catIdx)?S.catIdx:0,count-1));
}
function normalizeCats(){
  ['player','alliance'].forEach(mode=>{
    const evs=S.events[mode]||{};
    Object.values(evs).forEach(ev=>{
      if(!ev.categories)return;
      const isLevel=ev.categories.some(c=>c.name==='level_placeholder');
      if(isLevel)ev.categories=[...ev.categories].reverse();
    });
  });
}

async function fetchRanking(sv,fresh=false){
  const isNameSearch=sv&&isNaN(+sv);
  const lt=isNameSearch?(curEv().id??curLT()):curLT();
  if(!lt||!S.server)return null;
  const lid=isNameSearch?'':curCat().id||'';
  try{
    const url=isGlobal()?ggeGlobalUrl(S.server,lt,sv,lid):ggeUrl(S.server,lt,sv,lid);
    return await timeout(ggeGet(url,fresh),10000);
  }catch(e){console.warn('fetchRanking:',e.message);return null}
}

// Fetch one UI page (up to S.pageSize rows). Name search → single request;
// numeric start rank → ceil(pageSize/API_PAGE) chunks fetched in parallel and merged.
async function fetchRankingPage(sv,fresh=false){
  const isName=sv&&isNaN(+sv);
  if(isName){const d=await fetchRanking(sv,fresh);return d?parseRows(d):null}
  const start=Math.max(1,+sv||1);
  const map=new Map();let total=0;
  // Returns how many *new* ranks were added (so the fill loop can detect "no progress").
  const fetchInto=async(starts,skipCache)=>{
    const results=await Promise.all(starts.map(s=>fetchRanking(String(s),skipCache)));
    let added=0;
    results.forEach(d=>{if(!d)return;const pr=parseRows(d);if(pr.total>total)total=pr.total;pr.rows.forEach(r=>{if(r&&r.rank!=null&&!map.has(r.rank)){map.set(r.rank,r);added++;}})});
    return added;
  };
  const chunks=Math.max(1,Math.ceil(S.pageSize/API_PAGE));
  const firstStarts=[];for(let i=0;i<chunks;i++)firstStarts.push(start+i*API_PAGE);
  await fetchInto(firstStarts,fresh);
  // Some leaderboards (e.g. achievement points) return a window offset a few ranks *before*
  // the requested SV — so SV=11 yields ranks 7‑16, and the fixed chunks above leave a gap at
  // the tail of the page (showing e.g. 46 of 50). Fill any rank still missing in [start, end]
  // by requesting that rank directly, bounded by the real total and a guard against looping.
  for(let guard=0;guard<8;guard++){
    const end=total>0?Math.min(start+S.pageSize-1,total):start+S.pageSize-1;
    let missing=-1;
    for(let rank=start;rank<=end;rank++){if(!map.has(rank)){missing=rank;break;}}
    if(missing<0)break;
    await delay(200);
    if(!await fetchInto([String(missing)],true))break; // no new rows → genuine end / API cap
  }
  if(!map.size)return null;
  const rows=[...map.values()].filter(r=>r.rank>=start).sort((a,b)=>a.rank-b.rank).slice(0,S.pageSize);
  return{rows,total:total||rows.length};
}

async function loadRanking(sv='1',fresh=false){
  // Don't drop the open detail panel here — renderTable() re-attaches it by player
  // name, so it survives refreshes. Context navigations clear it explicitly.
  S.lastSearch=(sv&&isNaN(+sv))?sv.toLowerCase():'';
  if(synthActive())return loadSynth(fresh);
  const rid=++S.reqId;S.loading=true;
  // Keep the current table on screen (dimmed) while refreshing, so there is no blank gap.
  const keep=S.rows.length>0;
  setSt('spin',L(keep?'Odświeżanie...':'Pobieranie...'));
  if(keep)$('mainView').classList.add('stale');else showSpin();
  if(!S.server||!curLT()){S.loading=false;setSt('err',L('Wybierz serwer lub ranking'));showSt('⚙️',L('Wybierz serwer z listy'),'');return}
  const res=await fetchRankingPage(sv,fresh);
  if(rid!==S.reqId)return;
  S.loading=false;
  if(!res){
    setSt('err',L('Błąd API'));
    if(keep)$('mainView').classList.remove('stale'); // keep showing the previous data
    else showSt('🔌',L('Błąd połączenia z API'),L('Sprawdź połączenie z internetem i spróbuj ponownie.'));
    return;
  }
  const{rows,total}=res;

  S.rows=rows;S.totalRows=total;
  if(!rows.length){setSt('live',L('Brak danych'));showSt('📭',L('Brak danych dla tego rankingu'),L('Ten event może nie być aktywny na wybranym serwerze.'));return}
  const totalPgs=Math.max(1,Math.ceil(total/S.pageSize));
  $('sTotal').textContent=fmtN(total);$('sPage').textContent=`${S.curPage} / ${totalPgs}`;
  setSt('live',L('Dane LIVE · {t}',{t:new Date().toLocaleTimeString(curLocale())}));
  if(S.server)localStorage.setItem('server',S.server);

  renderTable();renderPg();
  writeHash();

  // Favorites are queried separately when they are outside the visible page. Do this
  // after rendering so a slow lookup never delays the visible ranking.
  const snapshotRows=S.allianceMode?rows:await rowsWithTrackedFavorites(rows,fresh);
  if(rid!==S.reqId)return;
  if(!S.allianceMode)detectFavMovements(snapshotRows);
  // Capture snapshot AFTER render so prev ranks were available for indicators
  captureSnapshot(snapshotRows);
}

async function rowsWithTrackedFavorites(rows,fresh=false){
  const game=srvGame(S.server);
  const favorites=S.favs.filter(f=>f.game===game&&f.server===S.server);
  if(!favorites.length)return rows;
  const byName=new Map(rows.map(r=>[r.name.toLowerCase(),r]));
  const missing=favorites.filter(f=>!byName.has(f.name.toLowerCase()));
  const found=await Promise.all(missing.map(async fav=>{
    const data=await fetchRanking(fav.name,fresh);
    const matches=data?parseRows(data).rows:[];
    return matches.find(r=>r.name.toLowerCase()===fav.name.toLowerCase())||null;
  }));
  found.filter(Boolean).forEach(r=>byName.set(r.name.toLowerCase(),r));
  return[...byName.values()];
}

// Build & render the synthetic glory ranking: pull the base-board pool, sort by the chosen field,
// re-rank 1..N and paginate locally (the table/pager treat it like the filter path).
async function loadSynth(fresh=false){
  const rid=++S.reqId;
  const ctx=poolCtx();
  const cached=S.pool&&S.poolCtx===ctx;
  if(!cached){S.loading=true;setSt('spin',L('Pobieranie graczy…'));if(S.rows.length||S.synthRows)$('mainView').classList.add('stale');else showSpin()}
  const pool=await ensurePool(fresh);
  if(rid!==S.reqId||poolCtx()!==ctx)return;
  S.loading=false;
  let full=buildSynthRows(pool);
  if(S.lastSearch){const q=S.lastSearch;full=full.filter(r=>(r.name||'').toLowerCase().includes(q))}
  S.synthRows=full;S.totalRows=full.length;
  if(S.server)localStorage.setItem('server',S.server);
  if(!full.length){S.synthRows=[];S.rows=[];$('mainView').classList.remove('stale');setSt('live',L('Brak danych'));showSt('📭',L('Brak wyników'),'');renderPg();writeHash();return}
  const totalPgs=Math.max(1,Math.ceil(full.length/S.pageSize));
  if(S.curPage>totalPgs)S.curPage=1;
  // Keep S.rows pointing at the visible page so "do we have data" checks (pager, tab switch,
  // language re-render) still work — the table itself re-slices from S.synthRows.
  const pageRows=full.slice((S.curPage-1)*S.pageSize,S.curPage*S.pageSize);
  S.rows=pageRows;
  renderSynthStatus();
  renderTable();renderPg();
  const game=srvGame(S.server);
  const tracked=full.filter(row=>S.favs.some(f=>f.game===game&&f.server===S.server&&f.name.toLowerCase()===row.name.toLowerCase()));
  const snapshotRows=[...new Map([...pageRows,...tracked].map(row=>[row.name.toLowerCase(),row])).values()];
  detectFavMovements(snapshotRows);
  captureSnapshot(snapshotRows);
  writeHash();
}

function detectFavMovements(rows){
  const game=srvGame(S.server);
  S.favs.forEach(fav=>{
    if(fav.game!==game||fav.server!==S.server)return;
    const cur=rows.find(r=>r.name.toLowerCase()===fav.name.toLowerCase());
    if(!cur)return;
    const prev=getPrevRank(cur.name);
    if(prev==null)return;
    let msg=null,kind='';
    if(prev>10&&cur.rank<=10){msg=L('🚀 {n} wszedł do TOP 10 (#{r})',{n:fav.name,r:cur.rank});kind='success'}
    else if(prev<=10&&cur.rank>10){msg=L('📉 {n} wypadł z TOP 10 (#{r})',{n:fav.name,r:cur.rank});kind='error'}
    else if(prev>3&&cur.rank<=3){msg=L('🏅 {n} wszedł do TOP 3 (#{r})',{n:fav.name,r:cur.rank});kind='success'}
    if(msg){toast(msg,kind);pushNotify(msg)}
  });
}

async function goPage(page){
  page=Math.max(1,Math.floor(+page)||1);
  // Locally-paginated views (synthetic glory ranking, active filter) just re-slice in place.
  if(synthActive()&&S.synthRows){
    const totalPgs=Math.max(1,Math.ceil(S.synthRows.length/S.pageSize));
    S.curPage=Math.min(Math.max(1,page),totalPgs);
    clearExpanded();
    renderSynthStatus();renderTable();renderPg();writeHash();
    window.scrollTo({top:0,behavior:'smooth'});
    return;
  }
  if(filterActive()&&S.filtered){
    const totalPgs=Math.max(1,Math.ceil(S.filtered.length/S.pageSize));
    S.curPage=Math.min(Math.max(1,page),totalPgs);
    clearExpanded();
    renderFilteredStatus();renderTable();renderPg();writeHash();
    window.scrollTo({top:0,behavior:'smooth'});
    return;
  }
  S.curPage=page;
  await loadRanking(String((page-1)*S.pageSize+1));
  window.scrollTo({top:0,behavior:'smooth'});
}
window.goPage=goPage;
