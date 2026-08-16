// gge-rankings — config.js (split from app.js; classic script, shared global scope).
// Load order: config → i18n → state → api → render → features → main. All wiring + init() live in main.js (loaded last).

// ══════════════════════════════════════════════════════════════
//  GGE Rankings — full app
// ══════════════════════════════════════════════════════════════

// ── Config ──
const GGE_API = 'https://empire-api.fly.dev';
// gge-tracker public API (https://docs.gge-tracker.com) — used to list alliance members.
// Server is selected via the `gge-server` request header (CORS-enabled, allows that header).
const GGE_TRACKER_API = 'https://api.gge-tracker.com/api/v1';
const EVENTS_URL = game => `https://raw.githubusercontent.com/danadum/ggs-assets/main/${game}/events.json`;
const TEXTS_URL = lang => `https://translations-api-test.public.ggs-ep.com/12/${lang}`;
const API_PAGE = 10; // GGE highscore endpoint returns 10 entries per request; the UI page size is S.pageSize
const FILTER_POOL_MAX = 2000;
// Requests in flight while assembling the filter/synthetic-ranking pool. Measured against
// empire-api: 2000 rows take ~2.0s at 10 and ~0.9s at 20, with no sign of throttling.
const FILTER_FETCH_CONC = 20;
// Shared budget for the favourites page. Each card looks the player up in ~25 ranking boards,
// so without a cap a dozen cards would fire hundreds of requests at once.
const FAV_FETCH_CONC = 12;
const MAX_COMPARE = 4;
const HIST_MAX_PER_PLAYER = 12;

// Per-snapshot stat values kept alongside rank/score, so the detail panel can chart any stat and
// not just the position. History lives in localStorage under a quota, hence the one-letter keys.
// field (a parsed row property, see parseRows) → storage key.
const HIST_FIELDS = {
  honor:'h', might:'m', glory:'g', level:'l', legendLevel:'n',
  avp:'a', hf:'d', rpt:'p', rank2:'r', pre:'x', suf:'y', members:'c',
};
// Stats the detail-panel chart can draw. Key = row field ('rank' and 'score' come straight from
// the snapshot, the rest from HIST_FIELDS); `lower` marks metrics where a smaller number is
// better, so the line still reads "up = improving". Order is the fallback order when the default
// metric has no history yet.
const CHART_METRICS = {
  might:{l:'Moc'}, honor:{l:'Honor'}, glory:{l:'Punkty chwały'},
  score:{l:'Wynik rankingu'}, rank:{l:'Pozycja',lower:true},
  legendLevel:{l:'Poziom legendarny'}, level:{l:'Poziom'},
  avp:{l:'Punkty ataku'}, hf:{l:'Najwyższa chwała'}, rpt:{l:'Punkty rabunku'},
  rank2:{l:'Ranga',lower:true}, pre:{l:'Tytuł (prefix)'}, suf:{l:'Tytuł (suffix)'},
  members:{l:'Członkowie'},
};
const DEFAULT_CHART_METRIC = 'might';
// How long the pointer must rest on a tile/row before the chart switches to it. The tiles form a
// grid, so reaching the chart means sweeping across their neighbours — without a dwell the chart
// would end up showing whichever one the pointer happened to cross last.
const HOVER_DWELL_MS = 160;

// ── Backfill from gge-tracker ──
// The app's own history only starts when you first open a ranking. gge-tracker keeps up to a year
// of point history per player, so charts for the metrics below can be filled in from it.
// Only these exist there — honor, fame, attack, loot points, level and *position* have no series,
// and stay dependent on locally collected snapshots.
const GGT_HISTORY_DAYS = 365;
const GGT_HISTORY_POINTS = 40;      // downsampled target: a 240px sparkline can't show 8000 points
const GGT_HISTORY_TTL = 10 * 60 * 1000;
// Detail-panel chart metric (CHART_METRICS key) → gge-tracker series.
const GGT_METRIC_HISTORY = {
  might:'player_might_history',
};
// Ranking key → gge-tracker series, used for the "Wynik rankingu" metric while that board is open.
// Verified against live data: nobility/loot. The event series are matched by name because those
// boards were inactive (empty lists) when this was written, so they could not be checked against
// live scores — the two Berimond ones are the pair most worth re-checking during an event.
const GGT_EVENT_HISTORY = {
  dialog_BeggingKnights_nobilityPoints:'player_loot_history',
  event_title_72:'player_event_nomad_history',
  event_title_80:'player_event_samurai_history',
  event_title_71:'player_event_war_realms_history',
  dialog_redAlienInvasion_message_header:'player_event_bloodcrow_history',
  event_title_3:'player_event_berimond_kingdom_history',
  event_title_85:'player_event_berimond_invasion_history',
};
// Favourite cards chart a position-in-ranking history rather than a stat, so their default is the
// Might *ranking* — the counterpart of DEFAULT_CHART_METRIC over there.
const DEFAULT_FAV_CHART_EVENT = 'playerMight';
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
  honorPoints:'Honor', playerMight:'Moc', playerGlory:'Chwała', legendLevel:'Poziom legendy',
  playerAttack:'Punkty ataku', playerHighestFame:'Najwyższa chwała', playerLoot:'Punkty rabunku',
  allianceHonor:'Honor sojuszu', allianceMight:'Siła sojuszu',
  dominionPoints:'Dominium', cargo_points:'Karawan',
  event_title_71:'Turniej 71', event_title_72:'Turniej 72',
  event_title_80:'Wydarzenie 80', event_title_85:'Wydarzenie 85',
  event_title_89:'Wydarzenie 89', event_title_113:'Wydarzenie 113',
  event_title_127:'Wydarzenie 127', event_title_128:'Wydarzenie 128',
  event_title_130:'Wydarzenie 130', event_title_131:'Królewski bankiet',
  event_title_134:'Wydarzenie 134', event_title_601:'Liga',
  event_title_3:'Frakcje', event_title_60:'Wyd. 60 (poziom)',
  event_title_97:'Wydarzenie 97',
  dialog_redAlienInvasion_message_header:'Inwazja Obcych',
  dialog_BeggingKnights_nobilityPoints:'Żebracy',
  dialog_longPointsEvent_seasonalPoints:'Sezonowy',
  eventBuilding_DonationEvent:'Donacje',
};

// Rankings that should remain available even when the remote event catalogue lags behind the game.
// LT 85 is the Anniversary Gacha leaderboard ("Królewski bankiet" / "King's Banquet").
const REQUIRED_GGE_PLAYER_EVENTS = {
  event_title_131:{id:85,categories:[{id:1,name:'dialog_ci_filter01_all'}]},
};

// Client-side ("synthetic") player rankings. GGE publishes no leaderboard for these fields, but
// every row of the nobility board carries them, so we pool that board and re-sort by the field.
// `key` is the ranking id used in the sidebar/hash, `field` a parsed row property (see parseRows).
// Order here is the order they appear in the sidebar, right after Might.
const SYNTHETIC_PLAYER_EVENTS = [
  {key:'playerGlory',   field:'glory'},
  {key:'playerAttack',  field:'avp'},
  {key:'playerHighestFame', field:'hf'},
  {key:'playerLoot',    field:'rpt'},
];
