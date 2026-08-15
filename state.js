// gge-rankings — state.js (split from app.js; classic script, shared global scope).
// Load order: config → i18n → state → api → render → features → main. All wiring + init() live in main.js (loaded last).

// ── Persisted state ──
function readStoredArray(key){
  try{
    const value=JSON.parse(localStorage.getItem(key)||'[]');
    return Array.isArray(value)?value:[];
  }catch{return[]}
}
function storedChoice(key,allowed,fallback){
  const value=localStorage.getItem(key);
  return allowed.includes(value)?value:fallback;
}
function normalizeFavs(items){
  return items.filter(f=>f&&typeof f==='object'&&typeof f.name==='string'&&srvInfo(f.server))
    .map(f=>({
      name:f.name.slice(0,100),
      game:srvGame(f.server),
      server:f.server,
      ...(typeof f.note==='string'&&f.note?{note:f.note.slice(0,500)}:{})
    }));
}
function normalizeFavAls(items){
  return items.filter(f=>f&&typeof f==='object'&&typeof f.name==='string'&&srvInfo(f.server))
    .map(f=>({
      name:f.name.slice(0,100),
      server:f.server,
      allianceId:f.allianceId!==null&&f.allianceId!==''&&Number.isFinite(+f.allianceId)?+f.allianceId:null,
      game:srvGame(f.server)
    }));
}

// ── State ──
const storedServer=localStorage.getItem('server');
const storedPageSize=+localStorage.getItem('gge_pagesize');
const storedAutoRef=+localStorage.getItem('gge_autoref');
const S = {
  page:'ranking',
  server: srvInfo(storedServer)?storedServer:'EmpireEx_5',
  eventKey:'', catIdx:0, allianceMode:false,
  curPage:1, totalRows:0,
  rows:[], expandedRank:null, expandedName:null, loading:false, reqId:0, lastSearch:'',
  pool:null, poolCtx:null, filtered:null, _poolPromise:null, synthRows:null,
  events:{}, texts:{},
  favs: normalizeFavs(readStoredArray('gge_favs_v7')),
  favAls: normalizeFavAls(readStoredArray('gge_favAls_v1')),
  sort: null,
  filter: {alliance:'all', alName:'', minScore:0},
  compare: [],
  autoRef: [0,30,60,300,600].includes(storedAutoRef)?storedAutoRef:0,
  theme: storedChoice('gge_theme',['dark','light'],'dark'),
  lang: storedChoice('gge_lang',['pl','en'],'pl'),
  pageSize: [10,25,50].includes(storedPageSize)?storedPageSize:10,
  compact: localStorage.getItem('gge_compact')==='1',
  notify: localStorage.getItem('gge_notify')==='1',
};

// ── Helpers ──
const $ = id => document.getElementById(id);
// Inline SVG icon referencing the sprite at the bottom of index.html. Icons inherit
// currentColor, so they take the colour of whatever element they are dropped into.
function ico(name,cls){return `<svg class="ic${cls?' '+cls:''}" aria-hidden="true"><use href="#i-${name}"></use></svg>`}
// The shell scrolls inside .view, not the document, so "back to top" targets that region.
function scrollViewTop(){const v=$("view");if(v)v.scrollTo({top:0,behavior:"smooth"});else window.scrollTo({top:0,behavior:"smooth"})}
function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function fmtN(n){if(n===null||n===undefined)return'—';const x=+n;return isNaN(x)?String(n):x.toLocaleString(curLocale())}
function isFav(n,g,s){return S.favs.some(f=>f.name===n&&f.game===g&&f.server===s)}
function saveFavs(){localStorage.setItem('gge_favs_v7',JSON.stringify(S.favs))}
let _tt;
function toast(m,kind=''){const t=$('toast');t.textContent=m;t.className='toast show'+(kind?' '+kind:'');clearTimeout(_tt);_tt=setTimeout(()=>t.className='toast',2600)}
function setSt(cls,msg){const b=$('sBar');b.className='sbar '+cls;$('sMsg').textContent=msg}
function timeout(p,ms){return Promise.race([p,new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),ms))])}
function delay(ms){return new Promise(r=>setTimeout(r,ms))}
function pageForRank(rank,pageSize=S.pageSize){
  const safeRank=Math.max(1,Math.floor(+rank)||1);
  const safeSize=Math.max(1,Math.floor(+pageSize)||10);
  return Math.ceil(safeRank/safeSize);
}
function srvInfo(h){return ALL_SERVERS.find(s=>s.h===h)||null}
function srvGame(h){return srvInfo(h)?.game||'gge'}
function sname(h){const s=srvInfo(h);return s?`${s.flag} ${s.name}`:`Serwer ${h}`}

// ── Theme ──
function applyTheme(t){
  S.theme=t;
  if(t==='light') document.documentElement.setAttribute('data-theme','light');
  else document.documentElement.removeAttribute('data-theme');
  const b=$('themeBtn'); if(b) b.innerHTML = ico(t==='light'?'sun':'moon');
  localStorage.setItem('gge_theme',t);
}
function toggleTheme(){applyTheme(S.theme==='light'?'dark':'light')}

// ── URL hash sync ──
function readHash(){
  const h=location.hash.slice(1);if(!h)return{};
  const p=new URLSearchParams(h);
  const cat=Number.parseInt(p.get('c'),10),page=Number.parseInt(p.get('p'),10);
  return{
    server:p.get('s'),event:p.get('e'),
    cat:Number.isInteger(cat)&&cat>=0?cat:null,
    type:p.get('t'),page:Number.isInteger(page)&&page>=1?page:0,
    q:(p.get('q')||'').slice(0,100)
  };
}
let _writeHashTimer;
function writeHash(){
  clearTimeout(_writeHashTimer);
  _writeHashTimer=setTimeout(()=>{
    const p=new URLSearchParams();
    if(S.server) p.set('s',S.server);
    if(S.eventKey) p.set('e',S.eventKey);
    if(S.catIdx) p.set('c',S.catIdx);
    if(S.allianceMode) p.set('t','a');
    if(S.curPage>1) p.set('p',S.curPage);
    if(S.lastSearch) p.set('q',S.lastSearch);
    const newHash='#'+p.toString();
    if(location.hash!==newHash) history.replaceState(null,'',newHash);
  },150);
}

// ── History (snapshots for change indicators + sparklines) ──
let HIST=null;
function loadHistory(){
  try{HIST=JSON.parse(localStorage.getItem('gge_hist_v1')||'{}')}catch{HIST={}}
  pruneHistory();
}
function saveHistory(){
  try{localStorage.setItem('gge_hist_v1',JSON.stringify(HIST))}catch(e){
    // Quota exceeded — drop oldest keys
    const keys=Object.keys(HIST);
    if(keys.length>0){
      for(let i=0;i<Math.ceil(keys.length/4);i++)delete HIST[keys[i]];
      try{localStorage.setItem('gge_hist_v1',JSON.stringify(HIST))}catch{HIST={};localStorage.removeItem('gge_hist_v1')}
    }
  }
}
function pruneHistory(){
  const cutoff=Date.now()-HIST_MAX_AGE_MS;
  Object.keys(HIST).forEach(k=>{
    Object.keys(HIST[k]).forEach(name=>{
      HIST[k][name]=HIST[k][name].filter(([t])=>t>cutoff);
      if(HIST[k][name].length===0)delete HIST[k][name];
    });
    if(Object.keys(HIST[k]).length===0)delete HIST[k];
  });
}
function histKey(server=S.server,event=S.eventKey,catIdx=S.catIdx,alliance=S.allianceMode){
  return `${server}_${event}_${alliance?'a':'p'}_${catIdx}`;
}
function getPrevRank(name,key=histKey()){
  const arr=HIST?.[key]?.[name];
  if(!arr||!arr.length)return null;
  return arr[arr.length-1][1];
}
function captureSnapshot(rows){
  if(!rows.length||!S.eventKey)return;
  const k=histKey();
  HIST[k]=HIST[k]||{};
  const now=Date.now();
  rows.forEach(r=>{
    const arr=HIST[k][r.name]=HIST[k][r.name]||[];
    const last=arr[arr.length-1];
    if(last&&(now-last[0])<HIST_DEDUPE_MS){
      arr[arr.length-1]=[now,r.rank,r.score];
    }else{
      arr.push([now,r.rank,r.score]);
      if(arr.length>HIST_MAX_PER_PLAYER)arr.shift();
    }
  });
  saveHistory();
}
function getRankSeriesForKey(playerName,key,maxLen=12){
  const arr=HIST?.[key]?.[playerName];
  if(!arr)return[];
  return arr.slice(-maxLen).map(([t,rk,sc])=>({t,rk,sc}));
}
function getBestRankSeries(playerName,server,maxLen=12){
  const keys=Object.keys(HIST||{}).filter(k=>k.startsWith(server+'_'));
  let bestKey=null,bestLen=0;
  keys.forEach(k=>{const arr=HIST[k][playerName];if(arr&&arr.length>bestLen){bestKey=k;bestLen=arr.length}});
  if(!bestKey)return[];
  return HIST[bestKey][playerName].slice(-maxLen).map(([t,rk,sc])=>({t,rk,sc,k:bestKey}));
}
