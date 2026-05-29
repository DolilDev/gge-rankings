// ══════════════════════════════════════════════════════════════
//  GGE Rankings — full app
// ══════════════════════════════════════════════════════════════

// ── Config ──
const GGE_API = 'https://empire-api.fly.dev';
const EVENTS_URL = game => `https://raw.githubusercontent.com/danadum/ggs-assets/main/${game}/events.json`;
const TEXTS_URL = lang => `https://translations-api-test.public.ggs-ep.com/12/${lang}`;
const API_PAGE = 10; // GGE highscore endpoint returns 10 entries per request; the UI page size is S.pageSize
const FILTER_POOL_MAX = 2000;
const FILTER_FETCH_CONC = 10;
const MAX_COMPARE = 4;
const HIST_MAX_PER_PLAYER = 12;
const HIST_DEDUPE_MS = 60 * 1000;
const HIST_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

// ── Servers ──
const ALL_SERVERS = [
  {h:'EmpireEx',     game:'gge', flag:'🌍', code:'INT1',   name:'Internacjonalny 1'},
  {h:'EmpireEx_7',   game:'gge', flag:'🌍', code:'INT2',   name:'Internacjonalny 2'},
  {h:'EmpireEx_43',  game:'gge', flag:'🌍', code:'INT3',   name:'Internacjonalny 3'},
  {h:'EmpireEx_36',  game:'gge', flag:'🌏', code:'ASIA',   name:'Asia'},
  {h:'EmpireEx_22',  game:'gge', flag:'🇦🇺', code:'AU1',    name:'Australia'},
  {h:'EmpireEx_32',  game:'gge', flag:'🇸🇦', code:'AR1',    name:'Arabia Saudyjska'},
  {h:'EmpireEx_20',  game:'gge', flag:'🇧🇷', code:'BR1',    name:'Brazylia'},
  {h:'EmpireEx_16',  game:'gge', flag:'🇧🇬', code:'BG1',    name:'Bułgaria'},
  {h:'EmpireEx_27',  game:'gge', flag:'🇨🇳', code:'CN1',    name:'Chiny'},
  {h:'EmpireEx_37',  game:'gge', flag:'🇨🇳', code:'HANT1',  name:'Chiński (tradycyjny)'},
  {h:'EmpireEx_4',   game:'gge', flag:'🇨🇿', code:'CZ1',    name:'Czechy'},
  {h:'EmpireEx_2',   game:'gge', flag:'🇩🇪', code:'DE1',    name:'Niemcy'},
  {h:'EmpireEx_34',  game:'gge', flag:'🇪🇬', code:'EG1',    name:'Egipt'},
  {h:'EmpireEx_3',   game:'gge', flag:'🇫🇷', code:'FR1',    name:'Francja'},
  {h:'EmpireEx_19',  game:'gge', flag:'🇬🇧', code:'GB1',    name:'Wielka Brytania'},
  {h:'EmpireEx_28',  game:'gge', flag:'🇬🇷', code:'GR1',    name:'Grecja'},
  {h:'EmpireEx_8',   game:'gge', flag:'🇪🇸', code:'ES1',    name:'Hiszpania'},
  {h:'EmpireEx_38',  game:'gge', flag:'🇪🇸', code:'ES2',    name:'Hiszpania 2'},
  {h:'EmpireEx_11',  game:'gge', flag:'🇳🇱', code:'NL1',    name:'Holandia'},
  {h:'EmpireEx_26',  game:'gge', flag:'🇮🇳', code:'IN1',    name:'Indie'},
  {h:'EmpireEx_9',   game:'gge', flag:'🇮🇹', code:'IT1',    name:'Włochy'},
  {h:'EmpireEx_24',  game:'gge', flag:'🇯🇵', code:'JP1',    name:'Japonia'},
  {h:'EmpireEx_25',  game:'gge', flag:'🌎', code:'LATAM1', name:'Ameryka Łacińska'},
  {h:'EmpireEx_35',  game:'gge', flag:'🌍', code:'ARAB1',  name:'Liga Arabska'},
  {h:'EmpireEx_29',  game:'gge', flag:'🇱🇹', code:'LT1',    name:'Litwa'},
  {h:'EmpireEx_13',  game:'gge', flag:'🇸🇪', code:'SKN1',   name:'Nordic'},
  {h:'EmpireEx_5',   game:'gge', flag:'🇵🇱', code:'PL1',    name:'Polska'},
  {h:'EmpireEx_6',   game:'gge', flag:'🇵🇹', code:'PT1',    name:'Portugalia'},
  {h:'EmpireEx_15',  game:'gge', flag:'🇷🇴', code:'RO1',    name:'Rumunia'},
  {h:'EmpireEx_14',  game:'gge', flag:'🇷🇺', code:'RU1',    name:'Rosja'},
  {h:'EmpireEx_18',  game:'gge', flag:'🇸🇰', code:'SK1',    name:'Słowacja'},
  {h:'EmpireEx_21',  game:'gge', flag:'🇺🇸', code:'US1',    name:'Stany Zjednoczone'},
  {h:'EmpireEx_10',  game:'gge', flag:'🇹🇷', code:'TR1',    name:'Turcja'},
  {h:'EmpireEx_12',  game:'gge', flag:'🇭🇺', code:'HU1',    name:'Węgry'},
  {h:'EmpireEx_17',  game:'gge', flag:'🇭🇺', code:'HU2',    name:'Węgry 2'},
  {h:'EmpireEx_33',  game:'gge', flag:'🇦🇪', code:'AE1',    name:'Zjedn. Emiraty Arabskie'},
  {h:'EmpireEx_46',  game:'gge', flag:'🌐', code:'W1',     name:'Świat 1'},
  {h:'EmpireEx_49',  game:'gge', flag:'🌐', code:'W2',     name:'Świat 2'},
  {h:'EmpireExVZ',   game:'gge', flag:'🌐', code:'NET1',   name:'Sieć 1'},
  {h:'EmpireExNK',   game:'gge', flag:'🌐', code:'NET2',   name:'Sieć 2'},
  {h:'EmpireExSP',   game:'gge', flag:'🌐', code:'NET3',   name:'Sieć 3'},
  {h:'EmpireExSP_2', game:'gge', flag:'🌐', code:'NET4',   name:'Sieć 4'},
  {h:'EmpireExSP_3', game:'gge', flag:'🌐', code:'NET5',   name:'Sieć 5'},
  {h:'EmpireExSA',   game:'gge', flag:'🌐', code:'NET6',   name:'Sieć 6'},
  {h:'EmpireExSA_2', game:'gge', flag:'🌐', code:'NET7',   name:'Sieć 7'},
  {h:'EmpireExKA',   game:'gge', flag:'🌐', code:'NET8',   name:'Sieć 8'},
  {h:'EmpirefourkingdomsExGG_2', game:'e4k', flag:'🇧🇷', code:'E4K_BR1',   name:'Empire Four Kingdoms - Brazil 1'},
  {h:'EmpirefourkingdomsExGG_3', game:'e4k', flag:'🇨🇳', code:'E4K_HANT1', name:'Empire Four Kingdoms - Chinese (Traditional)'},
  {h:'EmpirefourkingdomsExGG_4', game:'e4k', flag:'🇫🇷', code:'E4K_FR1',   name:'Empire Four Kingdoms - France 1'},
];

const EV_LABELS = {
  honorPoints:'Honor', playerMight:'Moc', legendLevel:'Poziom legendy',
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

// ── i18n (UI strings; Polish is the source language, English overrides below; missing key → Polish) ──
const EN={
  // Header / nav
  '⚔️ Ranking':'⚔️ Ranking',
  '⭐ Ulubieni':'⭐ Favorites',
  'Zmień motyw (Shift+D)':'Toggle theme (Shift+D)',
  'Zmień motyw':'Toggle theme',
  'Tryb kompaktowy (Shift+C)':'Compact mode (Shift+C)',
  'Język / Language':'Language / Język',
  'Pokaż ulubionych':'Show favorites',
  '+ Śledź':'+ Track',
  'Dodaj gracza do śledzenia':'Track a player',
  // Toolbar
  'Serwer':'Server',
  'Wybierz serwer':'Choose server',
  'Szukaj serwera...':'Search server...',
  'Szukaj serwera':'Search server',
  'Wybierz typ rankingu':'Choose ranking type',
  '👤 Gracze':'👤 Players',
  '🛡 Sojusze':'🛡 Alliances',
  'Rank lub nick... (/)':'Rank or name... (/)',
  'Wyszukaj rank lub nick':'Search rank or name',
  'Szukaj (Enter)':'Search (Enter)',
  'Szukaj':'Search',
  'Odśwież (R)':'Refresh (R)',
  'Odśwież':'Refresh',
  '⚙ Filtry':'⚙ Filters',
  'Filtry (F)':'Filters (F)',
  'Pokaż filtry':'Show filters',
  '⬇ Eksport':'⬇ Export',
  'Eksport (E)':'Export (E)',
  'Eksportuj':'Export',
  '🔗 Kopiuj link':'🔗 Copy link',
  'Auto-odświeżanie':'Auto-refresh',
  '⏹ Wyłącz':'⏹ Off',
  '30 sekund':'30 seconds',
  '1 minuta':'1 minute',
  '5 minut':'5 minutes',
  '10 minut':'10 minutes',
  'Wierszy':'Rows',
  'Wierszy na stronę':'Rows per page',
  // Filter bar
  'Sojusz:':'Alliance:',
  'Wszyscy':'All',
  'Z sojuszem':'With alliance',
  'Bez sojuszu':'Without alliance',
  'Nazwa sojuszu:':'Alliance name:',
  'Filtruj po sojuszu...':'Filter by alliance...',
  'Filtruj po nazwie sojuszu':'Filter by alliance name',
  'Min. wynik:':'Min. score:',
  'Minimalny wynik':'Minimum score',
  '× Wyczyść':'× Clear',
  'Wyczyść filtry':'Clear filters',
  'ℹ Filtry obejmują do 2000 graczy':'ℹ Filters cover up to 2000 players',
  'Po włączeniu filtra pobieramy do 2000 najlepszych graczy i filtrujemy wśród nich':'When a filter is enabled we fetch up to the top 2000 players and filter among them',
  // Status bar
  'Razem:':'Total:',
  'Strona:':'Page:',
  // Favorites
  '⭐ Obserwowani gracze':'⭐ Watched players',
  '🗑 Wyczyść':'🗑 Clear',
  '🔔 Powiadomienia':'🔔 Notifications',
  // Compare
  '📊 Porównaj':'📊 Compare',
  'Porównaj →':'Compare →',
  'Wyczyść':'Clear',
  '📊 Porównanie':'📊 Comparison',
  'Pasek porównania':'Comparison bar',
  // Modal
  '⭐ Śledź gracza':'⭐ Track player',
  'Nick gracza':'Player name',
  'Wpisz nick...':'Enter name...',
  'Anuluj':'Cancel',
  '⭐ Śledź':'⭐ Track',
  'Dodaj gracza':'Add player',
  'Porównanie':'Comparison',
  'Zamknij':'Close',
  // Loading / status
  'Ładowanie...':'Loading...',
  'Pobieranie...':'Fetching...',
  'Odświeżanie...':'Refreshing...',
  'Pobieranie danych...':'Fetching data...',
  'Wybierz serwer lub ranking':'Choose a server or ranking',
  'Wybierz serwer z listy':'Choose a server from the list',
  'Błąd API':'API error',
  'Błąd połączenia z API':'API connection error',
  'Sprawdź połączenie z internetem i spróbuj ponownie.':'Check your internet connection and try again.',
  'Brak danych':'No data',
  'Brak danych dla tego rankingu':'No data for this ranking',
  'Ten event może nie być aktywny na wybranym serwerze.':'This event may not be active on the selected server.',
  'Dane LIVE · {t}':'LIVE data · {t}',
  'Pobieranie graczy do filtrów… {n}':'Fetching players for filters… {n}',
  'Pobieranie graczy do filtrów…':'Fetching players for filters…',
  'Filtr: {n} z {pool} pobranych':'Filter: {n} of {pool} fetched',
  'Tłumaczenia...':'Translations...',
  'Eventy...':'Events...',
  'Pobieranie rankingu...':'Fetching ranking...',
  'Przekroczono czas':'Timed out',
  'Ładowanie trwało zbyt długo':'Loading took too long',
  'Odśwież stronę (F5).':'Refresh the page (F5).',
  'Brak':'None',
  'Brak wyników':'No results',
  // Table
  'Członkowie':'Members',
  'Sojusz':'Alliance',
  'Gracz':'Player',
  'Wynik':'Score',
  'Zaznacz do porównania':'Select to compare',
  'Usuń z ulubionych':'Remove from favorites',
  'Dodaj do ulubionych':'Add to favorites',
  'Awansował z #{p}':'Up from #{p}',
  'Spadł z #{p}':'Down from #{p}',
  'Wśród {n} pobranych graczy nikt nie pasuje do filtrów.':'None of the {n} fetched players match the filters.',
  'Spróbuj wyczyścić filtry lub zmienić kryteria.':'Try clearing filters or changing the criteria.',
  'Brak wyników po filtrach':'No results after filtering',
  'Pokaż graczy tego sojuszu':'Show players of this alliance',
  'Sojusz {n}: {c} graczy · suma {sum} · śr. {avg}':'Alliance {n}: {c} players · total {sum} · avg {avg}',
  // Compare modal
  'Maksymalnie {n} elementów do porównania':'Maximum {n} items to compare',
  'Usuń':'Remove',
  'Brak elementów do porównania':'No items to compare',
  'Pozycja':'Position',
  'Moc':'Might',
  'Chwała':'Glory',
  'Lv legendarny':'Legend Lv',
  'Poziom':'Level',
  'Atak':'Attack',
  'Obrona':'Defense',
  'Rabunek':'Loot',
  // Detail panel
  'Punkty chwały':'Glory points',
  'Poziom legendarny':'Legendary level',
  'Punkty ataku':'Attack points',
  'Punkty obrony':'Defense points',
  'Punkty rabunku':'Loot points',
  'Ranga':'Rank',
  'Tytuł (prefix)':'Title (prefix)',
  'Tytuł (suffix)':'Title (suffix)',
  'Wynik rankingu':'Ranking score',
  'Brak szczegółowych danych':'No detailed data',
  'Otwórz ranking: {x}':'Open ranking: {x}',
  '📈 Historia pozycji ({n} pkt)':'📈 Position history ({n} pts)',
  'Za mało danych historycznych':'Not enough history',
  '☆ Obserwuj':'☆ Watch',
  '⭐ Obserwowany':'⭐ Watching',
  '📷 Karta PNG':'📷 PNG card',
  // Alliance detail
  'Brak ID sojuszu':'No alliance ID',
  'Otwarty':'Open',
  'Tak':'Yes',
  'Nie':'No',
  'Opis':'Description',
  'Członkowie ({n})':'Members ({n})',
  'Błąd pobierania danych':'Error fetching data',
  'Śr. moc':'Avg. might',
  // Favorites cards
  'Brak obserwowanych graczy i sojuszów.<br>Kliknij ☆ przy dowolnym graczu lub sojuszu.':'No watched players or alliances.<br>Click ☆ on any player or alliance.',
  '⏳ Pobieranie...':'⏳ Fetching...',
  'Usunięto':'Removed',
  'Nie znaleziono':'Not found',
  'Błąd':'Error',
  'Notatka (np. wróg / sojusznik / cel)':'Note (e.g. enemy / ally / target)',
  // Pagination
  'Pierwsza strona':'First page',
  'Poprzednia':'Previous',
  'Następna':'Next',
  'Ostatnia':'Last',
  'Strona {i}':'Page {i}',
  'Skocz do strony':'Jump to page',
  'Str. {cur} z {total} · {n} {kind}':'Page {cur} of {total} · {n} {kind}',
  'po filtrach':'after filters',
  'graczy':'players',
  // Toasts
  'Usunięto sojusz z obserwowanych':'Alliance removed from watched',
  'Obserwujesz sojusz {n} ⭐':'Watching alliance {n} ⭐',
  'Usunięto z obserwowanych':'Removed from watched',
  'Obserwujesz {n} ⭐':'Watching {n} ⭐',
  '🚀 {n} wszedł do TOP 10 (#{r})':'🚀 {n} entered the TOP 10 (#{r})',
  '📉 {n} wypadł z TOP 10 (#{r})':'📉 {n} dropped out of the TOP 10 (#{r})',
  '🏅 {n} wszedł do TOP 3 (#{r})':'🏅 {n} entered the TOP 3 (#{r})',
  '🔗 Link skopiowany do schowka':'🔗 Link copied to clipboard',
  'Skopiuj URL ręcznie':'Copy the URL manually',
  '📥 Pobrano {name}':'📥 Downloaded {name}',
  '📥 Zapisano kartę PNG':'📥 Saved PNG card',
  'Brak danych do eksportu':'No data to export',
  'Wpisz nick!':'Enter a name!',
  'Już obserwujesz!':'Already watching!',
  'Usunąć wszystkich obserwowanych?':'Remove all watched?',
  'Auto-odświeżanie: co {t}':'Auto-refresh: every {t}',
  'Auto-odświeżanie wyłączone':'Auto-refresh disabled',
  'Powiadomienia włączone':'Notifications enabled',
  'Powiadomienia wyłączone':'Notifications disabled',
  'Powiadomienia zablokowane w ustawieniach przeglądarki':'Notifications are blocked in browser settings',
  'Twoja przeglądarka nie obsługuje powiadomień':'Your browser does not support notifications',
};
function curLocale(){return S.lang==='en'?'en-US':'pl-PL'}
function L(s,p){
  let o=(S.lang==='en'&&EN[s]!=null)?EN[s]:s;
  if(p)for(const k in p)o=o.split('{'+k+'}').join(p[k]);
  return o;
}
function applyI18n(){
  try{document.documentElement.lang=S.lang}catch{}
  document.querySelectorAll('[data-t]').forEach(el=>el.textContent=L(el.getAttribute('data-t')));
  document.querySelectorAll('[data-tph]').forEach(el=>el.setAttribute('placeholder',L(el.getAttribute('data-tph'))));
  document.querySelectorAll('[data-ttl]').forEach(el=>el.setAttribute('title',L(el.getAttribute('data-ttl'))));
  document.querySelectorAll('[data-tar]').forEach(el=>el.setAttribute('aria-label',L(el.getAttribute('data-tar'))));
}
async function setLang(lang){
  if(lang===S.lang)return;
  S.lang=lang;localStorage.setItem('gge_lang',lang);
  const lb=$('langBtn');if(lb)lb.textContent=lang.toUpperCase();
  applyI18n();
  await loadTexts().catch(()=>{});
  buildEventSel();updateAutoRefUI();
  if(filterActive()&&S.filtered){renderFilteredStatus();renderTable();renderPg();}
  else if(S.rows.length){renderTable();renderPg();}
  if(S.page==='favorites')renderFavPage();
}

// ── State ──
const S = {
  page:'ranking',
  server: localStorage.getItem('server') || 'EmpireEx_5',
  eventKey:'', catIdx:0, allianceMode:false,
  curPage:1, totalRows:0,
  rows:[], expandedRank:null, expandedName:null, loading:false, reqId:0, lastSearch:'',
  pool:null, poolCtx:null, filtered:null, _poolPromise:null,
  events:{}, texts:{},
  favs: JSON.parse(localStorage.getItem('gge_favs_v7')||'[]'),
  favAls: JSON.parse(localStorage.getItem('gge_favAls_v1')||'[]'),
  sort: null,
  filter: {alliance:'all', alName:'', minScore:0},
  compare: [],
  autoRef: +localStorage.getItem('gge_autoref')||0,
  theme: localStorage.getItem('gge_theme')||'dark',
  lang: localStorage.getItem('gge_lang')||'pl',
  pageSize: +localStorage.getItem('gge_pagesize')||10,
  compact: localStorage.getItem('gge_compact')==='1',
  notify: localStorage.getItem('gge_notify')==='1',
};

// ── Helpers ──
const $ = id => document.getElementById(id);
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function fmtN(n){if(n===null||n===undefined)return'—';const x=+n;return isNaN(x)?String(n):x.toLocaleString(curLocale())}
function isFav(n,g,s){return S.favs.some(f=>f.name===n&&f.game===g&&f.server===s)}
function saveFavs(){localStorage.setItem('gge_favs_v7',JSON.stringify(S.favs))}
let _tt;
function toast(m,kind=''){const t=$('toast');t.textContent=m;t.className='toast show'+(kind?' '+kind:'');clearTimeout(_tt);_tt=setTimeout(()=>t.className='toast',2600)}
function setSt(cls,msg){const b=$('sBar');b.className='sbar '+cls;$('sMsg').textContent=msg}
function timeout(p,ms){return Promise.race([p,new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),ms))])}
function delay(ms){return new Promise(r=>setTimeout(r,ms))}
function srvInfo(h){return ALL_SERVERS.find(s=>s.h===h)||null}
function srvGame(h){return srvInfo(h)?.game||'gge'}
function sname(h){const s=srvInfo(h);return s?`${s.flag} ${s.name}`:`Serwer ${h}`}

// ── Theme ──
function applyTheme(t){
  S.theme=t;
  if(t==='light') document.documentElement.setAttribute('data-theme','light');
  else document.documentElement.removeAttribute('data-theme');
  const b=$('themeBtn'); if(b) b.textContent = t==='light'?'☀️':'🌙';
  localStorage.setItem('gge_theme',t);
}
function toggleTheme(){applyTheme(S.theme==='light'?'dark':'light')}

// ── URL hash sync ──
function readHash(){
  const h=location.hash.slice(1);if(!h)return{};
  const p=new URLSearchParams(h);
  return{server:p.get('s'),event:p.get('e'),cat:p.get('c'),type:p.get('t'),page:+p.get('p')||0,q:p.get('q')||''};
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
  rows.slice(0,100).forEach(r=>{
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

// ── Custom server dropdown ──
function buildSrvDropdown(listId,btnId,searchId,onSelect,currentH){
  const list=$(listId),btn=$(btnId),search=$(searchId);
  function renderList(filter=''){
    const q=filter.toLowerCase();
    const ggeItems=ALL_SERVERS.filter(s=>s.game==='gge');
    const e4kItems=ALL_SERVERS.filter(s=>s.game==='e4k');
    function renderItems(items){
      return items.filter(s=>!q||s.name.toLowerCase().includes(q)||s.code.toLowerCase().includes(q))
        .map(s=>`<div class="srv-item${s.h===currentH?' active':''}" data-h="${s.h}" role="option" aria-selected="${s.h===currentH}">
          <span class="srv-item-flag">${s.flag}</span>
          <span class="srv-item-code">${s.code}</span>
          <span class="srv-item-name">${esc(s.name)}</span></div>`).join('');
    }
    const ggeHtml=renderItems(ggeItems);
    const e4kHtml=renderItems(e4kItems);
    list.innerHTML=(ggeHtml||e4kHtml)?ggeHtml+(e4kHtml?`<div class="srv-divider">Empire Four Kingdoms</div>${e4kHtml}`:''):`<div class="srv-empty">${L('Brak wyników')}</div>`;
    list.querySelectorAll('.srv-item').forEach(el=>el.addEventListener('click',()=>{currentH=el.dataset.h;closeDrop();onSelect(currentH)}));
  }
  function updateBtn(h){
    const s=srvInfo(h);if(!s)return;
    const flagEl=btn.querySelector('[id$="BtnFlag"]'),codeEl=btn.querySelector('[id$="BtnCode"]'),nameEl=btn.querySelector('[id$="BtnName"]');
    if(flagEl)flagEl.textContent=s.flag;if(codeEl)codeEl.textContent=s.code;if(nameEl)nameEl.textContent=s.name;
  }
  function openDrop(){const drop=btn.nextElementSibling;drop.classList.remove('h');btn.classList.add('open');search.value='';renderList('');search.focus();setTimeout(()=>{const a=list.querySelector('.active');if(a)a.scrollIntoView({block:'nearest'})},50)}
  function closeDrop(){const drop=btn.nextElementSibling;drop.classList.add('h');btn.classList.remove('open')}
  btn.addEventListener('click',e=>{e.stopPropagation();btn.nextElementSibling.classList.contains('h')?openDrop():closeDrop()});
  search.addEventListener('input',()=>renderList(search.value));
  search.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrop();if(e.key==='Enter'){const first=list.querySelector('.srv-item');if(first)first.click()}});
  document.addEventListener('click',e=>{if(!btn.closest('.srv-wrap').contains(e.target))closeDrop()});
  updateBtn(currentH);renderList('');
  return{updateBtn,renderList,setActive(h){currentH=h;renderList(search?.value||'');updateBtn(h)}};
}

// ── Mini dropdown helper ──
function setupMiniDrop(btnId,dropId,onSelect){
  const btn=$(btnId),drop=$(dropId);
  btn.addEventListener('click',e=>{
    e.stopPropagation();
    document.querySelectorAll('.mini-drop').forEach(d=>{if(d!==drop)d.classList.add('h')});
    drop.classList.toggle('h');
  });
  drop.querySelectorAll('.mini-opt').forEach(opt=>{
    opt.addEventListener('click',e=>{e.stopPropagation();drop.classList.add('h');onSelect(opt)});
  });
  document.addEventListener('click',e=>{if(!drop.contains(e.target)&&e.target!==btn)drop.classList.add('h')});
}

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
async function ggeGet(url){
  const hit=cGet(url);if(hit)return hit;
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

async function fetchRanking(sv){
  const isNameSearch=sv&&isNaN(+sv);
  const lt=isNameSearch?(curEv().id??curLT()):curLT();
  if(!lt||!S.server)return null;
  const lid=isNameSearch?'':curCat().id||'';
  try{
    const url=isGlobal()?ggeGlobalUrl(S.server,lt,sv,lid):ggeUrl(S.server,lt,sv,lid);
    return await timeout(ggeGet(url),10000);
  }catch(e){console.warn('fetchRanking:',e.message);return null}
}

// Fetch one UI page (up to S.pageSize rows). Name search → single request;
// numeric start rank → ceil(pageSize/API_PAGE) chunks fetched in parallel and merged.
async function fetchRankingPage(sv){
  const isName=sv&&isNaN(+sv);
  if(isName){const d=await fetchRanking(sv);return d?parseRows(d):null}
  const start=Math.max(1,+sv||1);
  const chunks=Math.max(1,Math.ceil(S.pageSize/API_PAGE));
  const starts=[];for(let i=0;i<chunks;i++)starts.push(start+i*API_PAGE);
  const results=await Promise.all(starts.map(s=>fetchRanking(String(s))));
  if(!results.some(Boolean))return null;
  const map=new Map();let total=0;
  results.forEach(d=>{if(!d)return;const pr=parseRows(d);if(pr.total>total)total=pr.total;pr.rows.forEach(r=>{if(r&&r.rank!=null)map.set(r.rank,r)})});
  const rows=[...map.values()].sort((a,b)=>a.rank-b.rank).slice(0,S.pageSize);
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

// ── Browser notifications (Notification API; works even with the tab in the background) ──
function notifySupported(){return typeof Notification!=='undefined'}
function updateNotifyUI(){const b=$('notifBtn');if(b)b.classList.toggle('on',S.notify&&notifySupported()&&Notification.permission==='granted')}
async function toggleNotify(){
  if(!notifySupported()){toast(L('Twoja przeglądarka nie obsługuje powiadomień'),'error');return}
  if(S.notify){S.notify=false;localStorage.setItem('gge_notify','0');updateNotifyUI();toast(L('Powiadomienia wyłączone'));return}
  let perm=Notification.permission;
  if(perm==='default'){try{perm=await Notification.requestPermission()}catch{}}
  if(perm!=='granted'){toast(L('Powiadomienia zablokowane w ustawieniach przeglądarki'),'error');S.notify=false;localStorage.setItem('gge_notify','0');updateNotifyUI();return}
  S.notify=true;localStorage.setItem('gge_notify','1');updateNotifyUI();toast(L('Powiadomienia włączone'),'success');
}
function pushNotify(body){
  if(!S.notify||!notifySupported()||Notification.permission!=='granted')return;
  const opts={body,icon:'icon.svg',badge:'icon.svg',tag:'gge-rankings'};
  try{
    if(navigator.serviceWorker&&navigator.serviceWorker.ready){
      navigator.serviceWorker.ready.then(reg=>reg.showNotification('GGE Rankings',opts)).catch(()=>{try{new Notification('GGE Rankings',opts)}catch{}});
    }else{new Notification('GGE Rankings',opts)}
  }catch(e){console.warn('notify failed:',e)}
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

// ── Render ──
function showSpin(){$('mainView').classList.remove('stale');$('mainView').innerHTML=`<div class="st"><div class="spin"></div><div class="sm">${L('Pobieranie danych...')}</div></div>`;$('pgBar').style.display='none'}
function showSt(icon,msg,sub){$('mainView').classList.remove('stale');$('mainView').innerHTML=`<div class="st"><div class="si">${icon}</div><div class="sm">${esc(msg)}</div>${sub?`<div class="ss">${esc(sub)}</div>`:''}</div>`;$('pgBar').style.display='none'}

function applyFilter(rows){
  let r=rows;
  if(S.filter.alliance==='with')r=r.filter(x=>x.al);
  else if(S.filter.alliance==='without')r=r.filter(x=>!x.al);
  if(S.filter.alName){
    const q=S.filter.alName.toLowerCase();
    r=r.filter(x=>(x.al||'').toLowerCase().includes(q)||(x.alTag||'').toLowerCase().includes(q));
  }
  if(S.filter.minScore)r=r.filter(x=>(x.score||0)>=S.filter.minScore);
  return r;
}
function applySort(rows){
  if(!S.sort)return rows;
  const {col,dir}=S.sort;
  const sign=dir==='asc'?1:-1;
  return[...rows].sort((a,b)=>{
    const va=a[col],vb=b[col];
    if(va==null&&vb==null)return 0;
    if(va==null)return 1;if(vb==null)return-1;
    if(typeof va==='string')return va.localeCompare(vb,curLocale())*sign;
    return(va-vb)*sign;
  });
}
function visibleRows(){return applySort(applyFilter(S.rows))}

// ── Filter pool (client-side filtering across many players) ──
function filterActive(){const f=S.filter;return f.alliance!=='all'||!!f.alName||!!f.minScore}
function poolCtx(){return `${S.server}|${S.eventKey}|${S.catIdx}|${S.allianceMode?'a':'p'}|${isGlobal()?'g':'n'}`}
function invalidatePool(){S.pool=null;S.poolCtx=null;S._poolPromise=null}
function activeRows(){return (filterActive()&&S.filtered)?S.filtered:S.rows}
function findRow(rank){return activeRows().find(x=>x.rank===rank)}
async function ensurePool(){
  const ctx=poolCtx();
  if(S.pool&&S.poolCtx===ctx)return S.pool;
  if(S._poolPromise)return S._poolPromise;
  S._poolPromise=(async()=>{
    const all=[];
    for(let sv=1;sv<=FILTER_POOL_MAX;){
      const batch=[];
      for(let j=0;j<FILTER_FETCH_CONC&&sv<=FILTER_POOL_MAX;j++,sv+=API_PAGE)batch.push(sv);
      const res=await Promise.all(batch.map(s=>fetchRanking(String(s)).then(d=>d?parseRows(d).rows:[]).catch(()=>[])));
      let got=0;res.forEach(rows=>{got+=rows.length;all.push(...rows)});
      if(poolCtx()!==ctx){S._poolPromise=null;return S.pool||[]}
      setSt('spin',L('Pobieranie graczy do filtrów… {n}',{n:all.length}));
      if(got===0)break;
    }
    const map=new Map();all.forEach(r=>{if(r&&r.rank!=null)map.set(r.rank,r)});
    const pool=[...map.values()].sort((a,b)=>a.rank-b.rank);
    S.pool=pool;S.poolCtx=ctx;S._poolPromise=null;
    return pool;
  })();
  return S._poolPromise;
}
function applyFiltered(){S.filtered=applySort(applyFilter(S.pool||[]))}
function renderFilteredStatus(){
  const n=S.filtered.length,poolN=(S.pool||[]).length;
  const totalPgs=Math.max(1,Math.ceil(n/S.pageSize));
  $('sTotal').textContent=fmtN(n);
  $('sPage').textContent=`${Math.min(S.curPage,totalPgs)} / ${totalPgs}`;
  setSt('live',L('Filtr: {n} z {pool} pobranych',{n:fmtN(n),pool:fmtN(poolN)}));
}
async function runFilter(){
  if(!filterActive()){S.filtered=null;await loadRanking('1');return}
  const ctx=poolCtx();
  if(!(S.pool&&S.poolCtx===ctx)){S.loading=true;setSt('spin',L('Pobieranie graczy do filtrów…'));if(S.rows.length)$('mainView').classList.add('stale');else showSpin()}
  const pool=await ensurePool();
  S.loading=false;
  if(poolCtx()!==ctx)return;
  if(!filterActive()){S.filtered=null;await loadRanking('1');return}
  S.pool=pool;
  applyFiltered();
  const totalPgs=Math.max(1,Math.ceil(S.filtered.length/S.pageSize));
  if(S.curPage>totalPgs)S.curPage=1;
  renderFilteredStatus();
  renderTable();renderPg();
  writeHash();
}
function resetFilterUI(){
  S.filter={alliance:'all',alName:'',minScore:0};
  const seg=$('fAlSeg');if(seg)seg.querySelectorAll('.seg-b').forEach(x=>x.classList.toggle('on',x.dataset.f==='all'));
  if($('fAlName'))$('fAlName').value='';
  if($('fMinScore'))$('fMinScore').value='';
  S.filtered=null;
}
async function reloadCtx(){invalidatePool();if(filterActive())await runFilter();else await loadRanking()}

// Click an alliance tag → list that alliance's players in the current ranking (via the name filter).
function filterByAlliance(name){
  if(!name)return;
  resetFilterUI();
  S.filter.alName=name;
  const inp=$('fAlName');if(inp)inp.value=name;
  const bar=$('fBar');
  if(bar&&bar.classList.contains('h')){bar.classList.remove('h');$('filterBtn').setAttribute('aria-expanded','true');$('filterBtn').classList.add('on')}
  S.curPage=1;clearExpanded();
  runFilter();
  window.scrollTo({top:0,behavior:'smooth'});
}

function chgIndicator(name,curRk){
  const prev=getPrevRank(name);
  if(prev==null||prev===curRk)return'';
  if(prev>curRk)return`<span class="chg up" title="${L('Awansował z #{p}',{p:prev})}">▲${prev-curRk}</span>`;
  return`<span class="chg dn" title="${L('Spadł z #{p}',{p:prev})}">▼${curRk-prev}</span>`;
}
function getPrevScore(name,key=histKey()){
  const arr=HIST?.[key]?.[name];
  if(!arr||!arr.length)return null;
  return arr[arr.length-1][2];
}
function fmtAbbr(n){
  n=Math.abs(+n)||0;
  if(n>=1e6)return +(n/1e6).toFixed(n>=1e7?0:1)+'M';
  if(n>=1e3)return +(n/1e3).toFixed(n>=1e4?0:1)+'k';
  return String(Math.round(n));
}
// Δ score delta vs last snapshot — shown next to the rank-change arrow.
function scoreChgIndicator(name,curScore){
  if(curScore==null)return'';
  const prev=getPrevScore(name);
  if(prev==null||prev===curScore)return'';
  const d=curScore-prev,up=d>0;
  return`<span class="chg sd ${up?'up':'dn'}" title="Δ ${up?'+':'−'}${fmtN(Math.abs(d))}">Δ${up?'+':'−'}${fmtAbbr(d)}</span>`;
}

function renderTable(){
  const isAl=S.allianceMode;
  const filt=filterActive()&&!!S.pool;
  const full=filt?applySort(applyFilter(S.pool)):visibleRows();
  if(filt)S.filtered=full;
  const rows=filt?full.slice((S.curPage-1)*S.pageSize,S.curPage*S.pageSize):full;
  // Keep the open detail panel pinned to its player/alliance by name (rank can shift
  // between refreshes), so it survives re-renders instead of vanishing.
  if(S.expandedName!=null){
    const m=rows.find(r=>r.name===S.expandedName);
    S.expandedRank=m?m.rank:null;
    if(!m)S.expandedName=null;
  }
  const max=(filt?S.pool[0]?.score:S.rows[0]?.score)||rows[0]?.score||1;
  const sortCol=S.sort?.col, sortDir=S.sort?.dir;
  const sortable=(col,extraClass='')=>{
    let cls=`sortable ${extraClass}`;
    if(sortCol===col)cls+=' sort-'+sortDir;
    return cls.trim();
  };
  // Glory (Chwała) column — shown & sortable only when the current data provides it
  const hasGlory=!isAl&&full.some(r=>r.glory!=null);
  const ncols=hasGlory?8:7;
  const gloryTh=hasGlory?`<th class="${sortable('glory','r')}" data-sort="glory" style="width:110px">${L('Chwała')}</th>`:'';
  let h=`<div class="twrap"><table><thead><tr>
    <th style="width:34px"></th>
    <th class="${sortable('rank')}" data-sort="rank" style="width:48px;text-align:center">#</th>
    <th style="width:26px"></th>
    <th class="${sortable('name')}" data-sort="name" style="width:260px">${isAl?L('Sojusz'):L('Gracz')}</th>
    <th class="${sortable(isAl?'members':'al','r')}" data-sort="${isAl?'members':'al'}" style="width:${isAl?'120px':'100px'}">${isAl?L('Członkowie'):L('Sojusz')}</th>
    ${gloryTh}<th class="${sortable('score','r')}" data-sort="score" style="width:170px">${L('Wynik')}</th>
    <th></th>
    </tr></thead><tbody>`;

  const game=srvGame(S.server);
  const sq=S.lastSearch;
  rows.forEach(r=>{
    const fv=isFav(r.name,game,S.server);
    const pct=Math.min(100,Math.round(((r.score||0)/max)*100));
    const badge=r.rank===1?'🥇':r.rank===2?'🥈':r.rank===3?'🥉':r.rank;
    const rkCls=r.rank<=3?'rk'+r.rank:'';
    const exp=S.expandedRank===r.rank;
    const fvb=fv?'<span class="badge b-fav">★</span>':'';
    const favNote=fv?(S.favs.find(f=>f.name===r.name&&f.game===game&&f.server===S.server)||{}).note:'';
    const noteBadge=favNote?`<span class="badge b-note" title="${esc(favNote)}">📝</span>`:'';
    const isMatch=sq&&r.name.toLowerCase().includes(sq);
    const inCmp=S.compare.some(c=>c.name===r.name&&c.server===S.server);
    const chg=chgIndicator(r.name,r.rank);
    const scd=scoreChgIndicator(r.name,r.score);
    const alCell=isAl
      ?`<td class="r" style="color:var(--c-muted);font-size:12px">${r.members!=null?fmtN(r.members):'—'}</td>`
      :`<td class="r" style="font-size:11px;color:var(--c-muted)">${r.al?`<button class="badge b-al al-tag" data-al="${esc(r.al)}" title="${L('Pokaż graczy tego sojuszu')}">${esc(r.alTag||r.al.slice(0,5))}</button>`:'—'}</td>`;
    const gloryCell=hasGlory?`<td class="r" style="font-size:12px;color:var(--c-muted);font-variant-numeric:tabular-nums">${r.glory!=null?fmtN(r.glory):'—'}</td>`:'';
    h+=`<tr class="dr ${rkCls}${fv?' fav':''}${exp?' exp':''}${isMatch?' match':''}${inCmp?' sel':''}" data-rk="${r.rank}">
      <td><input type="checkbox" class="ck" data-rk="${r.rank}" ${inCmp?'checked':''} aria-label="${L('Zaznacz do porównania')}" onclick="event.stopPropagation()"></td>
      <td class="rk ${rkCls}">${badge}${chg}${scd}</td>
      <td><button class="sb${fv?' on':''}" data-n="${esc(r.name)}" aria-label="${fv?L('Usuń z ulubionych'):L('Dodaj do ulubionych')}">${fv?'⭐':'☆'}</button></td>
      <td class="c-name"><span class="pn" title="${esc(r.name)}">${esc(r.name)}</span>${fvb}${noteBadge}</td>
      ${alCell}
      ${gloryCell}<td class="r"><div class="sc"><div class="sbar2"><div class="sbf" style="width:${pct}%"></div></div><span class="sv">${fmtN(r.score)}</span></div></td>
      <td></td>
      </tr>
      <tr class="xr" data-for="${r.rank}" style="display:${exp?'':'none'}">
      <td colspan="${ncols}"><div class="dp" id="dp_${r.rank}"></div></td>
      </tr>`;
  });
  h+='</tbody></table></div>';
  // Alliance aggregates banner — shown when filtering players by a single alliance
  let banner='';
  if(filt&&S.filter.alName&&!S.allianceMode&&full.length){
    const sum=full.reduce((s,x)=>s+(x.score||0),0);
    const avg=Math.round(sum/full.length);
    banner=`<div class="al-summary">📊 ${L('Sojusz {n}: {c} graczy · suma {sum} · śr. {avg}',{n:esc(S.filter.alName),c:full.length,sum:fmtN(sum),avg:fmtN(avg)})}</div>`;
  }
  if(!rows.length&&(filt||S.rows.length)){
    const sub=filt?L('Wśród {n} pobranych graczy nikt nie pasuje do filtrów.',{n:fmtN((S.pool||[]).length)}):L('Spróbuj wyczyścić filtry lub zmienić kryteria.');
    h=`<div class="st"><div class="si">🔍</div><div class="sm">${L('Brak wyników po filtrach')}</div><div class="ss">${sub}</div></div>`;
    banner='';
  }
  $('mainView').classList.remove('stale');
  $('mainView').innerHTML=banner+h;

  $('mainView').querySelectorAll('th.sortable').forEach(th=>{
    th.addEventListener('click',()=>{
      const col=th.dataset.sort;
      if(S.sort?.col===col){
        if(S.sort.dir==='asc')S.sort={col,dir:'desc'};
        else S.sort=null;
      }else S.sort={col,dir:col==='rank'?'asc':'desc'};
      S.expandedRank=null;
      renderTable();
    });
  });
  $('mainView').querySelectorAll('.dr').forEach(tr=>{
    const rk=+tr.dataset.rk;
    const sb=tr.querySelector('.sb');
    if(sb)sb.addEventListener('click',e=>{e.stopPropagation();const n=e.currentTarget.dataset.n;toggleFav(n,game,S.server,tr)});
    const ck=tr.querySelector('.ck');
    if(ck)ck.addEventListener('change',e=>{e.stopPropagation();toggleCompare(rk,ck.checked)});
    const alTag=tr.querySelector('.al-tag');
    if(alTag)alTag.addEventListener('click',e=>{e.stopPropagation();filterByAlliance(alTag.dataset.al)});
    tr.addEventListener('click',()=>toggleDetail(rk));
  });
  // Re-attach the open detail panel (e.g. after a refresh/sort re-render).
  if(S.expandedRank!=null)renderDetailContent(S.expandedRank);
}

function toggleCompare(rank,checked){
  const r=findRow(rank);if(!r)return;
  const existingIdx=S.compare.findIndex(c=>c.name===r.name&&c.server===S.server);
  if(checked){
    if(existingIdx>=0)return;
    if(S.compare.length>=MAX_COMPARE){
      toast(L('Maksymalnie {n} elementów do porównania',{n:MAX_COMPARE}),'error');
      const ck=document.querySelector(`.ck[data-rk="${rank}"]`);if(ck)ck.checked=false;
      return;
    }
    S.compare.push({name:r.name,type:S.allianceMode?'alliance':'player',server:S.server,data:{...r}});
  }else{
    if(existingIdx>=0)S.compare.splice(existingIdx,1);
  }
  updateCompareBar();
  const tr=document.querySelector(`.dr[data-rk="${rank}"]`);
  if(tr)tr.classList.toggle('sel',checked);
}

function updateCompareBar(){
  const bar=$('cBar');
  if(!S.compare.length){bar.classList.add('h');document.body.classList.remove('with-cbar');return}
  bar.classList.remove('h');
  document.body.classList.add('with-cbar');
  $('cCount').textContent=S.compare.length;
  $('cChips').innerHTML=S.compare.map((c,i)=>{
    const icon=c.type==='alliance'?'🛡':'👤';
    return`<span class="cChip">${icon} ${esc(c.name)} <button class="cChip-rm" data-i="${i}" aria-label="${L('Usuń')}">×</button></span>`;
  }).join('');
  $('cChips').querySelectorAll('.cChip-rm').forEach(b=>b.addEventListener('click',e=>{
    e.stopPropagation();
    const i=+b.dataset.i,c=S.compare[i];
    S.compare.splice(i,1);
    updateCompareBar();
    const tr=document.querySelector(`.dr[data-rk="${c.data.rank}"]`);
    if(tr&&c.server===S.server){tr.classList.remove('sel');const ck=tr.querySelector('.ck');if(ck)ck.checked=false}
  }));
}

function openCompareModal(){
  if(!S.compare.length){toast(L('Brak elementów do porównania'));return}
  const body=$('cmpBody');
  const isAl=S.compare[0].type==='alliance';
  const stats=isAl
    ?[['rank','Pozycja','asc'],['score','Wynik','desc'],['members','Członkowie','desc']]
    :[['rank','Pozycja','asc'],['score','Wynik','desc'],['honor','Honor','desc'],['might','Moc','desc'],['glory','Chwała','desc'],['legendLevel','Lv legendarny','desc'],['level','Poziom','desc'],['avp','Atak','desc'],['hf','Obrona','desc'],['rpt','Rabunek','desc']];

  body.innerHTML=`<div class="cmp-grid">${
    S.compare.map((c,idx)=>{
      const r=c.data,srv=srvInfo(c.server);
      const rowsHtml=stats.map(([key,label,dir])=>{
        const val=r[key];
        if(val==null)return'';
        const vals=S.compare.map(x=>x.data[key]).filter(v=>v!=null);
        let cls='';
        if(vals.length>1){
          const sorted=[...vals].sort((a,b)=>dir==='asc'?a-b:b-a);
          if(val===sorted[0])cls='best';
          else if(val===sorted[sorted.length-1])cls='worst';
        }
        const display=key==='rank'?'#'+val:(key==='legendLevel'||key==='level'?fmtN(val):fmtN(val));
        return`<div class="cmp-row ${cls}"><span class="l">${L(label)}</span><span class="v">${display}</span></div>`;
      }).join('');
      return`<div class="cmp-col">
        <div class="cmp-name">${(c.type==='alliance'?'🛡 ':'👤 ')+esc(c.name)} <button class="cmp-rm" data-i="${idx}" aria-label="${L('Usuń')}">×</button></div>
        <div class="cmp-srv">${srv?srv.flag+' '+srv.name:esc(c.server)}${c.data.al?' · '+esc(c.data.al):''}</div>
        ${rowsHtml||'<div class="cmp-row"><span class="l">Brak danych</span></div>'}
      </div>`;
    }).join('')
  }</div>`;

  body.querySelectorAll('.cmp-rm').forEach(b=>b.addEventListener('click',e=>{
    const i=+b.dataset.i,c=S.compare[i];
    S.compare.splice(i,1);
    updateCompareBar();
    if(c?.server===S.server){
      const tr=document.querySelector(`.dr[data-rk="${c.data.rank}"]`);
      if(tr){tr.classList.remove('sel');const ck=tr.querySelector('.ck');if(ck)ck.checked=false}
    }
    if(!S.compare.length){$('cmpBackdrop').classList.add('h');return}
    openCompareModal();
  }));

  $('cmpBackdrop').classList.remove('h');
}

async function renderAllianceDetail(r,panel){
  panel.innerHTML=`<div class="dp"><div class="st" style="padding:20px"><div class="spin"></div></div></div>`;
  if(!r.allianceId){panel.innerHTML=`<div class="dp"><span style="color:var(--c-muted);font-size:12px">${L('Brak ID sojuszu')}</span></div>`;return}
  try{
    const url=`${GGE_API}/${S.server}/ain/%22AID%22:${r.allianceId}`;
    const d=await timeout(ggeGet(url),8000);
    if(!d||d.return_code!==0){panel.innerHTML=`<div class="dp"><span style="color:var(--c-muted);font-size:12px">${L('Brak danych')}</span></div>`;return}
    const al=d.content.A||d.content;
    const members=Array.isArray(d.content.M)?d.content.M:[];
    const sorted=[...members].sort((a,b)=>(b.MP??b.H??0)-(a.MP??a.H??0));
    const stats=[];
    if(al.MP!=null)stats.push({v:fmtN(al.MP),l:'Moc'});
    if(al.CF!=null)stats.push({v:fmtN(al.CF),l:'Punkty chwały'});
    if(al.IS!=null)stats.push({v:al.IS?L('Tak'):L('Nie'),l:'Otwarty'});
    const memberCount=sorted.length||(al.M&&Array.isArray(al.M)?al.M.length:0)||(al.MC??al.NM??0);
    stats.push({v:fmtN(memberCount),l:'Członkowie'});
    if(sorted.length){
      const totalAvp=sorted.reduce((s,m)=>s+(m.AVP??0),0);
      const totalRpt=sorted.reduce((s,m)=>s+(m.RPT??0),0);
      const totalHf=sorted.reduce((s,m)=>s+(m.HF??0),0);
      const totalMp=sorted.reduce((s,m)=>s+(m.MP??0),0);
      if(totalMp>0)stats.push({v:fmtN(Math.round(totalMp/sorted.length)),l:'Śr. moc'});
      if(totalAvp>0)stats.push({v:fmtN(totalAvp),l:'Punkty ataku'});
      if(totalRpt>0)stats.push({v:fmtN(totalRpt),l:'Punkty rabunku'});
      if(totalHf>0)stats.push({v:fmtN(totalHf),l:'Punkty obrony'});
    }
    if(al.D&&al.D!=='Opisz swój sojusz.'){
      const descHtml=al.D.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/&lt;br\s*\/?&gt;/gi,'<br>').replace(/&lt;\/?(b|i|u)&gt;/gi,'');
      stats.push({v:descHtml,l:'Opis',html:true});
    }
    const statHtml=stats.map(st=>{
      if(st.html)return`<div class="db db-plain" style="flex:1 1 200px;min-width:160px"><div class="db-v" style="font-size:12px;font-weight:400;line-height:1.5">${st.v}</div><div class="db-l">${L(st.l)}</div></div>`;
      return`<div class="db db-plain"><div class="db-v">${esc(String(st.v))}</div><div class="db-l">${L(st.l)}</div></div>`;
    }).join('');
    let membersHtml='';
    if(sorted.length){
      membersHtml=`<div style="width:100%;margin-top:10px;border-top:1px solid var(--c-border);padding-top:10px">
        <div style="font-size:10px;font-weight:600;color:var(--c-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">${L('Członkowie ({n})',{n:sorted.length})}</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">
        ${sorted.map(m=>{
          const lvl=m.LL>0?`✦${m.LL}`:(m.L>=70?`✦${m.L}`:(m.L>0?`${m.L}`:'?'));
          return`<div class="db db-plain" style="min-width:0;padding:5px 8px;cursor:pointer" data-search-player="${esc(m.N||'')}">
            <div class="db-v" style="font-size:12px">${esc(m.N||'—')}</div>
            <div class="db-l">Lv ${lvl} · ${fmtN(m.MP??0)}</div>
          </div>`;
        }).join('')}
        </div></div>`;
    }
    const favAl=isFavAl(r.name,S.server);
    panel.innerHTML=`<div class="dp" style="flex-direction:column;gap:8px">
      <div style="display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap">
        <div class="ds">${statHtml}</div>
        <div class="da">
          <button class="btn${favAl?' primary':''}" id="dfaval_${r.rank}">${favAl?L('⭐ Obserwowany'):L('☆ Obserwuj')}</button>
        </div>
      </div>
      ${membersHtml}
    </div>`;
    $(`dfaval_${r.rank}`)?.addEventListener('click',e=>{
      e.stopPropagation();
      toggleFavAl(r.name,S.server,r.allianceId,$(`dfaval_${r.rank}`));
    });
    panel.querySelectorAll('[data-search-player]').forEach(el=>{
      el.addEventListener('click',async e=>{
        e.stopPropagation();
        const name=el.dataset.searchPlayer;if(!name)return;
        S.allianceMode=false;updateTypeSeg();
        validateEv();buildEventSel();
        S.catIdx=0;S.curPage=1;clearExpanded();
        $('searchInput').value=name;
        await loadRanking(name);
      });
    });
  }catch(e){console.warn('renderAllianceDetail:',e);panel.innerHTML=`<div class="dp"><span style="color:var(--c-muted);font-size:12px">${L('Błąd pobierania danych')}</span></div>`}
}

// Close the open detail panel (used by context navigations that change the dataset).
function clearExpanded(){S.expandedRank=null;S.expandedName=null;}

function toggleDetail(rank){
  const r=findRow(rank);if(!r)return;
  const xtr=document.querySelector(`.xr[data-for="${rank}"]`);
  const dtr=document.querySelector(`.dr[data-rk="${rank}"]`);
  if(!xtr)return;
  if(S.expandedRank===rank){xtr.style.display='none';dtr?.classList.remove('exp');S.expandedRank=null;S.expandedName=null;return}
  if(S.expandedRank!=null){
    const px=document.querySelector(`.xr[data-for="${S.expandedRank}"]`);if(px)px.style.display='none';
    document.querySelector(`.dr[data-rk="${S.expandedRank}"]`)?.classList.remove('exp');
  }
  S.expandedRank=rank;S.expandedName=r.name;
  renderDetailContent(rank);
}

// Fill the detail panel for a row (split out of toggleDetail so it can be re-run
// after a re-render to restore the open panel without re-toggling state).
function renderDetailContent(rank){
  const r=findRow(rank);if(!r)return;
  const xtr=document.querySelector(`.xr[data-for="${rank}"]`);
  const dtr=document.querySelector(`.dr[data-rk="${rank}"]`);
  if(xtr)xtr.style.display='';
  dtr?.classList.add('exp');
  const panel=$(`dp_${rank}`);if(!panel)return;
  const game=srvGame(S.server);
  const fv=isFav(r.name,game,S.server);
  if(S.allianceMode){renderAllianceDetail(r,panel);return}
  const stats=[];
  const pn=r.name;
  if(r.honor!=null)stats.push({v:fmtN(r.honor),l:'Honor',link:'honorPoints',mode:'player',search:pn});
  if(r.might!=null)stats.push({v:fmtN(r.might),l:'Moc',link:'playerMight',mode:'player',search:pn});
  if(r.glory!=null)stats.push({v:fmtN(r.glory),l:'Punkty chwały'});
  if(r.legendLevel!=null&&r.legendLevel>0)stats.push({v:'✦ '+r.legendLevel,l:'Poziom legendarny',link:'legendLevel',mode:'player',search:pn});
  else if(r.level!=null&&r.level>=70)stats.push({v:'✦ '+r.level,l:'Poziom legendarny',link:'legendLevel',mode:'player',search:pn});
  else if(r.level!=null&&r.level>0)stats.push({v:'Lv '+r.level,l:'Poziom'});
  if(r.avp!=null)stats.push({v:fmtN(r.avp),l:'Punkty ataku'});
  if(r.hf!=null)stats.push({v:fmtN(r.hf),l:'Punkty obrony'});
  if(r.rpt!=null)stats.push({v:fmtN(r.rpt),l:'Punkty rabunku'});
  if(r.rank2!=null)stats.push({v:fmtN(r.rank2),l:'Ranga'});
  if(r.pre!=null&&r.pre>0)stats.push({v:String(r.pre),l:'Tytuł (prefix)'});
  if(r.suf!=null&&r.suf>0)stats.push({v:String(r.suf),l:'Tytuł (suffix)'});
  if(r.score!=null)stats.push({v:fmtN(r.score),l:'Wynik rankingu'});
  if(r.al)stats.push({v:r.al,l:'Sojusz',link:'allianceHonor',mode:'alliance',search:r.al});
  if(r.members!=null)stats.push({v:fmtN(r.members),l:'Członkowie'});
  const statHtml=stats.map(st=>{
    if(st.link)return`<div class="db" title="${L('Otwórz ranking: {x}',{x:evname(st.link)})}" data-link="${st.link}" data-mode="${st.mode||'player'}" data-search="${esc(st.search||'')}"><div class="db-v">${st.v}</div><div class="db-l">${L(st.l)}</div><div class="db-hint">→ ${evname(st.link)}</div></div>`;
    return`<div class="db db-plain"><div class="db-v">${st.v}</div><div class="db-l">${L(st.l)}</div></div>`;
  }).join('');
  // Mini-sparkline of historical rank (current ranking only)
  const series=getRankSeriesForKey(r.name,histKey(),12);
  const spkHtml=series.length>=2?`
    <div class="spk-wrap" style="width:100%">
      <div class="spk-lbl"><span>${L('📈 Historia pozycji ({n} pkt)',{n:series.length})}</span><span>#${series[0].rk} → #${r.rank}</span></div>
      ${renderSparklineSVG(series)}
    </div>`:'';
  const favObj=S.favs.find(f=>f.name===r.name&&f.game===game&&f.server===S.server);
  const noteHtml=favObj&&favObj.note?`<div class="dnote">📝 ${esc(favObj.note)}</div>`:'';
  panel.innerHTML=`
    <div class="ds">${statHtml||`<span style="color:var(--c-muted);font-size:12px">${L('Brak szczegółowych danych')}</span>`}</div>
    <div class="da">
      <button class="btn${fv?' primary':''}" id="dfav_${rank}">${fv?L('⭐ Obserwowany'):L('☆ Obserwuj')}</button>
      <button class="btn" id="dpng_${rank}">${L('📷 Karta PNG')}</button>
    </div>
    ${noteHtml}
    ${spkHtml}`;
  panel.querySelectorAll('.db[data-link]').forEach(el=>{
    el.addEventListener('click',async()=>{
      const linkKey=el.dataset.link,linkMode=el.dataset.mode,searchVal=el.dataset.search;
      const isAl=linkMode==='alliance';
      if(isAl!==S.allianceMode){
        S.allianceMode=isAl;
        const pair=S.events.player_to_alliance?.find(e=>e[+!isAl]===S.eventKey);
        if(pair)S.eventKey=pair[+isAl];
        updateTypeSeg();buildEventSel();
      }
      if(evList()[linkKey]){S.eventKey=linkKey;buildEventSel();}
      S.catIdx=0;S.curPage=1;clearExpanded();
      if(searchVal){$('searchInput').value=searchVal;await loadRanking(searchVal)}
      else{$('searchInput').value='';await loadRanking('1')}
    });
  });
  $(`dfav_${rank}`)?.addEventListener('click',e=>{
    e.stopPropagation();toggleFav(r.name,game,S.server,null);
    const btn=$(`dfav_${rank}`);if(btn){const now=isFav(r.name,game,S.server);btn.textContent=now?L('⭐ Obserwowany'):L('☆ Obserwuj');btn.classList.toggle('primary',now)}
  });
  $(`dpng_${rank}`)?.addEventListener('click',e=>{e.stopPropagation();exportPlayerCard(r)});
}

function renderSparklineSVG(series,w=240,h=40){
  if(series.length<2)return`<div class="spk-empty">${L('Za mało danych historycznych')}</div>`;
  const ranks=series.map(s=>s.rk);
  const min=Math.min(...ranks),max=Math.max(...ranks);
  const range=max-min||1;
  const pad=3;
  const points=series.map((s,i)=>{
    const x=pad+(i/(series.length-1))*(w-pad*2);
    const y=pad+((s.rk-min)/range)*(h-pad*2);
    return[x.toFixed(1),y.toFixed(1)];
  });
  const last=points[points.length-1];
  const polyPts=points.map(p=>p.join(',')).join(' ');
  return`<svg class="spk" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="height:${h}px">
    <polyline class="spk-line" points="${polyPts}"/>
    <circle class="spk-dot" cx="${last[0]}" cy="${last[1]}" r="2.5"/>
  </svg>`;
}

function renderPg(){
  const pg=$('pgBar');
  const filt=filterActive()&&S.filtered;
  const totalItems=filt?S.filtered.length:S.totalRows;
  const total=Math.max(1,Math.ceil(totalItems/S.pageSize));
  if(total<=1){pg.style.display='none';return}
  pg.style.display='flex';
  const cur=S.curPage;
  let h=`<button class="pgb" onclick="goPage(1)" ${cur===1?'disabled':''} aria-label="${L('Pierwsza strona')}">«</button>`;
  h+=`<button class="pgb" onclick="goPage(${cur-1})" ${cur===1?'disabled':''} aria-label="${L('Poprzednia')}">‹</button>`;
  const s=Math.max(1,cur-2),e=Math.min(total,cur+2);
  if(s>1)h+=`<span class="pgi">…</span>`;
  for(let i=s;i<=e;i++)h+=`<button class="pgb${i===cur?' cur':''}" onclick="goPage(${i})" aria-label="${L('Strona {i}',{i})}">${i}</button>`;
  if(e<total)h+=`<span class="pgi">…</span>`;
  h+=`<button class="pgb" onclick="goPage(${cur+1})" ${cur===total?'disabled':''} aria-label="${L('Następna')}">›</button>`;
  h+=`<button class="pgb" onclick="goPage(${total})" ${cur===total?'disabled':''} aria-label="${L('Ostatnia')}">»</button>`;
  if(total>5)h+=`<input type="number" id="pgJump" class="pgjump" min="1" max="${total}" placeholder="${L('Skocz do strony')}" aria-label="${L('Skocz do strony')}" title="${L('Skocz do strony')}">`;
  h+=`<span class="pgi">${L('Str. {cur} z {total} · {n} {kind}',{cur,total,n:fmtN(totalItems),kind:filt?L('po filtrach'):L('graczy')})}</span>`;
  pg.innerHTML=h;
  const jump=$('pgJump');
  if(jump)jump.addEventListener('keydown',ev=>{if(ev.key==='Enter'){const v=Math.min(total,Math.max(1,+jump.value||1));goPage(v)}});
}

// ── Event select & cats ──
function buildEventSel(){
  const sel=$('eventSelect');const list=evList();const keys=Object.keys(list);
  if(!keys.length){sel.innerHTML=`<option>${L('Brak')}</option>`;return}
  sel.innerHTML=keys.map(k=>`<option value="${k}">${evname(k)}</option>`).join('');
  if(!(S.eventKey in list))S.eventKey=keys[0];
  sel.value=S.eventKey;buildCats();
}
function buildCats(){
  const cb=$('catBar');const cats=curEv().categories;
  if(!cats?.length||cats.length<=1){cb.style.display='none';return}
  cb.style.display='flex';
  cb.innerHTML=cats.map((c,i)=>{const n=catname(c);return n?`<button class="cat${i===S.catIdx?' on':''}" data-i="${i}">${n}</button>`:''}).join('');
  cb.querySelectorAll('.cat').forEach(el=>el.addEventListener('click',async()=>{S.catIdx=+el.dataset.i;S.curPage=1;clearExpanded();buildCats();await reloadCtx()}));
}
function updateTypeSeg(){
  $('typeSeg').querySelectorAll('.seg-b').forEach(b=>{
    const active=b.dataset.v===(S.allianceMode?'alliance':'player');
    b.classList.toggle('on',active);
    b.setAttribute('aria-selected',active);
  });
}

// ── Favorites ──
function updFavCnt(){const n=S.favs.length+S.favAls.length;$('favCnt').textContent=n;$('favBtn').classList.toggle('primary',n>0)}
function isFavAl(name,server){return S.favAls.some(f=>f.name===name&&f.server===server)}
function saveFavAls(){localStorage.setItem('gge_favAls_v1',JSON.stringify(S.favAls))}
function toggleFavAl(name,server,allianceId,btn){
  if(isFavAl(name,server)){
    S.favAls=S.favAls.filter(f=>!(f.name===name&&f.server===server));
    toast(L('Usunięto sojusz z obserwowanych'));
  }else{
    S.favAls.push({name,server,allianceId,game:srvGame(server)});
    toast(L('Obserwujesz sojusz {n} ⭐',{n:name}),'success');
  }
  saveFavAls();updFavCnt();
  if(btn){const now=isFavAl(name,server);btn.textContent=now?L('⭐ Obserwowany'):L('☆ Obserwuj');btn.classList.toggle('primary',now)}
}
function toggleFav(name,game,server,tr){
  if(isFav(name,game,server)){S.favs=S.favs.filter(f=>!(f.name===name&&f.game===game&&f.server===server));toast(L('Usunięto z obserwowanych'))}
  else{S.favs.push({name,game,server});toast(L('Obserwujesz {n} ⭐',{n:name}),'success')}
  saveFavs();updFavCnt();
  document.querySelectorAll(`.sb[data-n="${esc(name)}"]`).forEach(b=>{b.classList.toggle('on',isFav(name,game,server));b.textContent=isFav(name,game,server)?'⭐':'☆'});
  if(tr)tr.classList.toggle('fav',isFav(name,game,server));
}

function renderFavPage(){
  const grid=$('favGrid');
  if(!S.favs.length&&!S.favAls.length){grid.innerHTML=`<div class="fe">${L('Brak obserwowanych graczy i sojuszów.<br>Kliknij ☆ przy dowolnym graczu lub sojuszu.')}</div>`;return}
  grid.innerHTML='';
  S.favs.forEach(fav=>{
    const card=document.createElement('div');card.className='fc';
    const si=srvInfo(fav.server);
    const label=si?`${si.flag} ${si.name}`:fav.server;
    const cid='fr_'+fav.name.replace(/\W/g,'_');
    const spkId='spk_'+fav.name.replace(/\W/g,'_')+'_'+fav.server;
    card.innerHTML=`<div class="fch"><div><div class="fcn">👤 ${esc(fav.name)}</div><div class="fcm">${esc(label)}</div></div><button class="fcd" data-n="${esc(fav.name)}" data-g="${fav.game}" data-s="${fav.server}" aria-label="${L('Usuń')}">×</button></div>
      <div class="frr" id="${cid}"><div class="fr"><span class="fl">${L('⏳ Pobieranie...')}</span></div></div>
      <input type="text" class="fnote" placeholder="${L('Notatka (np. wróg / sojusznik / cel)')}" value="${esc(fav.note||'')}" aria-label="${L('Notatka (np. wróg / sojusznik / cel)')}">
      <div id="${spkId}"></div>`;
    card.querySelector('.fcd').addEventListener('click',function(){S.favs=S.favs.filter(f=>!(f.name===this.dataset.n&&f.game===this.dataset.g&&f.server===this.dataset.s));saveFavs();updFavCnt();renderFavPage();toast(L('Usunięto'))});
    const noteEl=card.querySelector('.fnote');
    if(noteEl)noteEl.addEventListener('change',()=>{fav.note=noteEl.value.trim();saveFavs()});
    grid.appendChild(card);
    loadFavRanks(fav,card,spkId);
  });
  S.favAls.forEach(fav=>{
    const card=document.createElement('div');card.className='fc';
    const si=srvInfo(fav.server);
    const label=si?`${si.flag} ${si.name}`:fav.server;
    const cid='fral_'+fav.name.replace(/\W/g,'_');
    card.innerHTML=`<div class="fch"><div><div class="fcn">🛡 ${esc(fav.name)}</div><div class="fcm">${esc(label)}</div></div><button class="fcd" data-n="${esc(fav.name)}" data-s="${fav.server}" aria-label="${L('Usuń')}">×</button></div><div class="frr" id="${cid}"><div class="fr"><span class="fl">${L('⏳ Pobieranie...')}</span></div></div>`;
    card.querySelector('.fcd').addEventListener('click',function(){S.favAls=S.favAls.filter(f=>!(f.name===this.dataset.n&&f.server===this.dataset.s));saveFavAls();updFavCnt();renderFavPage();toast(L('Usunięto'))});
    grid.appendChild(card);
    loadFavAlStats(fav,card,cid);
  });
}

async function loadFavAlStats(fav,card,cid){
  const el=card.querySelector('#'+CSS.escape(cid));if(!el)return;
  try{
    const url=`${GGE_API}/${fav.server}/ain/%22AID%22:${fav.allianceId}`;
    const d=await ggeGet(url);
    if(!el.isConnected)return;
    if(!d||d.return_code!==0){el.innerHTML=`<div class="fr"><span class="fl" style="color:var(--c-muted)">${L('Brak danych')}</span></div>`;return}
    const al=d.content.A||d.content;
    const members=Array.isArray(d.content.M)?d.content.M:[];
    const rows=[];
    if(al.MP!=null)rows.push({l:'Moc',v:fmtN(al.MP)});
    if(al.CF!=null)rows.push({l:'Punkty chwały',v:fmtN(al.CF)});
    rows.push({l:'Członkowie',v:fmtN(members.length)});
    el.innerHTML=rows.map(r=>`<div class="fr"><span class="fl">${L(r.l)}</span><span class="fp2">${r.v}</span></div>`).join('');
  }catch{
    if(el.isConnected)el.innerHTML=`<div class="fr"><span class="fl" style="color:var(--c-muted)">${L('Błąd')}</span></div>`;
  }
}

async function loadFavRanks(fav,card,spkId){
  const cid='fr_'+fav.name.replace(/\W/g,'_');const el=card.querySelector('#'+CSS.escape(cid));if(!el)return;
  const evs=S.events?.player||{};const res=[];
  for(const[key,ev]of Object.entries(evs)){
    if(!ev.id)continue;
    try{
      const url=ggeUrl(fav.server,ev.id,fav.name,'');
      const d=await ggeGet(url);
      if(d?.return_code==0&&d.content?.L?.length){
        const f=d.content.L.find(p=>Array.isArray(p)&&(p[2]?.N||'').toLowerCase()===fav.name.toLowerCase());
        if(f)res.push({key,rank:f[0],score:f[1]});
      }
    }catch{}
  }
  if(!el.isConnected)return;
  el.innerHTML=res.length?res.map(r=>`<div class="fr"><span class="fl">${esc(evname(r.key))}</span><span class="fp2${r.rank<=3?' g':''}">#${r.rank}</span><span class="fs">${fmtN(r.score)}</span></div>`).join('')
    :`<div class="fr"><span class="fl" style="color:var(--c-muted)">${L('Nie znaleziono')}</span></div>`;
  // Sparkline (best key for this player)
  const spkEl=card.querySelector('#'+CSS.escape(spkId));
  if(spkEl){
    const series=getBestRankSeries(fav.name,fav.server,12);
    if(series.length>=2){
      spkEl.innerHTML=`<div class="spk-wrap">
        <div class="spk-lbl"><span>📈 Historia (${series.length} pkt)</span><span>#${series[0].rk} → #${series[series.length-1].rk}</span></div>
        ${renderSparklineSVG(series,260,32)}
      </div>`;
    }
  }
}

// ── Export ──
function downloadFile(name,content,type){
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},100);
  toast(L('📥 Pobrano {name}',{name}),'success');
}
function exportData(fmt){
  const rows=visibleRows();
  if(!rows.length){toast(L('Brak danych do eksportu'),'error');return}
  const stamp=new Date().toISOString().slice(0,16).replace(/[T:]/g,'-');
  const srv=srvInfo(S.server)?.code||S.server;
  const baseName=`gge_${srv}_${S.eventKey}_p${S.curPage}_${stamp}`;
  if(fmt==='csv'){
    const headers=S.allianceMode
      ?['rank','name','allianceId','members','score']
      :['rank','name','al','alTag','members','score','honor','might','glory','level','legendLevel','avp','hf','rpt'];
    const csv=[headers.join(',')];
    rows.forEach(r=>{
      const cells=headers.map(h=>{
        const v=r[h]??'';const s=String(v);
        return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;
      });
      csv.push(cells.join(','));
    });
    downloadFile(`${baseName}.csv`,csv.join('\n'),'text/csv;charset=utf-8');
  }else if(fmt==='json'){
    const data={
      server:srv,serverName:srvInfo(S.server)?.name,game:srvGame(S.server),
      event:S.eventKey,eventName:evname(S.eventKey),category:catname(curCat()),
      type:S.allianceMode?'alliance':'player',
      page:S.curPage,total:S.totalRows,
      timestamp:new Date().toISOString(),
      filters:S.filter,
      rows
    };
    downloadFile(`${baseName}.json`,JSON.stringify(data,null,2),'application/json');
  }else if(fmt==='link'){
    writeHash();
    setTimeout(()=>{
      const url=location.href;
      if(navigator.clipboard?.writeText){
        navigator.clipboard.writeText(url).then(()=>toast(L('🔗 Link skopiowany do schowka'),'success')).catch(()=>toast(L('Skopiuj URL ręcznie'),'error'));
      }else toast(L('Skopiuj URL ręcznie'),'error');
    },200);
  }
}

// ── Export player card as a PNG image (nicer than a link for Discord) ──
function _rr(ctx,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
function _fit(ctx,text,maxW){
  text=String(text);
  if(ctx.measureText(text).width<=maxW)return text;
  let t=text;
  while(t.length>1&&ctx.measureText(t+'…').width>maxW)t=t.slice(0,-1);
  return t+'…';
}
function exportPlayerCard(r){
  const FONT=`-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif`;
  const dark=S.theme!=='light';
  const C=dark
    ?{bg:'#0d1117',surface:'#161b22',border:'#30363d',bright:'#e6edf3',muted:'#8b949e',blue:'#58a6ff'}
    :{bg:'#ffffff',surface:'#f6f8fa',border:'#d0d7de',bright:'#0d1117',muted:'#656d76',blue:'#0969da'};
  const W=640,H=360,scale=2;
  const cv=document.createElement('canvas');cv.width=W*scale;cv.height=H*scale;
  const ctx=cv.getContext('2d');if(!ctx){toast(L('Brak danych do eksportu'),'error');return}
  ctx.scale(scale,scale);ctx.textBaseline='alphabetic';
  ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,H);
  ctx.fillStyle=C.blue;ctx.fillRect(0,0,W,6);
  ctx.fillStyle=C.muted;ctx.font=`600 14px ${FONT}`;ctx.textAlign='left';
  ctx.fillText('🏰 GGE Rankings',24,40);
  const srv=srvInfo(S.server);
  ctx.textAlign='right';ctx.font=`13px ${FONT}`;
  ctx.fillText(_fit(ctx,srv?`${srv.flag} ${srv.name}`:S.server,260),W-24,40);
  ctx.textAlign='left';ctx.fillStyle=C.bright;ctx.font=`700 30px ${FONT}`;
  ctx.fillText(_fit(ctx,r.name,W-220),24,92);
  ctx.fillStyle=C.blue;ctx.font=`600 14px ${FONT}`;
  const catTxt=catname(curCat());
  ctx.fillText(_fit(ctx,evname(S.eventKey)+(catTxt?` · ${catTxt}`:''),W-220),24,118);
  const medal=r.rank===1?'#f0c030':r.rank===2?'#b0b8c8':r.rank===3?'#c07828':C.bright;
  ctx.textAlign='right';ctx.fillStyle=medal;ctx.font=`800 56px ${FONT}`;
  ctx.fillText('#'+r.rank,W-24,100);ctx.textAlign='left';
  ctx.strokeStyle=C.border;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(24,140);ctx.lineTo(W-24,140);ctx.stroke();
  const stats=[[L('Wynik'),fmtN(r.score)]];
  if(r.honor!=null)stats.push(['Honor',fmtN(r.honor)]);
  if(r.might!=null)stats.push([L('Moc'),fmtN(r.might)]);
  if(r.legendLevel>0)stats.push([L('Poziom legendarny'),'✦ '+r.legendLevel]);
  else if(r.level!=null)stats.push([L('Poziom'),fmtN(r.level)]);
  if(r.glory!=null)stats.push([L('Punkty chwały'),fmtN(r.glory)]);
  if(r.al)stats.push([L('Sojusz'),r.al]);
  const cells=stats.slice(0,6),cols=3,gap=12,gx=24,gy=160,bw=(W-gx*2-gap*(cols-1))/cols,bh=78;
  cells.forEach((st,i)=>{
    const cx=gx+(i%cols)*(bw+gap),cy=gy+Math.floor(i/cols)*(bh+gap);
    ctx.fillStyle=C.surface;_rr(ctx,cx,cy,bw,bh,8);ctx.fill();
    ctx.strokeStyle=C.border;ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle=C.muted;ctx.font=`600 10px ${FONT}`;ctx.textAlign='left';
    ctx.fillText(_fit(ctx,String(st[0]).toUpperCase(),bw-24),cx+12,cy+26);
    ctx.fillStyle=C.bright;ctx.font=`700 22px ${FONT}`;
    ctx.fillText(_fit(ctx,String(st[1]),bw-24),cx+12,cy+56);
  });
  ctx.fillStyle=C.muted;ctx.font=`12px ${FONT}`;ctx.textAlign='right';
  ctx.fillText(new Date().toLocaleString(curLocale()),W-24,H-16);
  ctx.textAlign='left';ctx.fillStyle=C.blue;ctx.font=`600 12px ${FONT}`;
  ctx.fillText('dolildev.github.io/gge-rankings',24,H-16);
  cv.toBlob(blob=>{
    if(!blob){toast(L('Brak danych do eksportu'),'error');return}
    const safe=r.name.replace(/[^\w-]+/g,'_').slice(0,40)||'player';
    downloadFile(`gge_${safe}_${new Date().toISOString().slice(0,10)}.png`,blob,'image/png');
  },'image/png');
}

// ── Auto-refresh ──
let _arTimer=null,_arCount=0;
function fmtCountdown(s){const m=Math.floor(s/60),ss=s%60;return m?`${m}:${String(ss).padStart(2,'0')}`:`${s}s`}
function stopAutoRef(){if(_arTimer)clearInterval(_arTimer);_arTimer=null;$('sAutoR').style.display='none'}
function startAutoRef(){
  stopAutoRef();
  if(!S.autoRef)return;
  _arCount=S.autoRef;
  $('sAutoR').style.display='';
  $('sAutoRT').textContent=fmtCountdown(_arCount);
  _arTimer=setInterval(()=>{
    _arCount--;
    $('sAutoRT').textContent=fmtCountdown(_arCount);
    if(_arCount<=0){_arCount=S.autoRef;if(filterActive()){reloadCtx()}else{const sv=S.lastSearch||String((S.curPage-1)*S.pageSize+1);loadRanking(sv)}}
  },1000);
}
function updateAutoRefUI(){
  $('autoRefBtn').classList.toggle('on',S.autoRef>0);
  $('autoRefBtn').textContent=S.autoRef>0?`⏱ ${fmtCountdown(S.autoRef)}`:'⏱ Auto';
  $('autoRefDrop').querySelectorAll('.mini-opt').forEach(o=>o.classList.toggle('on',+o.dataset.v===S.autoRef));
}

// ── Filters ──
function setupFilters(){
  $('filterBtn').addEventListener('click',()=>{
    const bar=$('fBar');
    const hiding=!bar.classList.contains('h');
    bar.classList.toggle('h');
    $('filterBtn').setAttribute('aria-expanded',!hiding);
    $('filterBtn').classList.toggle('on',!hiding);
  });
  $('fAlSeg').querySelectorAll('.seg-b').forEach(b=>b.addEventListener('click',()=>{
    $('fAlSeg').querySelectorAll('.seg-b').forEach(x=>x.classList.remove('on'));
    b.classList.add('on');
    S.filter.alliance=b.dataset.f;
    S.curPage=1;runFilter();
  }));
  let _fdeb;
  const debFilter=()=>{clearTimeout(_fdeb);_fdeb=setTimeout(()=>{S.curPage=1;runFilter()},300)};
  $('fAlName').addEventListener('input',()=>{S.filter.alName=$('fAlName').value.trim();debFilter()});
  $('fMinScore').addEventListener('input',()=>{S.filter.minScore=+$('fMinScore').value||0;debFilter()});
  $('fClear').addEventListener('click',()=>{
    resetFilterUI();
    S.curPage=1;clearExpanded();loadRanking('1');
  });
}

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

const doSearch=async()=>{const v=$('searchInput').value.trim();if(!v)return;if(filterActive())resetFilterUI();S.curPage=1;clearExpanded();await loadRanking(v)};
$('goSearch').addEventListener('click',doSearch);
$('searchInput').addEventListener('keydown',e=>{if(e.key==='Enter')doSearch()});
$('refreshBtn').addEventListener('click',()=>{S.curPage=1;reloadCtx()});

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
