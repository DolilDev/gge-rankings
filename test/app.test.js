const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const source=name=>fs.readFileSync(path.join(root,name),'utf8');

function storage(values={}){
  const data=new Map(Object.entries(values));
  return{
    getItem:key=>data.has(key)?data.get(key):null,
    setItem:(key,value)=>data.set(key,String(value)),
    removeItem:key=>data.delete(key)
  };
}

function stateContext(values={},hash=''){
  const context={
    localStorage:storage(values),
    document:{getElementById:()=>null,documentElement:{}},
    location:{hash},history:{replaceState(){}},
    URLSearchParams,console,setTimeout,clearTimeout
  };
  vm.createContext(context);
  vm.runInContext(`${source('config.js')}\n${source('state.js')}\nglobalThis.testApi={S,esc,readHash,pageForRank};`,context);
  return context.testApi;
}

test('invalid persisted state falls back to safe defaults',()=>{
  const {S}=stateContext({
    gge_favs_v7:'{broken',gge_favAls_v1:'not json',server:'unknown',
    gge_theme:'neon',gge_lang:'xx',gge_pagesize:'999',gge_autoref:'7'
  });
  assert.deepEqual(Array.from(S.favs),[]);
  assert.deepEqual(Array.from(S.favAls),[]);
  assert.equal(S.server,'EmpireEx_5');
  assert.equal(S.theme,'dark');
  assert.equal(S.lang,'pl');
  assert.equal(S.pageSize,10);
  assert.equal(S.autoRef,0);
});

test('URL state rejects negative pages and categories',()=>{
  const {readHash}=stateContext({},'#p=-4&c=-2&q='+encodeURIComponent('x'.repeat(150)));
  const parsed=readHash();
  assert.equal(parsed.page,0);
  assert.equal(parsed.cat,null);
  assert.equal(parsed.q.length,100);
});

test('escaping preserves zero and page calculation contains a searched rank',()=>{
  const {esc,pageForRank}=stateContext();
  assert.equal(esc(0),'0');
  assert.equal(esc('<img src=x>'),'&lt;img src=x&gt;');
  assert.equal(pageForRank(42,10),5);
  assert.equal(pageForRank(-10,10),1);
});

function scriptApi(file,exports,extra={}){
  const context={console,setTimeout,clearTimeout,window:{},...extra};
  vm.createContext(context);
  vm.runInContext(`${source(file)}\nglobalThis.testApi={${exports.join(',')}};`,context);
  return context.testApi;
}

test('ranking parser normalizes numeric API fields',()=>{
  const {parseRows}=scriptApi('api.js',['parseRows'],{S:{allianceMode:false}});
  const result=parseRows({return_code:0,content:{L:[
    [1,'200',{N:'Player',AN:'<b>Alliance</b>',MP:'oops',H:'15'}],
    [0,2,'180',{N:'Shifted row'}]
  ]}});
  assert.equal(result.rows[0].score,200);
  assert.equal(result.rows[0].honor,15);
  assert.equal(result.rows[0].might,null);
  assert.equal(result.rows[0].al,'<b>Alliance</b>');
  assert.equal(result.rows[1].rank,2);
  assert.equal(result.rows[1].score,180);
});

test('Anniversary Gacha ranking is available when the remote catalogue lags behind',()=>{
  const context={
    console,setTimeout,clearTimeout,window:{},
    S:{server:'EmpireEx_5',events:{player:{honorPoints:{id:5}}}},
    srvGame:()=> 'gge'
  };
  vm.createContext(context);
  vm.runInContext(`${source('config.js')}\n${source('api.js')}\ninjectRequiredGgeEvents();`,context);
  assert.equal(context.S.events.player.event_title_131.id,85);
  assert.equal(context.S.events.player.event_title_131.categories[0].id,1);
});

test('tracked players outside the visible page are included in snapshots',async()=>{
  const context={
    console,setTimeout,clearTimeout,window:{},
    S:{server:'EmpireEx_5',allianceMode:false,favs:[{name:'Tracked',game:'gge',server:'EmpireEx_5'}]},
    srvGame:()=> 'gge',
    fetchRankingStub:async name=>({return_code:0,content:{L:[[11,900,{N:name}]]}})
  };
  vm.createContext(context);
  vm.runInContext(`${source('api.js')}\nfetchRanking=globalThis.fetchRankingStub;globalThis.testFn=rowsWithTrackedFavorites;`,context);
  const rows=await context.testFn([{rank:1,score:1000,name:'Leader'}]);
  assert.deepEqual(Array.from(rows,row=>row.name),['Leader','Tracked']);
  assert.equal(rows[1].rank,11);
});

test('CSV cells neutralize formulas and quote delimiters',()=>{
  const {csvCell}=scriptApi('features.js',['csvCell']);
  assert.equal(csvCell('=2+2'),"'=2+2");
  assert.equal(csvCell('  @SUM(A1)'),"'  @SUM(A1)");
  assert.equal(csvCell('a,b'),'"a,b"');
  assert.equal(csvCell('normal'),'normal');
});

test('service worker only deletes caches owned by this app',async()=>{
  const handlers={};const deleted=[];
  const version=source('sw.js').match(/const VERSION = '([^']+)'/)[1];
  const context={
    URL,Response,
    self:{location:{origin:'https://example.test'},addEventListener:(name,handler)=>{handlers[name]=handler},skipWaiting(){},clients:{claim(){}}},
    caches:{keys:async()=>['gge-old','other-app',`gge-${version}`],delete:async key=>{deleted.push(key)}},
    fetch:async()=>{throw new Error('unused')}
  };
  vm.createContext(context);vm.runInContext(source('sw.js'),context);
  let activation;handlers.activate({waitUntil:promise=>{activation=promise}});
  await activation;
  assert.deepEqual(deleted,['gge-old']);
});

test('HTML asset version matches the service worker cache version',()=>{
  const version=source('sw.js').match(/const VERSION = '([^']+)'/)[1];
  const html=source('index.html');
  const assetVersions=[...html.matchAll(/[?&]v=([^"&]+)/g)].map(match=>match[1]);
  assert.ok(assetVersions.length>0);
  assert.deepEqual([...new Set(assetVersions)],[version]);
});

test('synthetic player rankings are injected after Might so every stat has a board to link to',()=>{
  const context={
    console,setTimeout,clearTimeout,window:{},
    S:{server:'EmpireEx_5',events:{player:{
      honorPoints:{id:5},playerMight:{id:6},dialog_BeggingKnights_nobilityPoints:{id:2},legendLevel:{id:7}
    }}},
    srvGame:()=> 'gge'
  };
  vm.createContext(context);
  vm.runInContext(`${source('config.js')}\n${source('api.js')}\ninjectSyntheticEvents();`,context);
  const player=context.S.events.player;
  assert.deepEqual(Object.keys(player),
    ['honorPoints','playerMight','playerGlory','playerAttack','playerDefense','playerLoot',
     'dialog_BeggingKnights_nobilityPoints','legendLevel']);
  assert.deepEqual(
    ['playerGlory','playerAttack','playerDefense','playerLoot'].map(key=>player[key].synthetic),
    ['glory','avp','hf','rpt']);
  // The base board supplies the pool every synthetic ranking is sorted from.
  assert.equal(player.playerAttack.id,2);
});

test('a real catalogue entry is never replaced by a synthetic one',()=>{
  const context={
    console,setTimeout,clearTimeout,window:{},
    S:{server:'EmpireEx_5',events:{player:{playerMight:{id:6},playerAttack:{id:99,categories:[{id:1}]}}}},
    srvGame:()=> 'gge'
  };
  vm.createContext(context);
  vm.runInContext(`${source('config.js')}\n${source('api.js')}\ninjectSyntheticEvents();`,context);
  assert.equal(context.S.events.player.playerAttack.id,99);
  assert.equal(context.S.events.player.playerAttack.synthetic,undefined);
});

function tileApi(events){
  const context={
    console,setTimeout,clearTimeout,window:{},
    S:{events,eventKey:'honorPoints',allianceMode:false},
    L:s=>s,esc:v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'),
    evname:k=>k,ico:()=> '',fmtN:v=>String(v),fmtHistTime:t=>'t'+t
  };
  vm.createContext(context);
  vm.runInContext(`${source('render.js')}\nglobalThis.testApi={statTilesHtml,levelCatIdx,renderSparklineSVG,spkAxisHtml};`,context);
  return context.testApi;
}

test('stat tiles only link to rankings the current catalogue actually has',()=>{
  const {statTilesHtml}=tileApi({player:{honorPoints:{id:5}},alliance:{allianceHonor:{id:10}}});
  const html=statTilesHtml([
    {v:'3478',l:'Honor',link:'honorPoints',mode:'player',search:'Deyss_'},
    {v:'90440',l:'Punkty ataku',link:'playerAttack',mode:'player',search:'Deyss_'},
    {v:'Czerwony Smok',l:'Sojusz',link:'allianceHonor',mode:'alliance',search:'Czerwony Smok'},
    {v:'0',l:'Ranga'}
  ]);
  assert.equal((html.match(/data-link=/g)||[]).length,2);
  assert.ok(html.includes('data-link="honorPoints" data-mode="player" data-search="Deyss_"'));
  assert.ok(html.includes('data-link="allianceHonor" data-mode="alliance"'));
  // Missing board (playerAttack) and a link-less stat both fall back to a plain tile.
  assert.equal((html.match(/db-plain/g)||[]).length,2);
  assert.ok(!html.includes('playerAttack'));
});

test('stat tile values from the API are escaped',()=>{
  const {statTilesHtml}=tileApi({player:{honorPoints:{id:5}},alliance:{}});
  const html=statTilesHtml([{v:'<img src=x onerror=1>',l:'Honor',link:'honorPoints',mode:'player',search:'"><b>'}]);
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('data-search="&quot;&gt;&lt;b&gt;"'));
});

test('the level tile targets the honor bracket containing that level',()=>{
  const {levelCatIdx}=tileApi({player:{honorPoints:{categories:[
    {id:1,name:'level_placeholder',value:'1-19'},
    {id:2,name:'level_placeholder',value:'20-29'},
    {id:6,name:'level_placeholder',value:'70'}
  ]}},alliance:{}});
  assert.equal(levelCatIdx(5),0);
  assert.equal(levelCatIdx(25),1);
  assert.equal(levelCatIdx(90),2);
  assert.equal(levelCatIdx(null),null);
  assert.equal(levelCatIdx(45),null);
});

function historyContext(){
  const context={
    localStorage:storage(),
    document:{getElementById:()=>null,documentElement:{}},
    location:{hash:''},history:{replaceState(){}},
    URLSearchParams,console,setTimeout,clearTimeout
  };
  vm.createContext(context);
  vm.runInContext(`${source('config.js')}\n${source('state.js')}\nloadHistory();S.eventKey='honorPoints';`
    +`\nglobalThis.testApi={S,histKey,captureSnapshot,getStatSeriesForKey,getPrevRank,`
    +`getRankSeriesForEvent,bestHistEvent,histKeyEvent,`
    +`seed:entries=>{HIST[histKey()]={Player:entries}},`
    +`seedKey:(k,entries)=>{HIST[k]={Player:entries}}};`,context);
  return context.testApi;
}

test('snapshots record every stat so any of them can be charted',()=>{
  const {histKey,captureSnapshot,getStatSeriesForKey}=historyContext();
  captureSnapshot([{name:'Player',rank:7,score:3478,honor:3478,might:253866411,avp:133720,rpt:null}]);
  const k=histKey();
  assert.deepEqual(Array.from(getStatSeriesForKey('Player',k,'might'),p=>p.v),[253866411]);
  assert.deepEqual(Array.from(getStatSeriesForKey('Player',k,'avp'),p=>p.v),[133720]);
  assert.deepEqual(Array.from(getStatSeriesForKey('Player',k,'rank'),p=>p.v),[7]);
  assert.deepEqual(Array.from(getStatSeriesForKey('Player',k,'score'),p=>p.v),[3478]);
  // Stats the row doesn't carry are simply absent rather than stored as null.
  assert.deepEqual(Array.from(getStatSeriesForKey('Player',k,'rpt')),[]);
  assert.deepEqual(Array.from(getStatSeriesForKey('Missing',k,'might')),[]);
});

test('history entries written before stats existed still chart rank and score',()=>{
  const {histKey,getStatSeriesForKey,getPrevRank,seed}=historyContext();
  seed([[1,9,3000],[2,8,3200],[3,7,3478,{m:253866411}]]);
  const k=histKey();
  // Legacy 3-element entries keep working for the metrics they did store …
  assert.deepEqual(Array.from(getStatSeriesForKey('Player',k,'rank'),p=>p.v),[9,8,7]);
  assert.deepEqual(Array.from(getStatSeriesForKey('Player',k,'score'),p=>p.v),[3000,3200,3478]);
  // … and are skipped for stats they never had, instead of charting as gaps or zeros.
  assert.deepEqual(Array.from(getStatSeriesForKey('Player',k,'might'),p=>p.v),[253866411]);
  assert.equal(getPrevRank('Player',k),7);
});

test('the chart puts the better value on top for both stat and position metrics',()=>{
  const {renderSparklineSVG}=tileApi({player:{},alliance:{}});
  // Read the y of each vertex straight off the polyline, not the tooltip hit circles.
  const y=svg=>svg.match(/points="([^"]+)"/)[1].split(' ').map(p=>+p.split(',')[1]);
  // Might grows 10 → 30: a bigger number is better, so the line must end higher (smaller y).
  const rising=y(renderSparklineSVG([{v:10},{v:20},{v:30}]));
  assert.ok(rising[0]>rising[2],`expected ${rising[0]} > ${rising[2]}`);
  // Position 30 → 10 is an improvement, so with `lower` it must also end higher.
  const climbing=y(renderSparklineSVG([{v:30},{v:20},{v:10}],{lower:true}));
  assert.deepEqual(climbing,rising);
  assert.match(renderSparklineSVG([{v:1}]),/spk-empty/);
});

test('the chart labels when its data is from, and keeps the row when there is none',()=>{
  const {renderSparklineSVG,spkAxisHtml}=tileApi({player:{},alliance:{}});
  const series=[{t:1000,v:10},{t:2000,v:20},{t:3000,v:30}];
  // Endpoints of the series stand in for an x axis …
  assert.equal(spkAxisHtml(series),'<div class="spk-ax"><span>t1000</span><span>t3000</span></div>');
  // … and the row is still emitted when there is nothing to chart, so the panel keeps its height.
  assert.equal(spkAxisHtml([{t:1000,v:10}]),'<div class="spk-ax"><span></span><span></span></div>');
  // Every point carries its own timestamp and value as a native tooltip.
  const svg=renderSparklineSVG(series,{fmt:v=>'#'+v});
  assert.deepEqual(Array.from(svg.matchAll(/<title>([^<]+)<\/title>/g),m=>m[1]),
    ['t1000 · #10','t2000 · #20','t3000 · #30']);
  assert.equal((svg.match(/spk-hit/g)||[]).length,3);
});

test('a ranking history key survives underscores in both the server id and the ranking key',()=>{
  const {histKeyEvent}=historyContext();
  assert.deepEqual({...histKeyEvent('EmpireEx_5_event_title_71_p_3','EmpireEx_5')},
    {event:'event_title_71',alliance:false,cat:3});
  assert.deepEqual({...histKeyEvent('EmpireEx_5_allianceHonor_a_0','EmpireEx_5')},
    {event:'allianceHonor',alliance:true,cat:0});
  assert.equal(histKeyEvent('EmpireEx_5_honorPoints_p_0','EmpireEx_7'),null);
});

test('a favourite card charts the position history of one ranking, best category first',()=>{
  const {getRankSeriesForEvent,bestHistEvent,seedKey}=historyContext();
  seedKey('EmpireEx_5_playerMight_p_0',[[1,50,900]]);
  seedKey('EmpireEx_5_playerMight_p_2',[[1,44,900],[2,41,950],[3,38,990]]);
  seedKey('EmpireEx_5_honorPoints_p_0',[[1,7,10],[2,9,12]]);
  // A ranking split across level brackets charts the bracket with the most snapshots.
  assert.deepEqual(Array.from(getRankSeriesForEvent('Player','EmpireEx_5','playerMight'),p=>p.v),[44,41,38]);
  assert.deepEqual(Array.from(getRankSeriesForEvent('Player','EmpireEx_5','honorPoints'),p=>p.v),[7,9]);
  assert.deepEqual(Array.from(getRankSeriesForEvent('Player','EmpireEx_5','playerGlory')),[]);
  // Other servers never leak into the series.
  assert.deepEqual(Array.from(getRankSeriesForEvent('Player','EmpireEx_7','playerMight')),[]);
  assert.equal(bestHistEvent('Player','EmpireEx_5'),'playerMight');
});

test('alliance history never becomes the default player chart',()=>{
  const {bestHistEvent,seedKey}=historyContext();
  seedKey('EmpireEx_5_allianceHonor_a_0',[[1,1,9],[2,2,8],[3,3,7],[4,4,6]]);
  seedKey('EmpireEx_5_honorPoints_p_0',[[1,7,10],[2,9,12]]);
  assert.equal(bestHistEvent('Player','EmpireEx_5'),'honorPoints');
});
