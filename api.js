// gge-rankings — api.js (split from app.js; classic script, shared global scope).
// Load order: config → i18n → state → api → render → features → main. All wiring + init() live in main.js (loaded last).

// ── API with retry ──
const CACHE=new Map();
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
async function ggeGet(url,skipCache=false){
  if(!skipCache){const hit=cGet(url);if(hit)return hit;}
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
function evname(k){return S.texts[k]||EV_LABELS[k]||k.replace(/_/g,' ')}
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

// ── Parse ──
function parseRows(data){
  if(!data||data.return_code!==0)return{rows:[],total:0};
  const c=data.content||{};const L=c.L||[];const total=c.LR||c.T||L.length;
  const rows=L.map(entry=>{
    if(!Array.isArray(entry))return null;
    const rank=entry[0],score=entry[1],obj=entry[2]||{};
    const isArr=Array.isArray(obj);
    let name,al,alTag,members,honor,might,glory,level,legendLevel,avp,hf,rpt,rank2,pre,suf,ap,vp,banned,prot;
    let allianceId=null;
    if(isArr){
      const strs=obj.filter(x=>typeof x==='string'&&x.length>0);
      name=strs[0]||'—';
      if(S.allianceMode){
        allianceId=typeof obj[0]==='number'?obj[0]:null;
        members=typeof obj[2]==='number'?obj[2]:null;
      }
    }else{
      name=obj.N||'—';al=obj.AN||null;alTag=obj.AT||null;
      members=obj.MC??obj.NM??obj.MCount??obj.memberCount??obj.members??obj.M??null;honor=obj.H??null;might=obj.MP??null;
      glory=obj.CF??null;level=obj.L??null;legendLevel=obj.LL??null;
      avp=obj.AVP??null;hf=obj.HF??null;rpt=obj.RPT??null;
      rank2=obj.R??null;pre=obj.PRE||null;suf=obj.SUF||null;
      ap=obj.AP??null;vp=obj.VP??null;
      banned=false;prot=false;
    }
    return{rank,score,name,al,alTag,allianceId,members,honor,might,glory,level,legendLevel,avp,hf,rpt,rank2,pre,suf,ap,vp,banned,prot};
  }).filter(Boolean);
  return{rows,total};
}

// ── Load ──
async function loadTexts(){
  try{const r=await timeout(fetch(TEXTS_URL(S.lang)),4000);if(r.ok){const d=await r.json();if(d)S.texts=d;}}catch{}
}
async function loadEvents(){
  const game=srvGame(S.server);
  try{const r=await timeout(fetch(EVENTS_URL(game)),6000);if(r.ok){const d=await r.json();if(d)S.events=d;}}catch{}
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
  normalizeCats();validateEv();buildEventSel();
}
function validateEv(){const l=evList();if(!(S.eventKey in l))S.eventKey=Object.keys(l)[0]||''}
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

async function fetchRanking(sv,skipCache=false){
  const isNameSearch=sv&&isNaN(+sv);
  const lt=isNameSearch?(curEv().id??curLT()):curLT();
  if(!lt||!S.server)return null;
  const lid=isNameSearch?'':curCat().id||'';
  try{
    const url=isGlobal()?ggeGlobalUrl(S.server,lt,sv,lid):ggeUrl(S.server,lt,sv,lid);
    return await timeout(ggeGet(url,skipCache),10000);
  }catch(e){console.warn('fetchRanking:',e.message);return null}
}

// Fetch one UI page (up to S.pageSize rows). Name search → single request;
// numeric start rank → ceil(pageSize/API_PAGE) chunks fetched in parallel and merged.
async function fetchRankingPage(sv){
  const isName=sv&&isNaN(+sv);
  if(isName){const d=await fetchRanking(sv);return d?parseRows(d):null}
  const start=Math.max(1,+sv||1);
  const map=new Map();let total=0;
  const fetchInto=async(starts,skipCache)=>{
    const results=await Promise.all(starts.map(s=>fetchRanking(String(s),skipCache)));
    results.forEach(d=>{if(!d)return;const pr=parseRows(d);if(pr.total>total)total=pr.total;pr.rows.forEach(r=>{if(r&&r.rank!=null)map.set(r.rank,r)})});
  };
  const chunks=Math.max(1,Math.ceil(S.pageSize/API_PAGE));
  const allStarts=[];for(let i=0;i<chunks;i++)allStarts.push(start+i*API_PAGE);
  await fetchInto(allStarts,false);
  // A flaky/timed-out/partial chunk request would otherwise shrink the page below the
  // chosen size (e.g. 46 of 50). Re-fetch — cache-bypassed, so a cached partial response
  // doesn't stick — the chunks covering any rank still missing in the requested window,
  // a couple of times, before giving up. (`end` is capped by the real total so the last
  // page doesn't retry for ranks that don't exist.)
  for(let attempt=0;attempt<2;attempt++){
    const end=total>0?Math.min(start+S.pageSize-1,total):start+S.pageSize-1;
    const need=new Set();
    for(let rank=start;rank<=end;rank++)if(!map.has(rank))need.add(start+Math.floor((rank-start)/API_PAGE)*API_PAGE);
    if(!need.size)break;
    await delay(300);
    await fetchInto([...need],true);
  }
  if(!map.size)return null;
  const rows=[...map.values()].filter(r=>r.rank>=start).sort((a,b)=>a.rank-b.rank).slice(0,S.pageSize);
  return{rows,total:total||rows.length};
}

async function loadRanking(sv='1'){
  const rid=++S.reqId;S.loading=true;
  // Don't drop the open detail panel here — renderTable() re-attaches it by player
  // name, so it survives refreshes. Context navigations clear it explicitly.
  S.lastSearch=(sv&&isNaN(+sv))?sv.toLowerCase():'';
  // Keep the current table on screen (dimmed) while refreshing, so there is no blank gap.
  const keep=S.rows.length>0;
  setSt('spin',L(keep?'Odświeżanie...':'Pobieranie...'));
  if(keep)$('mainView').classList.add('stale');else showSpin();
  if(!S.server||!curLT()){S.loading=false;setSt('err',L('Wybierz serwer lub ranking'));showSt('⚙️',L('Wybierz serwer z listy'),'');return}
  const res=await fetchRankingPage(sv);
  if(rid!==S.reqId)return;
  S.loading=false;
  if(!res){
    setSt('err',L('Błąd API'));
    if(keep)$('mainView').classList.remove('stale'); // keep showing the previous data
    else showSt('🔌',L('Błąd połączenia z API'),L('Sprawdź połączenie z internetem i spróbuj ponownie.'));
    return;
  }
  const{rows,total}=res;

  // Detect fav movements before capturing new snapshot
  if(!S.allianceMode) detectFavMovements(rows);

  S.rows=rows;S.totalRows=total;
  if(!rows.length){setSt('live',L('Brak danych'));showSt('📭',L('Brak danych dla tego rankingu'),L('Ten event może nie być aktywny na wybranym serwerze.'));return}
  const totalPgs=Math.max(1,Math.ceil(total/S.pageSize));
  $('sTotal').textContent=fmtN(total);$('sPage').textContent=`${S.curPage} / ${totalPgs}`;
  setSt('live',L('Dane LIVE · {t}',{t:new Date().toLocaleTimeString(curLocale())}));
  if(S.server)localStorage.setItem('server',S.server);

  renderTable();renderPg();
  // Capture snapshot AFTER render so prev ranks were available for indicators
  captureSnapshot(rows);
  writeHash();
}

function detectFavMovements(rows){
  const game=srvGame(S.server);
  S.favs.forEach(fav=>{
    if(fav.game!==game||fav.server!==S.server)return;
    const cur=rows.find(r=>r.name===fav.name);
    if(!cur)return;
    const prev=getPrevRank(fav.name);
    if(prev==null)return;
    let msg=null,kind='';
    if(prev>10&&cur.rank<=10){msg=L('🚀 {n} wszedł do TOP 10 (#{r})',{n:fav.name,r:cur.rank});kind='success'}
    else if(prev<=10&&cur.rank>10){msg=L('📉 {n} wypadł z TOP 10 (#{r})',{n:fav.name,r:cur.rank});kind='error'}
    else if(prev>3&&cur.rank<=3){msg=L('🏅 {n} wszedł do TOP 3 (#{r})',{n:fav.name,r:cur.rank});kind='success'}
    if(msg){toast(msg,kind);pushNotify(msg)}
  });
}

async function goPage(page){
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
