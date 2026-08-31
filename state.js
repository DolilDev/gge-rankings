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
// Timestamp of a history point. Locally collected history is pruned at HIST_MAX_AGE_MS (14 days),
// but a chart backfilled from gge-tracker reaches a year back — so the year is printed whenever it
// isn't the current one, otherwise both ends of a year-long series would read the same.
function fmtHistTime(t){
  const d=new Date(t);
  if(isNaN(d.getTime()))return'';
  const opts={day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'};
  if(d.getFullYear()!==new Date().getFullYear())opts.year='numeric';
  return d.toLocaleString(curLocale(),opts);
}
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
// ── Ranking reset log ──
// Keyed by histKey(), so every server/ranking/category/mode combination is watched separately.
// Per board: {t,s,n} = the last look (time, leader's score, row count) and r = the run starts
// seen so far as [midpoint, windowWidth] pairs. See RESET_DROP in config.js for why this is
// observed rather than read from an API.
let BOARDS=null;
function loadBoards(){try{BOARDS=JSON.parse(localStorage.getItem('gge_boards_v1')||'{}')}catch{BOARDS={}}}
function saveBoards(){
  // Tiny next to the history, but it shares the same quota, so a failure must never break a load.
  try{localStorage.setItem('gge_boards_v1',JSON.stringify(BOARDS))}catch(e){}
}
// Record how a board looks now and log a run start when the leader's score has collapsed since
// the last look, or an empty board has filled up. `top` is the score at rank 1; pass null when
// that row isn't loaded. Returns true when a run start was recorded.
function observeBoard(top,total,key=histKey()){
  if(!BOARDS||!key)return false;
  const n=Number.isFinite(total)?total:0;
  const s=(typeof top==='number'&&Number.isFinite(top))?top:null;
  // Without the leader there is no baseline to compare, so a page-5 or name-search view is not an
  // observation at all. An empty board is one, though — that is how a run ends.
  if(s===null&&n>0)return false;
  const now=Date.now(),prev=BOARDS[key];
  const r=prev?prev.r.slice():[];
  let started=false;
  if(prev){
    const filled=prev.n===0&&n>0;
    const collapsed=prev.s>0&&s!==null&&s<prev.s*RESET_DROP;
    // The reset fell somewhere between the two looks: the midpoint is the best estimate and the
    // width of that window is how precise it can honestly claim to be.
    const last=r[r.length-1];
    if((filled||collapsed)&&(!last||now-last[0]>=RESET_MIN_GAP_MS)){
      r.push([Math.round((prev.t+now)/2),now-prev.t]);
      while(r.length>RESET_LOG_MAX)r.shift();
      started=true;
    }
  }
  BOARDS[key]={t:now,s,n,r};saveBoards();
  return started;
}
// One-time backfill. The per-player history already in localStorage records the leader's score at
// every past refresh, so run starts from the last 14 days can be recovered from it instead of
// waiting for the live detector to witness its first two resets. Returns how many boards it seeded.
function seedBoardsFromHistory(){
  if(!BOARDS||!HIST)return 0;
  try{if(localStorage.getItem('gge_boards_seeded'))return 0}catch{return 0}
  let seeded=0;
  Object.keys(HIST).forEach(k=>{
    if(BOARDS[k]?.r?.length)return;
    // Snapshots store every visible row as [t,rank,score,stats], so rank 1 turns up once per
    // refresh that included the top of the board — that is the leader series.
    const lead=[];
    Object.values(HIST[k]).forEach(arr=>arr.forEach(e=>{
      if(e&&e[1]===1&&typeof e[2]==='number'&&Number.isFinite(e[2]))lead.push([e[0],e[2]]);
    }));
    if(lead.length<2)return;
    lead.sort((a,b)=>a[0]-b[0]);
    const r=[];
    for(let i=1;i<lead.length;i++){
      const [pt,ps]=lead[i-1],[t,sc]=lead[i],last=r[r.length-1];
      if(ps>0&&sc<ps*RESET_DROP&&(!last||t-last[0]>=RESET_MIN_GAP_MS)){
        r.push([Math.round((pt+t)/2),t-pt]);
        while(r.length>RESET_LOG_MAX)r.shift();
      }
    }
    if(!r.length)return;
    const [lt,ls]=lead[lead.length-1],prev=BOARDS[k];
    // A live observation is always the more recent truth; only its reset log was missing.
    BOARDS[k]=(prev&&prev.t>=lt)?{...prev,r}:{t:lt,s:ls,n:prev?.n??1,r};
    seeded++;
  });
  try{localStorage.setItem('gge_boards_seeded','1')}catch{}
  if(seeded)saveBoards();
  return seeded;
}
// Median gap between observed run starts — median rather than mean so one missed reset (which
// shows up as a doubled gap) doesn't drag the estimate. Null with fewer than two starts.
function boardPeriod(key=histKey()){
  const r=BOARDS?.[key]?.r;
  if(!r||r.length<2)return null;
  const gaps=[];
  for(let i=1;i<r.length;i++)gaps.push(r[i][0]-r[i-1][0]);
  gaps.sort((a,b)=>a-b);
  const m=gaps.length>>1;
  return gaps.length%2?gaps[m]:Math.round((gaps[m-1]+gaps[m])/2);
}
// What the status bar needs about a board's cycle:
//   {last,span,runs}             — a run start was seen, but no period can be derived yet
//   {last,span,runs,period,next} — two or more, so the next reset can be estimated
// Null when nothing has ever been observed, which is also the resting state of the permanent
// boards (honor, might and friends never reset, so no run start is ever recorded for them).
function boardReset(key=histKey()){
  const r=BOARDS?.[key]?.r;
  if(!r||!r.length)return null;
  const [last,span]=r[r.length-1];
  const period=boardPeriod(key);
  if(!period)return{last,span,runs:r.length};
  // A board left unopened for a while can be several runs past the one we last saw.
  let next=last+period;
  const now=Date.now();
  while(next<=now)next+=period;
  return{last,span,runs:r.length,period,next};
}

function histKey(server=S.server,event=S.eventKey,catIdx=S.catIdx,alliance=S.allianceMode){
  return `${server}_${event}_${alliance?'a':'p'}_${catIdx}`;
}
function getPrevRank(name,key=histKey()){
  const arr=HIST?.[key]?.[name];
  if(!arr||!arr.length)return null;
  return arr[arr.length-1][1];
}
// Only the numeric stats that are actually present, under their short storage keys — entries are
// written on every refresh, so anything stored here multiplies across the whole history.
function snapshotStats(r){
  const out={};
  for(const field in HIST_FIELDS){
    const v=r[field];
    if(typeof v==='number'&&Number.isFinite(v))out[HIST_FIELDS[field]]=v;
  }
  return out;
}
function captureSnapshot(rows){
  if(!rows.length||!S.eventKey)return;
  const k=histKey();
  HIST[k]=HIST[k]||{};
  const now=Date.now();
  rows.forEach(r=>{
    const arr=HIST[k][r.name]=HIST[k][r.name]||[];
    const last=arr[arr.length-1];
    // Entries are [time, rank, score, stats]; entries written before stats existed are 3 long
    // and readers must tolerate that (a stat series simply skips them).
    const entry=[now,r.rank,r.score,snapshotStats(r)];
    if(last&&(now-last[0])<HIST_DEDUPE_MS){
      arr[arr.length-1]=entry;
    }else{
      arr.push(entry);
      if(arr.length>HIST_MAX_PER_PLAYER)arr.shift();
    }
  });
  saveHistory();
}
// History of one stat as [{t,v}], oldest first. `field` is 'rank', 'score' or a HIST_FIELDS key.
// Snapshots missing that stat are dropped, so the series is always drawable as-is.
function getStatSeriesForKey(playerName,key,field,maxLen=12){
  const arr=HIST?.[key]?.[playerName];
  if(!arr)return[];
  const short=HIST_FIELDS[field];
  const out=[];
  arr.slice(-maxLen).forEach(([t,rk,sc,stats])=>{
    const v=field==='rank'?rk:field==='score'?sc:(stats?stats[short]:undefined);
    if(typeof v==='number'&&Number.isFinite(v))out.push({t,v});
  });
  return out;
}
// Split a histKey back into its parts. Both server ids ("EmpireEx_5") and ranking keys
// ("event_title_71") contain underscores, so the server is stripped by length and the trailing
// `_p_<cat>` / `_a_<cat>` by shape rather than by splitting on '_'.
function histKeyEvent(key,server){
  if(!key.startsWith(server+'_'))return null;
  const m=key.slice(server.length+1).match(/^(.+)_(p|a)_(\d+)$/);
  return m?{event:m[1],alliance:m[2]==='a',cat:+m[3]}:null;
}
// Position history of one player in one ranking as [{t,v}], oldest first. A ranking can be split
// across level categories, so the category with the most snapshots wins.
function getRankSeriesForEvent(playerName,server,event,maxLen=12){
  let best=null,bestLen=0;
  Object.keys(HIST||{}).forEach(k=>{
    if(!k.startsWith(`${server}_${event}_p_`))return;
    const arr=HIST[k][playerName];
    if(arr&&arr.length>bestLen){best=arr;bestLen=arr.length}
  });
  return best?best.slice(-maxLen).map(([t,rk])=>({t,v:rk})):[];
}
// The player ranking this player has the most history in — the fallback default for the
// favourites chart when the preferred ranking has nothing to draw yet.
function bestHistEvent(playerName,server){
  let bestEvent=null,bestLen=0;
  Object.keys(HIST||{}).forEach(k=>{
    const parts=histKeyEvent(k,server);
    if(!parts||parts.alliance)return;
    const arr=HIST[k][playerName];
    if(arr&&arr.length>bestLen){bestEvent=parts.event;bestLen=arr.length}
  });
  return bestLen>=2?bestEvent:null;
}
