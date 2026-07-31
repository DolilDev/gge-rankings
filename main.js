// gge-rankings — main.js (split from app.js; classic script, shared global scope).
// Load order: config → i18n → state → api → render → features → main. All wiring + init() live in main.js (loaded last).

// ── Keyboard shortcuts ──
function setupKeyboard(){
  document.addEventListener('keydown',e=>{
    const inInput=e.target.matches('input, textarea, select');
    if(e.key==='Escape'){
      document.querySelectorAll('.mini-drop:not(.h),.srv-drop:not(.h)').forEach(d=>d.classList.add('h'));
      document.querySelectorAll('.srv-btn.open').forEach(b=>b.classList.remove('open'));
      if(!$('cmpBackdrop').classList.contains('h'))$('cmpBackdrop').classList.add('h');
      else if(!$('mBackdrop').classList.contains('h'))$('mBackdrop').classList.add('h');
      else if(S.expandedRank!=null)toggleDetail(S.expandedRank);
      if(inInput)e.target.blur();
      return;
    }
    if(inInput)return;
    if(e.key==='/'){e.preventDefault();$('searchInput').focus();return}
    if(e.key==='r'||e.key==='R'){if(!e.ctrlKey&&!e.metaKey){$('refreshBtn').click()}return}
    if(e.key==='f'||e.key==='F'){$('filterBtn').click();return}
    if(e.key==='e'||e.key==='E'){$('exportBtn').click();return}
    if(e.shiftKey&&(e.key==='D'||e.key==='d')){toggleTheme();return}
    if(e.shiftKey&&(e.key==='C'||e.key==='c')){applyCompact(!S.compact);return}
    if(e.key==='ArrowLeft'){if(S.curPage>1)goPage(S.curPage-1);return}
    if(e.key==='ArrowRight'){const t=Math.ceil(S.totalRows/S.pageSize);if(S.curPage<t)goPage(S.curPage+1);return}
  });
}

// ── Wiring ──
document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.nav-btn').forEach(x=>{x.classList.remove('on');x.setAttribute('aria-selected','false')});
  b.classList.add('on');b.setAttribute('aria-selected','true');
  S.page=b.dataset.p;
  $('mainView').style.display=S.page==='ranking'?'block':'none';
  $('pgBar').style.display=S.page==='ranking'&&S.rows.length?'flex':'none';
  $('favView').style.display=S.page==='favorites'?'block':'none';
  if(S.page==='favorites')renderFavPage();
}));

$('favBtn').addEventListener('click',()=>{
  document.querySelectorAll('.nav-btn').forEach(x=>{x.classList.remove('on');x.setAttribute('aria-selected','false')});
  const tab=document.querySelector('[data-p="favorites"]');tab.classList.add('on');tab.setAttribute('aria-selected','true');
  S.page='favorites';$('mainView').style.display='none';$('pgBar').style.display='none';$('favView').style.display='block';renderFavPage();
});

$('themeBtn').addEventListener('click',toggleTheme);
$('langBtn').addEventListener('click',()=>setLang(S.lang==='pl'?'en':'pl'));

// ── Compact (dense) mode ──
function applyCompact(on){
  S.compact=on;
  document.body.classList.toggle('compact',on);
  localStorage.setItem('gge_compact',on?'1':'0');
  const b=$('compactBtn');if(b)b.classList.toggle('on',on);
}
$('compactBtn').addEventListener('click',()=>applyCompact(!S.compact));

// ── Page size ──
function setPageSize(n){
  n=+n||10;S.pageSize=n;localStorage.setItem('gge_pagesize',n);S.curPage=1;
  const sel=$('pageSizeSel');if(sel)sel.value=String(n);
  if(filterActive()&&S.filtered){renderFilteredStatus();renderTable();renderPg();}
  else loadRanking(S.lastSearch||'1');
}
$('pageSizeSel').addEventListener('change',e=>setPageSize(+e.target.value));

// ── Notifications toggle ──
$('notifBtn').addEventListener('click',toggleNotify);

const mainDrop=buildSrvDropdown('srvList','srvBtn','srvSearch',async h=>{
  if(h===S.server)return;
  const prevGame=srvGame(S.server);
  S.server=h;mainDrop.setActive(h);
  if(srvGame(h)!==prevGame){S.eventKey='';S.events={};await loadEvents()}
  S.curPage=1;S.compare=[];updateCompareBar();clearExpanded();
  await loadRanking();
},S.server);

let modalServer=S.server;
const modalDrop=buildSrvDropdown('mSrvList','mSrvBtn','mSrvSearch',h=>{modalServer=h;modalDrop.setActive(h)},modalServer);

$('eventSelect').addEventListener('change',async e=>{S.eventKey=e.target.value;S.catIdx=0;S.curPage=1;S.compare=[];updateCompareBar();clearExpanded();buildCats();await reloadCtx()});

$('typeSeg').querySelectorAll('.seg-b').forEach(b=>b.addEventListener('click',async()=>{
  if((b.dataset.v==='alliance')===S.allianceMode)return;
  S.allianceMode=b.dataset.v==='alliance';S.catIdx=0;S.curPage=1;S.compare=[];updateCompareBar();clearExpanded();
  const pair=S.events.player_to_alliance?.find(e=>e[+!S.allianceMode]===S.eventKey);
  if(pair)S.eventKey=pair[+S.allianceMode];
  updateTypeSeg();buildEventSel();await reloadCtx();
}));

const doSearch=async()=>{
  const v=$('searchInput').value.trim();if(!v)return;
  if(filterActive())resetFilterUI();
  const numeric=!isNaN(+v);
  if(numeric){
    const rank=Math.max(1,Math.floor(+v));
    S.curPage=pageForRank(rank);
    clearExpanded();
    await loadRanking(String((S.curPage-1)*S.pageSize+1));
  }else{
    S.curPage=1;clearExpanded();await loadRanking(v);
  }
};
$('goSearch').addEventListener('click',doSearch);
$('searchInput').addEventListener('keydown',e=>{if(e.key==='Enter')doSearch()});
$('refreshBtn').addEventListener('click',()=>{S.curPage=1;reloadCtx(true)});

$('addBtn').addEventListener('click',()=>{
  $('mName').value='';$('mErr').style.display='none';
  modalServer=S.server;modalDrop.setActive(S.server);
  $('mBackdrop').classList.remove('h');$('mName').focus();
});
$('mCancel').addEventListener('click',()=>$('mBackdrop').classList.add('h'));
$('mBackdrop').addEventListener('click',e=>{if(e.target===$('mBackdrop'))$('mBackdrop').classList.add('h')});
$('mOk').addEventListener('click',()=>{
  const name=$('mName').value.trim();
  const server=modalServer;
  const game=srvGame(server);
  const err=$('mErr');err.style.display='none';
  if(!name){err.textContent=L('Wpisz nick!');err.style.display='block';return}
  if(isFav(name,game,server)){err.textContent=L('Już obserwujesz!');err.style.display='block';return}
  S.favs.push({name,game,server});saveFavs();updFavCnt();
  $('mBackdrop').classList.add('h');toast(L('Obserwujesz {n} ⭐',{n:name}),'success');
  if(S.page==='favorites')renderFavPage();
});
$('mName').addEventListener('keydown',e=>{if(e.key==='Enter')$('mOk').click()});
$('clearFavBtn').addEventListener('click',()=>{if(confirm(L('Usunąć wszystkich obserwowanych?'))){S.favs=[];S.favAls=[];saveFavs();saveFavAls();updFavCnt();renderFavPage()}});

// Compare
$('cOpenBtn').addEventListener('click',openCompareModal);
$('cClearBtn').addEventListener('click',()=>{
  S.compare=[];updateCompareBar();
  document.querySelectorAll('.dr.sel').forEach(tr=>{tr.classList.remove('sel');const ck=tr.querySelector('.ck');if(ck)ck.checked=false});
});
$('cmpClose').addEventListener('click',()=>$('cmpBackdrop').classList.add('h'));
$('cmpBackdrop').addEventListener('click',e=>{if(e.target===$('cmpBackdrop'))$('cmpBackdrop').classList.add('h')});

// Mini dropdowns
setupMiniDrop('exportBtn','expDrop',opt=>exportData(opt.dataset.fmt));
setupMiniDrop('autoRefBtn','autoRefDrop',opt=>{
  S.autoRef=+opt.dataset.v;
  localStorage.setItem('gge_autoref',S.autoRef);
  updateAutoRefUI();
  startAutoRef();
  toast(S.autoRef?L('Auto-odświeżanie: co {t}',{t:fmtCountdown(S.autoRef)}):L('Auto-odświeżanie wyłączone'));
});

setupFilters();
setupKeyboard();

// ── Init ──
let initDone=false;
setTimeout(()=>{if(!initDone){setSt('err',L('Przekroczono czas'));showSt('⏱',L('Ładowanie trwało zbyt długo'),L('Odśwież stronę (F5).'))}},20000);

async function init(){
  loadHistory();
  applyTheme(S.theme);
  const lb=$('langBtn');if(lb)lb.textContent=S.lang.toUpperCase();
  applyI18n();
  applyCompact(S.compact);
  const ps=$('pageSizeSel');if(ps)ps.value=String(S.pageSize);
  if(S.notify&&(!notifySupported()||Notification.permission!=='granted')){S.notify=false;localStorage.setItem('gge_notify','0')}
  updateNotifyUI();
  updateAutoRefUI();

  // Read URL hash params
  const h=readHash();
  if(h.server&&ALL_SERVERS.find(s=>s.h===h.server)){S.server=h.server;mainDrop.setActive(h.server)}
  if(h.type==='a')S.allianceMode=true;
  if(h.event)S.eventKey=h.event;
  if(h.cat!=null)S.catIdx=+h.cat;
  if(h.page)S.curPage=h.page;
  if(h.q)$('searchInput').value=h.q;

  updFavCnt();updateTypeSeg();showSpin();setSt('spin',L('Ładowanie...'));
  try{setSt('spin',L('Tłumaczenia...'));await timeout(loadTexts(),4500).catch(()=>{})}catch{}
  try{setSt('spin',L('Eventy...'));await timeout(loadEvents(),6000).catch(()=>{})}catch{}
  updateTypeSeg();
  initDone=true;
  setSt('spin',L('Pobieranie rankingu...'));
  const initSv=h.q||(S.curPage>1?String((S.curPage-1)*S.pageSize+1):'1');
  await loadRanking(initSv);
  startAutoRef();
}

init();

// ── PWA: register service worker (offline app shell + faster repeat loads) ──
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(e=>console.warn('SW registration failed:',e))});
}
