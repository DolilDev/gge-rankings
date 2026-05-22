// ── Direct API calls (no backend needed for GitHub Pages) ──
const GGE_API = 'https://empire-api.fly.dev';
const EVENTS_URL = game => `https://raw.githubusercontent.com/danadum/ggs-assets/main/${game}/events.json`;
const TEXTS_URL = lang => `https://translations-api-test.public.ggs-ep.com/12/${lang}`;
const XML_BASE = 'https://media.goodgamestudios.com/games-config/network';
const PAGE_SIZE = 10;

// ── Stat → ranking key mapping (for clickable stats) ──
const STAT_RANKING = {
  honor: {key:'honorPoints', mode:'player'},
  might: {key:'playerMight', mode:'player'},
  level: {key:'legendLevel', mode:'player'},
};

// ── Server fallback ──
const FALLBACK = {
  gge: {
    'EmpireEx': {nk:'generic_server_de1'}, 'EmpireEx_2': {nk:'generic_server_de2'},
    'EmpireEx_3': {nk:'generic_server_de3'}, 'EmpireEx_4': {nk:'generic_server_en1'},
    'EmpireEx_5': {nk:'generic_server_en2'}, 'EmpireEx_6': {nk:'generic_server_en3'},
    'EmpireEx_7': {nk:'generic_server_pl1'}, 'EmpireEx_8': {nk:'generic_server_pl2'},
    'EmpireEx_9': {nk:'generic_server_fr1'}, 'EmpireEx_10':{nk:'generic_server_fr2'},
    'EmpireEx_11':{nk:'generic_server_ru1'}, 'EmpireEx_12':{nk:'generic_server_ru2'},
    'EmpireEx_13':{nk:'generic_server_tr1'}, 'EmpireEx_14':{nk:'generic_server_pt1'},
    'EmpireEx_15':{nk:'generic_server_it1'}, 'EmpireEx_16':{nk:'generic_server_es1'},
    'EmpireEx_17':{nk:'generic_server_nl1'}, 'EmpireEx_18':{nk:'generic_server_cz1'},
    'EmpireEx_19':{nk:'generic_server_hu1'}, 'EmpireEx_20':{nk:'generic_server_ro1'},
    'EmpireEx_21':{nk:'generic_server_us1'},
  },
  e4k: {
    'EmpirefourkingdomsExGG_2':{nk:''}, 'EmpirefourkingdomsExGG_3':{nk:''},
    'EmpirefourkingdomsExGG_4':{nk:''},
  }
};

const LANG_INFO = {
  de:{f:'🇩🇪',a:'DE',n:'Deutsch'}, en:{f:'🇬🇧',a:'EN',n:'English'},
  pl:{f:'🇵🇱',a:'PL',n:'Polski'}, fr:{f:'🇫🇷',a:'FR',n:'Français'},
  ru:{f:'🇷🇺',a:'RU',n:'Русский'}, tr:{f:'🇹🇷',a:'TR',n:'Türkçe'},
  pt:{f:'🇵🇹',a:'PT',n:'Português'},it:{f:'🇮🇹',a:'IT',n:'Italiano'},
  es:{f:'🇪🇸',a:'ES',n:'Español'}, nl:{f:'🇳🇱',a:'NL',n:'Nederlands'},
  cz:{f:'🇨🇿',a:'CZ',n:'Čeština'}, hu:{f:'🇭🇺',a:'HU',n:'Magyar'},
  ro:{f:'🇷🇴',a:'RO',n:'Română'}, us:{f:'🇺🇸',a:'US',n:'English (US)'},
};

const EV_LABELS = {
  honorPoints:'Honor', playerMight:'Siła (Might)', legendLevel:'Poziom legendy',
  allianceHonor:'Honor sojuszu', allianceMight:'Siła sojuszu',
  dominionPoints:'Dominium', cargo_points:'Karawan',
  event_title_71:'Turniej 71', event_title_72:'Turniej 72',
  event_title_80:'Wydarzenie 80', event_title_85:'Wydarzenie 85',
  event_title_89:'Wydarzenie 89', event_title_113:'Wydarzenie 113',
  event_title_127:'Wydarzenie 127', event_title_128:'Wydarzenie 128',
  event_title_130:'Wydarzenie 130', event_title_131:'Wydarzenie 131',
  event_title_134:'Wydarzenie 134', event_title_601:'Liga',
  event_title_3:'Frakcje', event_title_60:'Wyd. 60 (poziom)',
  event_title_97:'Wydarzenie 97',
  dialog_redAlienInvasion_message_header:'Inwazja Obcych',
  dialog_BeggingKnights_nobilityPoints:'Żebracy',
  dialog_longPointsEvent_seasonalPoints:'Sezonowy',
  eventBuilding_DonationEvent:'Donacje',
};

// ── State ──
const S = {
  page:'ranking', game:localStorage.getItem('game')||'gge',
  server:localStorage.getItem('server')||'',
  eventKey:'', catIdx:0, allianceMode:false,
  curPage:1, totalRows:0,
  rows:[], expandedRank:null, loading:false, reqId:0,
  servers:{}, events:{}, texts:{},
  favs: JSON.parse(localStorage.getItem('gge_favs_v7')||'[]'),
};

// ── Utils ──
const $=id=>document.getElementById(id);
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function fmtN(n){if(n===null||n===undefined)return'—';const x=+n;return isNaN(x)?String(n):x.toLocaleString('pl-PL')}
function isFav(n,g,s){return S.favs.some(f=>f.name===n&&f.game===g&&f.server===s)}
function saveFavs(){localStorage.setItem('gge_favs_v7',JSON.stringify(S.favs))}
let _tt;
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(_tt);_tt=setTimeout(()=>t.classList.remove('show'),2600)}
function setSt(cls,msg){const b=$('sBar');b.className='sbar '+cls;$('sMsg').textContent=msg}
function timeout(p,ms){return Promise.race([p,new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),ms))])}

// ── API ──
const CACHE = new Map();
function cGet(k){const e=CACHE.get(k);return(e&&Date.now()<e.x)?e.v:null}
function cSet(k,v,ttl){CACHE.set(k,{v,x:Date.now()+ttl})}

async function ggeGet(url){
  const hit=cGet(url);if(hit)return hit;
  const r=await fetch(url);
  if(!r.ok)return null;
  const d=await r.json();
  cSet(url,d,60000);return d;
}

function ggeUrl(server,lt,sv,lid){
  let p=`"LT":${lt},"SV":"${sv}"`;
  if(lid)p=`"LT":${lt},"LID":${lid},"SV":"${sv}"`;
  return`${GGE_API}/${server}/hgh/${p.replace(/"/g,'%22')}`;
}

function ggeGlobalUrl(server,lt,rank,lid){
  let p=`"LT":${lt},"R":${rank}`;if(lid)p=`"LT":${lt},"LID":${lid},"R":${rank}`;
  return`${GGE_API}/${server}/llsp/${p.replace(/"/g,'%22')}`;
}

// ── Server names ──
function parseNK(nk){const m=(nk||'').match(/generic_server_([a-z]+)(\d+)/i);return m?{l:m[1].toLowerCase(),n:+m[2]}:null}
function getNK(h){return S.servers[h]?.nk||FALLBACK[S.game]?.[h]?.nk||''}
function sname(h){
  const nk=getNK(h); const p=parseNK(nk);
  if(!p){
    if(h.startsWith('Empirefourkingdoms'))return`📱 E4K ${h.match(/_(\d+)$/)?.[1]||''}`;
    return`Serwer ${h.match(/_(\d+)$/)?.[1]||'?'}`;
  }
  const li=LANG_INFO[p.l]||{f:'',a:p.l.toUpperCase(),n:p.l.toUpperCase()};
  const tr=S.texts[nk]||li.n;
  const cnt=Object.values(FALLBACK[S.game]||{}).filter(v=>parseNK(v.nk)?.l===p.l).length;
  return`${li.f} ${li.a} ${tr}${cnt>1?' ('+p.n+')':''}`;
}

function sortSrv(keys){
  return[...keys].sort((a,b)=>{
    const pa=parseNK(getNK(a)),pb=parseNK(getNK(b));
    if(!pa&&!pb)return a.localeCompare(b);if(!pa)return 1;if(!pb)return -1;
    const la=LANG_INFO[pa.l]?.n||pa.l, lb=LANG_INFO[pb.l]?.n||pb.l;
    const c=la.localeCompare(lb);return c!==0?c:pa.n-pb.n;
  });
}

function trackerURL(name,server){
  const clean=sname(server).replace(/^..\s/,'').replace(/\s*\(\d+\)$/,'');
  return`https://gge-tracker.com/players?search=${encodeURIComponent(name)}&server=${encodeURIComponent(clean)}`;
}

// ── Events ──
function evname(k){return S.texts[k]||EV_LABELS[k]||k.replace(/_/g,' ')}
function catname(c){
  if(!c)return'';const v=c.value;
  if(v!=null&&v!==''){
    if(c.name==='level_placeholder')return`Lv ${v}`;
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
    let name,oid,al,alTag,alId,members,honor,might,castles,level,banned,prot;
    if(isArr){const strs=obj.filter(x=>typeof x==='string'&&x.length>0);const nums=obj.filter(x=>typeof x==='number'&&x>=0);name=strs[0]||'—';members=nums.find(n=>n<5000)??null;}
    else{
      name=obj.N||'—'; oid=obj.OID||null; al=obj.AN||null; alTag=obj.AT||null; alId=obj.AID||null;
      members=obj.MC??obj.NM??null; honor=obj.H??null; might=obj.MP??null;
      castles=obj.CF??null; level=obj.L??null;
      banned=obj.BAN===true||obj.banned===true||false;
      prot=(obj.PF!=null&&obj.PF>0)||obj.PC===true||false;
    }
    return{rank,score,name,oid,al,alTag,alId,members,honor,might,castles,level,banned,prot,raw:obj};
  }).filter(Boolean);
  return{rows,total};
}

// ── Load data ──
async function loadTexts(){
  try{const r=await timeout(fetch(TEXTS_URL('pl')),4000);if(r.ok){const d=await r.json();if(d)S.texts=d;}}catch{}
}

async function loadEvents(){
  try{
    const r=await timeout(fetch(EVENTS_URL(S.game)),6000);
    if(r.ok){const d=await r.json();if(d)S.events=d;}
  }catch{}
  if(!S.events.player){
    S.events={
      player:{honorPoints:{id:5,categories:[{id:1,name:'level_placeholder',value:'1-19'},{id:2,name:'level_placeholder',value:'20-29'},{id:3,name:'level_placeholder',value:'30-39'},{id:4,name:'level_placeholder',value:'40-59'},{id:5,name:'level_placeholder',value:'50-69'},{id:6,name:'level_placeholder',value:'70'}]},
      playerMight:{id:6,categories:[{id:1,name:'level_placeholder',value:'1-19'},{id:2,name:'level_placeholder',value:'20-29'},{id:3,name:'level_placeholder',value:'30-39'},{id:4,name:'level_placeholder',value:'40-59'},{id:5,name:'level_placeholder',value:'50-69'},{id:6,name:'level_placeholder',value:'70'}]}},
      alliance:{allianceHonor:{id:10,categories:[{id:1,name:'dialog_ci_filter01_all'}]},allianceMight:{id:11,categories:[{id:1,name:'dialog_ci_filter01_all'}]}},
      player_to_alliance:[['honorPoints','allianceHonor'],['playerMight','allianceMight']]
    };
  }
  validateEv(); buildEventSel();
}

async function loadServers(){
  const gameId=S.game==='e4k'?'16':'12';
  const xmlList=S.game==='e4k'?['72','77']:['1','5','11','26','34','39','64','65','68'];
  const found={};
  try{
    const fetches=xmlList.map(n=>timeout(fetch(`${XML_BASE}/${gameId}/live/${n}.xml`).then(r=>r.ok?r.text():null).catch(()=>null),4000).catch(()=>null));
    const results=await Promise.all(fetches);
    const parser=new DOMParser();
    for(const xml of results){
      if(!xml)continue;
      try{const doc=parser.parseFromString(xml,'text/xml');for(const inst of doc.getElementsByTagName('instance')){const ch=inst.children;if(ch.length<7)continue;const h=ch[2]?.textContent?.trim(),id=ch[4]?.textContent?.trim(),nk=ch[6]?.textContent?.trim();if(h&&h.startsWith('Empire')&&!found[h])found[h]={header:h,id:id||'',nk:nk||''};}}catch{}
    }
  }catch{}
  const fb=FALLBACK[S.game]||{};
  const merged={};
  new Set([...Object.keys(fb),...Object.keys(found)]).forEach(h=>{
    const f=fb[h]||{},x=found[h]||{};
    merged[h]={header:h,id:x.id||f.id||'',nk:x.nk||f.nk||''};
  });
  S.servers=merged;
  buildServerSel();
}

function validateEv(){const l=evList();if(!(S.eventKey in l))S.eventKey=Object.keys(l)[0]||''}

// ── Ranking fetch ──
async function fetchRanking(sv){
  const lt=curLT();if(!lt||!S.server)return null;
  const lid=curCat().id||'';
  try{
    const url=isGlobal()?ggeGlobalUrl(S.server,lt,sv,lid):ggeUrl(S.server,lt,sv,lid);
    const data=await timeout(ggeGet(url),10000);
    return data;
  }catch(e){console.warn('fetchRanking:',e.message);return null;}
}

async function loadRanking(sv='1'){
  const rid=++S.reqId;S.loading=true;S.expandedRank=null;
  setSt('spin','Pobieranie...');showSpin();
  if(!S.server||!curLT()){S.loading=false;setSt('err','Wybierz serwer lub ranking');showSt('⚙️','Wybierz serwer z listy','');return;}
  const data=await fetchRanking(sv);
  if(rid!==S.reqId)return;
  S.loading=false;
  if(!data){setSt('err','Błąd API');showSt('🔌','Błąd połączenia z API','Sprawdź połączenie z internetem i spróbuj ponownie.');return;}
  const{rows,total}=parseRows(data);
  S.rows=rows;S.totalRows=total;
  if(!rows.length){setSt('live','Brak danych');showSt('📭','Brak danych dla tego rankingu','Ten event może nie być aktywny na wybranym serwerze.');return;}
  const totalPgs=Math.max(1,Math.ceil(total/PAGE_SIZE));
  $('sTotal').textContent=fmtN(total);$('sPage').textContent=`${S.curPage} / ${totalPgs}`;
  setSt('live',`Dane LIVE · ${new Date().toLocaleTimeString('pl-PL')}`);
  localStorage.setItem('game',S.game);if(S.server)localStorage.setItem('server',S.server);
  renderTable(); renderPg();
}

async function goPage(page){
  S.curPage=page;
  const sv=String((page-1)*PAGE_SIZE+1);
  await loadRanking(sv);
  window.scrollTo({top:0,behavior:'smooth'});
}
window.goPage=goPage;

// ── Render ──
function showSpin(){$('mainView').innerHTML=`<div class="st"><div class="spin"></div><div class="sm">Pobieranie danych...</div></div>`;$('pgBar').style.display='none'}
function showSt(icon,msg,sub){$('mainView').innerHTML=`<div class="st"><div class="si">${icon}</div><div class="sm">${esc(msg)}</div>${sub?`<div class="ss">${esc(sub)}</div>`:''}</div>`;$('pgBar').style.display='none'}

function renderTable(){
  const isAl=S.allianceMode;const max=S.rows[0]?.score||1;
  let h=`<div class="twrap"><table><thead><tr>
    <th style="width:40px;text-align:center">#</th><th style="width:26px"></th>
    <th>${isAl?'Sojusz':'Gracz'}</th>
    <th class="r">${isAl?'Członkowie':'Sojusz'}</th>
    <th class="r" style="min-width:150px">Wynik</th>
    <th style="width:75px"></th>
    </tr></thead><tbody>`;

  S.rows.forEach(r=>{
    const fv=isFav(r.name,S.game,S.server);
    const pct=Math.min(100,Math.round(((r.score||0)/max)*100));
    const badge=r.rank===1?'🥇':r.rank===2?'🥈':r.rank===3?'🥉':r.rank;
    const rkCls=r.rank<=3?'rk'+r.rank:'';
    const url=trackerURL(r.name,S.server);
    const exp=S.expandedRank===r.rank;
    const bans=r.banned?'<span class="badge b-ban">🚫 Ban</span>':'';
    const pr=r.prot?'<span class="badge b-prot">🛡 Ochrona</span>':'';
    const fvb=fv?'<span class="badge b-fav">★</span>':'';
    const alCell=isAl
      ?`<td class="r" style="color:var(--c-muted);font-size:12px">${r.members!=null?fmtN(r.members):'—'}</td>`
      :`<td class="r" style="font-size:11px;color:var(--c-muted)">${r.al?`<span class="badge b-al">${esc(r.alTag||r.al.slice(0,5))}</span>`:'—'}</td>`;

    h+=`<tr class="dr ${rkCls}${fv?' fav':''}${exp?' exp':''}" data-rk="${r.rank}">
      <td class="rk ${rkCls}">${badge}</td>
      <td><button class="sb${fv?' on':''}" data-n="${esc(r.name)}">${fv?'⭐':'☆'}</button></td>
      <td><span class="pn">${esc(r.name)}</span>${fvb}${bans}${pr}</td>
      ${alCell}
      <td class="r"><div class="sc"><div class="sbar2"><div class="sbf" style="width:${pct}%"></div></div><span class="sv">${fmtN(r.score)}</span></div></td>
      <td><a class="tl" href="${url}" target="_blank" rel="noopener">↗ Tracker</a></td>
      </tr>
      <tr class="xr" data-for="${r.rank}" style="display:${exp?'':'none'}">
      <td colspan="6"><div class="dp" id="dp_${r.rank}"></div></td>
      </tr>`;
  });

  h+='</tbody></table></div>';
  $('mainView').innerHTML=h;

  $('mainView').querySelectorAll('.dr').forEach(tr=>{
    const rk=+tr.dataset.rk;
    tr.querySelector('.sb').addEventListener('click',e=>{e.stopPropagation();const n=e.currentTarget.dataset.n;toggleFav(n,S.game,S.server,tr)});
    tr.addEventListener('click',()=>toggleDetail(rk));
  });
}

function toggleDetail(rank){
  const r=S.rows.find(x=>x.rank===rank);if(!r)return;
  const xtr=document.querySelector(`.xr[data-for="${rank}"]`);
  const dtr=document.querySelector(`.dr[data-rk="${rank}"]`);
  if(!xtr)return;
  if(S.expandedRank===rank){
    xtr.style.display='none';dtr?.classList.remove('exp');S.expandedRank=null;return;
  }
  if(S.expandedRank!=null){
    const px=document.querySelector(`.xr[data-for="${S.expandedRank}"]`);if(px)px.style.display='none';
    document.querySelector(`.dr[data-rk="${S.expandedRank}"]`)?.classList.remove('exp');
  }
  S.expandedRank=rank;xtr.style.display='';dtr?.classList.add('exp');
  const panel=$(`dp_${rank}`);if(!panel)return;
  const url=trackerURL(r.name,S.server);
  const fv=isFav(r.name,S.game,S.server);

  const stats=[];
  if(r.honor!=null) stats.push({v:fmtN(r.honor),l:'Honor',link:'honorPoints',mode:'player'});
  if(r.might!=null) stats.push({v:fmtN(r.might),l:'Siła (Might)',link:'playerMight',mode:'player'});
  if(r.castles!=null)stats.push({v:fmtN(r.castles),l:'Zamki',link:null});
  if(r.level!=null) stats.push({v:r.level,l:'Poziom',link:'legendLevel',mode:'player'});
  if(r.score!=null) stats.push({v:fmtN(r.score),l:'Wynik rankingu',link:null});
  if(r.al) stats.push({v:esc(r.al),l:'Sojusz',link:'allianceHonor',mode:'alliance',search:r.al});
  if(r.members!=null)stats.push({v:fmtN(r.members),l:'Członkowie',link:null});

  const statHtml=stats.map(st=>{
    if(st.link){
      return`<div class="db" title="Otwórz ranking: ${evname(st.link)}" data-link="${st.link}" data-mode="${st.mode||'player'}" data-search="${esc(st.search||'')}">
        <div class="db-v">${st.v}</div>
        <div class="db-l">${st.l}</div>
        <div class="db-hint">→ ${evname(st.link)}</div>
        </div>`;
    }
    return`<div class="db db-plain"><div class="db-v">${st.v}</div><div class="db-l">${st.l}</div></div>`;
  }).join('');

  panel.innerHTML=`
    <div class="ds">${statHtml||'<span style="color:var(--c-muted);font-size:12px">Brak szczegółowych danych</span>'}</div>
    <div class="da">
      <a class="btn" href="${url}" target="_blank" rel="noopener">↗ GGE Tracker</a>
      <button class="btn${fv?' primary':''}" id="dfav_${rank}">${fv?'⭐ Obserwowany':'☆ Obserwuj'}</button>
    </div>`;

  panel.querySelectorAll('.db[data-link]').forEach(el=>{
    el.addEventListener('click',async()=>{
      const linkKey=el.dataset.link, linkMode=el.dataset.mode, searchVal=el.dataset.search;
      const isAl=linkMode==='alliance';
      if(isAl!==S.allianceMode){
        S.allianceMode=isAl;
        const pair=S.events.player_to_alliance?.find(e=>e[+!isAl]===S.eventKey);
        if(pair)S.eventKey=pair[+isAl];
        updateTypeSeg();buildEventSel();
      }
      if(evList()[linkKey]){S.eventKey=linkKey;buildEventSel();}
      S.catIdx=0;S.curPage=1;S.expandedRank=null;
      if(searchVal){$('searchInput').value=searchVal;await loadRanking(searchVal);}
      else{$('searchInput').value='';await loadRanking('1');}
    });
  });

  $(`dfav_${rank}`)?.addEventListener('click',e=>{
    e.stopPropagation();toggleFav(r.name,S.game,S.server,null);
    const btn=$(`dfav_${rank}`);if(btn){const now=isFav(r.name,S.game,S.server);btn.textContent=now?'⭐ Obserwowany':'☆ Obserwuj';btn.classList.toggle('primary',now);}
  });
}

function renderPg(){
  const pg=$('pgBar');const total=Math.max(1,Math.ceil(S.totalRows/PAGE_SIZE));
  if(total<=1){pg.style.display='none';return;}
  pg.style.display='flex';
  const cur=S.curPage;
  let h=`<button class="pgb" onclick="goPage(1)" ${cur===1?'disabled':''}>«</button>`;
  h+=`<button class="pgb" onclick="goPage(${cur-1})" ${cur===1?'disabled':''}>‹</button>`;
  const s=Math.max(1,cur-2),e=Math.min(total,cur+2);
  if(s>1)h+=`<span class="pgi">…</span>`;
  for(let i=s;i<=e;i++)h+=`<button class="pgb${i===cur?' cur':''}" onclick="goPage(${i})">${i}</button>`;
  if(e<total)h+=`<span class="pgi">…</span>`;
  h+=`<button class="pgb" onclick="goPage(${cur+1})" ${cur===total?'disabled':''}>›</button>`;
  h+=`<button class="pgb" onclick="goPage(${total})" ${cur===total?'disabled':''}>»</button>`;
  h+=`<span class="pgi">Str. ${cur} z ${total} · ${fmtN(S.totalRows)} graczy</span>`;
  pg.innerHTML=h;
}

// ── Selects ──
function buildServerSel(){
  const sel=$('serverSelect');
  const keys=Object.keys(S.servers);if(!keys.length){sel.innerHTML='<option>Brak</option>';return;}
  const seen=new Set();
  const uniq=keys.filter(h=>{const n=sname(h);if(seen.has(n))return false;seen.add(n);return true;});
  const sorted=sortSrv(uniq);
  sel.innerHTML=sorted.map(h=>`<option value="${h}">${sname(h)}</option>`).join('');
  if(!S.server||!sorted.includes(S.server)){
    const pl=sorted.find(k=>parseNK(getNK(k))?.l==='pl'&&parseNK(getNK(k))?.n===1);
    S.server=pl||sorted[0];
  }
  sel.value=S.server;
  buildMSrv();
}

function buildEventSel(){
  const sel=$('eventSelect');const list=evList();const keys=Object.keys(list);
  if(!keys.length){sel.innerHTML='<option>Brak</option>';return;}
  sel.innerHTML=keys.map(k=>`<option value="${k}">${evname(k)}</option>`).join('');
  if(!(S.eventKey in list))S.eventKey=keys[0];
  sel.value=S.eventKey;buildCats();
}

function buildCats(){
  const cb=$('catBar');const cats=curEv().categories;
  if(!cats?.length||cats.length<=1){cb.style.display='none';return;}
  cb.style.display='flex';
  cb.innerHTML=cats.map((c,i)=>{const n=catname(c);return n?`<button class="cat${i===S.catIdx?' on':''}" data-i="${i}">${n}</button>`:''}).join('');
  cb.querySelectorAll('.cat').forEach(el=>el.addEventListener('click',async()=>{S.catIdx=+el.dataset.i;S.curPage=1;buildCats();await loadRanking();}));
}

function buildMSrv(){
  const sel=$('mServer');const keys=Object.keys(S.servers);
  const seen=new Set();const uniq=keys.filter(h=>{const n=sname(h);if(seen.has(n))return false;seen.add(n);return true;});
  sel.innerHTML=sortSrv(uniq).map(h=>`<option value="${h}">${sname(h)}</option>`).join('');
  if(S.server)sel.value=S.server;
}

function updateTypeSeg(){$('typeSeg').querySelectorAll('.seg-b').forEach(b=>b.classList.toggle('on',b.dataset.v===(S.allianceMode?'alliance':'player')))}

// ── Favorites ──
function updFavCnt(){const n=S.favs.length;$('favCnt').textContent=n;$('favBtn').classList.toggle('primary',n>0)}

function toggleFav(name,game,server,tr){
  if(isFav(name,game,server)){S.favs=S.favs.filter(f=>!(f.name===name&&f.game===game&&f.server===server));toast('Usunięto z obserwowanych');}
  else{S.favs.push({name,game,server});toast(`Obserwujesz ${name} ⭐`);}
  saveFavs();updFavCnt();
  document.querySelectorAll(`.sb[data-n="${esc(name)}"]`).forEach(b=>{b.classList.toggle('on',isFav(name,game,server));b.textContent=isFav(name,game,server)?'⭐':'☆';});
  if(tr)tr.classList.toggle('fav',isFav(name,game,server));
}

function renderFavPage(){
  const grid=$('favGrid');
  if(!S.favs.length){grid.innerHTML='<div class="fe">Brak obserwowanych graczy.<br>Kliknij ☆ przy dowolnym graczu.</div>';return;}
  grid.innerHTML='';
  S.favs.forEach(fav=>{
    const card=document.createElement('div');card.className='fc';
    const url=trackerURL(fav.name,fav.server);
    card.innerHTML=`<div class="fch"><div><div class="fcn">⭐ ${esc(fav.name)}</div><div class="fcm">${fav.game.toUpperCase()} · ${esc(sname(fav.server))}</div></div><button class="fcd" data-n="${esc(fav.name)}" data-g="${fav.game}" data-s="${fav.server}">×</button></div><div class="frr" id="fr_${esc(fav.name).replace(/\W/g,'_')}"><div class="fr"><span class="fl">⏳ Pobieranie...</span></div></div><br><a class="btn" href="${url}" target="_blank" rel="noopener" style="font-size:11px">↗ Profil GGE Tracker</a>`;
    card.querySelector('.fcd').addEventListener('click',function(){S.favs=S.favs.filter(f=>!(f.name===this.dataset.n&&f.game===this.dataset.g&&f.server===this.dataset.s));saveFavs();updFavCnt();renderFavPage();toast('Usunięto');});
    grid.appendChild(card);
    loadFavRanks(fav,card);
  });
}

async function loadFavRanks(fav,card){
  const cid='fr_'+fav.name.replace(/\W/g,'_');const el=card.querySelector('#'+CSS.escape(cid));if(!el)return;
  const evs=S.events?.player||{};const res=[];
  for(const[key,ev]of Object.entries(evs)){
    if(!ev.id)continue;
    try{
      const url=ggeUrl(fav.server,ev.id,fav.name,'');
      const d=await ggeGet(url);
      if(d?.return_code==0&&d.content?.L?.length){const f=d.content.L.find(p=>Array.isArray(p)&&(p[2]?.N||'').toLowerCase()===fav.name.toLowerCase());if(f)res.push({key,rank:f[0],score:f[1]});}
    }catch{}
  }
  if(!el.isConnected)return;
  el.innerHTML=res.length?res.map(r=>`<div class="fr"><span class="fl">${esc(evname(r.key))}</span><span class="fp2${r.rank<=3?' g':''}">#${r.rank}</span><span class="fs">${fmtN(r.score)}</span></div>`).join('')
    :'<div class="fr"><span class="fl" style="color:var(--c-muted)">Nie znaleziono</span></div>';
}

// ── Wiring ──
document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('on'));b.classList.add('on');
  S.page=b.dataset.p;
  $('mainView').style.display=S.page==='ranking'?'block':'none';
  $('pgBar').style.display=S.page==='ranking'&&S.rows.length?'flex':'none';
  $('favView').style.display=S.page==='favorites'?'block':'none';
  if(S.page==='favorites')renderFavPage();
}));

$('favBtn').addEventListener('click',()=>{document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('on'));document.querySelector('[data-p="favorites"]').classList.add('on');S.page='favorites';$('mainView').style.display='none';$('pgBar').style.display='none';$('favView').style.display='block';renderFavPage();});

$('gameSelect').value=S.game;
$('gameSelect').addEventListener('change',async e=>{S.game=e.target.value;S.server='';S.eventKey='';S.allianceMode=false;S.curPage=1;updateTypeSeg();showSpin();await Promise.all([loadTexts(),loadServers(),loadEvents()]);await loadRanking();});
$('serverSelect').addEventListener('change',async e=>{if(e.target.value&&e.target.value!==S.server){S.server=e.target.value;S.curPage=1;await loadRanking();}});
$('eventSelect').addEventListener('change',async e=>{S.eventKey=e.target.value;S.catIdx=0;S.curPage=1;buildCats();await loadRanking();});

$('typeSeg').querySelectorAll('.seg-b').forEach(b=>b.addEventListener('click',async()=>{
  if((b.dataset.v==='alliance')===S.allianceMode)return;
  S.allianceMode=b.dataset.v==='alliance';S.catIdx=0;S.curPage=1;
  const pair=S.events.player_to_alliance?.find(e=>e[+!S.allianceMode]===S.eventKey);
  if(pair)S.eventKey=pair[+S.allianceMode];
  updateTypeSeg();buildEventSel();await loadRanking();
}));

const doSearch=async()=>{const v=$('searchInput').value.trim();if(!v)return;S.curPage=1;await loadRanking(v);};
$('goSearch').addEventListener('click',doSearch);
$('searchInput').addEventListener('keydown',e=>{if(e.key==='Enter')doSearch();});
$('refreshBtn').addEventListener('click',()=>{S.curPage=1;loadRanking();});

$('addBtn').addEventListener('click',()=>{$('mName').value='';$('mErr').style.display='none';buildMSrv();$('mBackdrop').classList.remove('h');$('mName').focus();});
$('mCancel').addEventListener('click',()=>$('mBackdrop').classList.add('h'));
$('mBackdrop').addEventListener('click',e=>{if(e.target===$('mBackdrop'))$('mBackdrop').classList.add('h');});
$('mGame').addEventListener('change',()=>buildMSrv());
$('mOk').addEventListener('click',()=>{
  const name=$('mName').value.trim(),game=$('mGame').value,server=$('mServer').value;
  const err=$('mErr');err.style.display='none';
  if(!name){err.textContent='Wpisz nick!';err.style.display='block';return;}
  if(isFav(name,game,server)){err.textContent='Już obserwujesz!';err.style.display='block';return;}
  S.favs.push({name,game,server});saveFavs();updFavCnt();
  $('mBackdrop').classList.add('h');toast(`Obserwujesz ${name} ⭐`);
  if(S.page==='favorites')renderFavPage();
});
$('mName').addEventListener('keydown',e=>{if(e.key==='Enter')$('mOk').click();});
$('clearFavBtn').addEventListener('click',()=>{if(confirm('Usunąć wszystkich obserwowanych?')){S.favs=[];saveFavs();updFavCnt();renderFavPage();}});

// ── Init ──
let initDone=false;
setTimeout(()=>{if(!initDone){setSt('err','Przekroczono czas');showSt('⏱','Ładowanie trwało zbyt długo','Odśwież stronę (F5).');}},20000);

async function init(){
  updFavCnt();updateTypeSeg();showSpin();setSt('spin','Ładowanie...');
  try{setSt('spin','Tłumaczenia...');await timeout(loadTexts(),4500).catch(()=>{});}catch{}
  try{setSt('spin','Serwery...');await timeout(loadServers(),7000).catch(()=>{});}catch{}
  try{setSt('spin','Eventy...');await timeout(loadEvents(),6000).catch(()=>{});}catch{}
  initDone=true;
  setSt('spin','Pobieranie rankingu...');
  S.curPage=1;
  await loadRanking();
}

init();
