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
  vm.runInContext(`${source('config.js')}\n${source('state.js')}\nglobalThis.testApi={S,esc,readHash,pageForRank,loadHistory,loadBoards,observeBoard,boardPeriod,boardReset,seedBoardsFromHistory,getBoards:()=>BOARDS};`,context);
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
    ['honorPoints','playerMight','playerGlory','playerAttack','playerHighestFame','playerLoot',
     'dialog_BeggingKnights_nobilityPoints','legendLevel']);
  assert.deepEqual(
    ['playerGlory','playerAttack','playerHighestFame','playerLoot'].map(key=>player[key].synthetic),
    ['glory','avp','hf','rpt']);
  // The base board supplies the pool every synthetic ranking is sorted from.
  assert.equal(player.playerAttack.id,2);
});

function catalogApi(responses,stored={}){
  const requested=[];
  const context={
    console,setTimeout,clearTimeout,window:{},
    localStorage:storage(stored),
    timeout:promise=>promise,
    fetch:async url=>{
      requested.push(url);
      const body=responses[url];
      if(!body)return{ok:false,status:429,json:async()=>{throw new Error('no body')}};
      return{ok:true,json:async()=>body};
    }
  };
  vm.createContext(context);
  vm.runInContext(`${source('config.js')}
${source('api.js')}`,context);
  return{context,requested};
}
const CATALOG=player=>({player,alliance:{allianceHonor:{id:10}}});

test('a rate-limited catalogue host falls back to the mirror and is remembered',async()=>{
  const mirror=CATALOG({honorPoints:{id:5},playerMight:{id:6},event_title_3:{id:20}});
  const {context,requested}=catalogApi({[`https://cdn.jsdelivr.net/gh/danadum/ggs-assets@main/gge/events.json`]:mirror});
  const catalog=await context.getEventCatalog('gge');
  assert.deepEqual(Object.keys(catalog.player),['honorPoints','playerMight','event_title_3']);
  assert.ok(requested[0].includes('raw.githubusercontent.com'));
  // Remembered, so the next visit keeps the full list even if both hosts are down.
  assert.equal(context.localStorage.getItem('gge_events_gge'),JSON.stringify(mirror));
});

test('with every host down the catalogue comes from the last good copy, then the bundled one',async()=>{
  const cached=CATALOG({honorPoints:{id:5},event_title_97:{id:30}});
  const remembered=await catalogApi({},{gge_events_gge:JSON.stringify(cached)}).context.getEventCatalog('gge');
  assert.equal(JSON.stringify(remembered),JSON.stringify(cached));

  const bundled=CATALOG(JSON.parse(source('gge_events.json')).player);
  const {context}=catalogApi({'./gge_events.json':bundled});
  const fallback=await context.getEventCatalog('gge');
  assert.ok(Object.keys(fallback.player).length>20);
});

test('a truncated or unrelated catalogue is rejected instead of shrinking the ranking list',async()=>{
  const {context}=catalogApi({
    'https://raw.githubusercontent.com/danadum/ggs-assets/main/gge/events.json':{player:{}},
    'https://cdn.jsdelivr.net/gh/danadum/ggs-assets@main/gge/events.json':{message:'Not Found'}
  },{gge_events_gge:'{broken'});
  assert.equal(await context.getEventCatalog('gge'),null);
});

function renderApi(S,exports){
  const context={console,setTimeout,clearTimeout,window:{},document:{getElementById:()=>null},S,
    L:(t,v)=>String(t).replace(/\{(\w+)\}/g,(m,k)=>v&&k in v?v[k]:m),
    esc:x=>String(x??''),fmtN:x=>String(x)};
  vm.createContext(context);
  vm.runInContext(`${source('config.js')}
${source('render.js')}
globalThis.testApi={${exports.join(',')}};`,context);
  return context.testApi;
}

test('a ranking icon points at its sprite cell, alliance boards at their own art',()=>{
  const {rankIcon}=renderApi({allianceMode:false},['rankIcon']);
  const cell=html=>[...html.matchAll(/--r([cr]):(\d+)/g)].map(m=>+m[2]);
  // Might is the third icon in the sheet → first row, third column.
  assert.deepEqual(cell(rankIcon('playerMight')),[2,0]);
  // The Nomad invasion has a separate alliance icon; the player one must not leak into it.
  const player=cell(rankIcon('event_title_72',false)),alliance=cell(rankIcon('event_title_72',true));
  assert.notDeepEqual(player,alliance);
  // An alliance board without its own art keeps the shared icon.
  assert.deepEqual(cell(rankIcon('event_title_113',true)),cell(rankIcon('event_title_113',false)));
  // Unknown boards still get a marker rather than an empty gap.
  assert.deepEqual(cell(rankIcon('event_title_9999')),cell(rankIcon('__nothing__')));
});

test('every mapped ranking icon exists in the sprite index',()=>{
  const {RANK_ICONS,RANK_ICONS_AL,RANK_ICON_IDS,RANK_ICON_FALLBACK,RANK_ICON_COLS}=
    renderApi({allianceMode:false},['RANK_ICONS','RANK_ICONS_AL','RANK_ICON_IDS','RANK_ICON_FALLBACK','RANK_ICON_COLS']);
  const known=new Set(RANK_ICON_IDS);
  for(const [key,id] of [...Object.entries(RANK_ICONS),...Object.entries(RANK_ICONS_AL)])
    assert.ok(known.has(id),`${key} → ${id}`);
  assert.ok(known.has(RANK_ICON_FALLBACK));
  assert.equal(RANK_ICON_IDS.length,new Set(RANK_ICON_IDS).size,'duplicate icon id');
  // The sprite exists and the sheet is laid out in the column count both config.js and style.css use.
  assert.ok(fs.statSync(path.join(root,'icons','rankings.webp')).size>0);
  assert.ok(source('style.css').includes(`background-size:calc(var(--ri) * ${RANK_ICON_COLS}) auto`));
});

test('every board of the bundled catalogue has an icon mapping',()=>{
  const {RANK_ICONS}=renderApi({allianceMode:false},['RANK_ICONS']);
  const catalogue=JSON.parse(source('gge_events.json'));
  const missing=[...Object.keys(catalogue.player),...Object.keys(catalogue.alliance)]
    .filter(k=>!(k in RANK_ICONS));
  assert.deepEqual(missing,[]);
});

test('the biscuit column belongs to the plant-trap board and counts 20 per point',()=>{
  const api=S=>renderApi(S,['biscuitCol','biscuitsUsed','BISCUIT_EVENT','BISCUITS_PER_POINT']);
  const on=api({allianceMode:false,eventKey:'dialog_title_gachadeco2x2'});
  assert.equal(on.BISCUIT_EVENT,'dialog_title_gachadeco2x2');
  assert.equal(on.biscuitCol(),true);
  assert.equal(on.biscuitsUsed({score:1337}),1337*20);
  // A score of 0 is a real value, a missing one is not.
  assert.equal(on.biscuitsUsed({score:0}),0);
  assert.equal(on.biscuitsUsed({}),null);
  assert.equal(on.biscuitsUsed(null),null);
  // Not on other boards, and not on the alliance side of this one.
  assert.equal(api({allianceMode:false,eventKey:'playerMight'}).biscuitCol(),false);
  assert.equal(api({allianceMode:true,eventKey:'dialog_title_gachadeco2x2'}).biscuitCol(),false);
});

test('the bundled catalogue snapshots cover both games',()=>{
  for(const game of ['gge','e4k']){
    const bundled=JSON.parse(source(`${game}_events.json`));
    assert.ok(Object.keys(bundled.player).length>20,`${game} player boards`);
    assert.ok(Object.keys(bundled.alliance).length>5,`${game} alliance boards`);
    assert.ok(bundled.player.playerMight&&bundled.player.honorPoints);
  }
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
  vm.runInContext(`${source('render.js')}\nglobalThis.testApi={statTilesHtml,levelCatIdx,renderSparklineSVG,spkAxisHtml,nearestChartIndex};`,context);
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
    URLSearchParams,console,setTimeout,clearTimeout,
    curLocale:()=> 'pl-PL'
  };
  vm.createContext(context);
  vm.runInContext(`${source('config.js')}\n${source('state.js')}\nloadHistory();S.eventKey='honorPoints';`
    +`\nglobalThis.testApi={S,histKey,captureSnapshot,getStatSeriesForKey,getPrevRank,`
    +`getRankSeriesForEvent,bestHistEvent,histKeyEvent,fmtHistTime,`
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
  // The chart ships the hover readout's parts, parked hidden until the pointer arrives.
  const svg=renderSparklineSVG(series,{fmt:v=>'#'+v});
  assert.match(svg,/class="spk-guide"/);
  assert.match(svg,/class="spk-cursor"/);
  assert.match(svg,/class="spk-tip h"/);
});

test('the hover readout snaps to the nearest snapshot and clamps at both ends',()=>{
  const {nearestChartIndex}=tileApi({player:{},alliance:{}});
  // Five points rendered across x = 3..237 (renderSparklineSVG's 3px padding).
  const at=vx=>nearestChartIndex(vx,3,237,5);
  assert.equal(at(3),0);
  assert.equal(at(237),4);
  assert.equal(at(120),2);
  assert.equal(at(115),2);          // nearest, not the one to the left
  assert.equal(at(150),3);
  // Past either edge the readout sticks to the end point instead of disappearing.
  assert.equal(at(-40),0);
  assert.equal(at(400),4);
  // A one-point series has nothing to snap between.
  assert.equal(nearestChartIndex(120,3,3,1),0);
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

function ggtApi(fetchStub){
  const context={console,setTimeout,clearTimeout,window:{},fetchStub,
    S:{server:'EmpireEx_5',allianceMode:false}};
  vm.createContext(context);
  vm.runInContext(`${source('config.js')}\n${source('api.js')}`
    +`\nfetch=globalThis.fetchStub;timeout=p=>p;`
    +`\nglobalThis.testApi={ggtHistory,ggtPlayerId,downsampleSeries,mergeHistory};`,context);
  return context.testApi;
}
const jsonResponse=body=>({ok:true,json:async()=>body});

test('gge-tracker history is normalized, sorted and thinned down for the sparkline',async()=>{
  const calls=[];
  const points=Array.from({length:500},(_,i)=>({date:new Date(1e12+i*3600e3).toISOString(),point:String(i)}));
  const {ggtHistory}=ggtApi(async url=>{
    calls.push(String(url));
    if(String(url).includes('/players/'))return jsonResponse({player_id:'2219570065'});
    // Deliberately out of order, plus an unusable row, to exercise the normalizer.
    return jsonResponse({points:{player_might_history:[...points].reverse().concat([{date:'nope',point:'x'}])}});
  });
  const series=await ggtHistory('Caesarius','PL1','player_might_history');
  assert.equal(series.length,40);
  assert.equal(series[0].v,0);            // endpoints are preserved exactly …
  assert.equal(series[39].v,499);
  assert.ok(series.every((p,i)=>i===0||p.t>series[i-1].t)); // … and the series ends up ascending
  // Name is resolved to an id first, then the series is fetched for that id.
  assert.ok(calls[0].includes('/players/Caesarius'));
  assert.ok(calls[1].includes('/statistics/player/2219570065/player_might_history/365'));
});

test('an untracked server or an unknown player yields no backfill',async()=>{
  const {ggtHistory}=ggtApi(async()=>jsonResponse({error:'not found'}));
  // NET*/Sieć worlds are not tracked at all — no request should even be attempted.
  assert.deepEqual(Array.from(await ggtHistory('Someone','NET1','player_might_history')),[]);
  assert.deepEqual(Array.from(await ggtHistory('Ghost','PL1','player_might_history')),[]);
});

test('a failing gge-tracker call leaves the chart on local history',async()=>{
  const {ggtHistory}=ggtApi(async()=>{throw new Error('offline')});
  assert.deepEqual(Array.from(await ggtHistory('Caesarius','PL1','player_might_history')),[]);
});

test('local snapshots newer than the backfill are appended, older ones dropped',()=>{
  const {mergeHistory}=ggtApi(async()=>jsonResponse({}));
  const backfill=[{t:100,v:1},{t:200,v:2}];
  const local=[{t:150,v:99},{t:200,v:2},{t:300,v:3}];
  // Only t=300 is newer than the backfill's last point, so the line continues without doubling up.
  assert.deepEqual(Array.from(mergeHistory(backfill,local),p=>p.t),[100,200,300]);
  // With nothing to backfill the local series is used unchanged.
  assert.deepEqual(Array.from(mergeHistory([],local),p=>p.t),[150,200,300]);
});

test('chart timestamps show the year only when it is not the current one',()=>{
  const {S,fmtHistTime}=historyContext();
  S.lang='pl';
  const now=new Date();
  const thisYear=fmtHistTime(new Date(now.getFullYear(),7,16,14,15).getTime());
  const lastYear=fmtHistTime(new Date(now.getFullYear()-1,7,16,13,16).getTime());
  // A backfilled year-long series must not print both of its ends as the same date.
  assert.ok(!/\d{4}/.test(thisYear),thisYear);
  assert.ok(/\d{4}/.test(lastYear),lastYear);
  assert.notEqual(thisYear.slice(0,5),'');
  assert.equal(fmtHistTime('nonsense'),'');
});

test('the request limiter caps concurrency, preserves order and survives failures',async()=>{
  const {limiter}=scriptApi('api.js',['limiter']);
  const gate=limiter(3);
  let active=0,peak=0;
  const task=(id,fail)=>gate(async()=>{
    active++;peak=Math.max(peak,active);
    await new Promise(r=>setTimeout(r,5));
    active--;
    if(fail)throw new Error('boom '+id);
    return id;
  });
  const results=await Promise.all(
    Array.from({length:12},(_,i)=>task(i,i===4).catch(e=>e.message)));
  assert.ok(peak<=3,`peak concurrency was ${peak}`);
  assert.equal(results[0],0);
  assert.equal(results[11],11);          // Promise.all order is independent of finish order
  assert.equal(results[4],'boom 4');     // a rejection frees its slot instead of stalling the queue
  assert.equal(active,0);
});

test('alliance members are read from content.A, which is where the API puts them',()=>{
  const {allianceInfo}=scriptApi('api.js',['allianceInfo'],{S:{}});
  const payload={A:{N:'ARGOS',MP:4477892680,CF:1664546685043,M:[{N:'a'},{N:'b'},{N:'c'}]}};
  const {al,members}=allianceInfo(payload);
  assert.equal(al.N,'ARGOS');
  assert.equal(members.length,3);
  // content.M does not exist in the real payload; trusting it left every alliance looking empty.
  assert.equal(allianceInfo({M:[{N:'a'}],A:{N:'X'}}).members.length,0);
  // Missing or malformed payloads degrade to "no members" rather than throwing.
  assert.deepEqual(Array.from(allianceInfo({A:{N:'X'}}).members),[]);
  assert.deepEqual(Array.from(allianceInfo(null).members),[]);
  assert.deepEqual(Array.from(allianceInfo({A:{M:'nope'}}).members),[]);
});

// ── Ranking reset detection ──
const DAY=24*60*60*1000;
const BKEY='EmpireEx_5_event_title_71_p_0';

test('a collapsing leader score marks a new run, a view without rank 1 marks nothing',()=>{
  const api=stateContext();
  api.loadBoards();
  // First look only establishes the baseline — there is nothing yet to compare against.
  assert.equal(api.observeBoard(1000,50,BKEY),false);
  assert.equal(api.observeBoard(800,50,BKEY),false);   // ordinary churn at the top
  assert.equal(api.observeBoard(10,50,BKEY),true);     // board wiped ⇒ a new run started
  assert.equal(api.getBoards()[BKEY].r.length,1);
  // A deep page or a name search carries no rank 1, so it must not overwrite the baseline.
  assert.equal(api.observeBoard(null,50,BKEY),false);
  assert.equal(api.getBoards()[BKEY].s,10);
});

test('an empty board filling up counts as a run start',()=>{
  const api=stateContext();
  api.loadBoards();
  assert.equal(api.observeBoard(null,0,BKEY),false);   // event over, board empty
  assert.equal(api.observeBoard(5,40,BKEY),true);      // next run's board appeared
});

test('the next reset is estimated from the median gap and skipped past when overdue',()=>{
  const now=Date.now();
  // Four run starts with gaps of 1, 1 and 3 days: the 3-day one is a reset nobody was around to
  // see, and the median has to shrug that off rather than average it in.
  const r=[[now-8*DAY,3600000],[now-7*DAY,3600000],[now-6*DAY,3600000],[now-3*DAY,3600000]];
  const api=stateContext({gge_boards_v1:JSON.stringify({[BKEY]:{t:now-3*DAY,s:5,n:40,r}})});
  api.loadBoards();
  assert.equal(api.boardPeriod(BKEY),DAY);
  const b=api.boardReset(BKEY);
  assert.equal(b.runs,4);
  assert.equal(b.period,DAY);
  assert.ok(b.next>now,'a three-day-old last run must roll forward past now');
  assert.ok(b.next-now<=DAY);
});

test('one observed run start yields a last-reset date but no estimate',()=>{
  const now=Date.now();
  const api=stateContext({gge_boards_v1:JSON.stringify({[BKEY]:{t:now,s:5,n:40,r:[[now-DAY,7200000]]}})});
  api.loadBoards();
  const b=api.boardReset(BKEY);
  assert.equal(b.last,now-DAY);
  assert.equal(b.period,undefined);
  assert.equal(b.next,undefined);
  // Boards that never reset never record a run start, so they report nothing at all.
  assert.equal(api.boardReset('EmpireEx_5_playerMight_p_0'),null);
});

test('past run starts are recovered from stored history exactly once',()=>{
  const now=Date.now();
  const hist={[BKEY]:{Alice:[[now-3*DAY,1,1000,{}],[now-2*DAY,1,20,{}]]}};
  const api=stateContext({gge_hist_v1:JSON.stringify(hist)});
  api.loadHistory();api.loadBoards();
  assert.equal(api.seedBoardsFromHistory(),1);
  const b=api.boardReset(BKEY);
  assert.equal(b.runs,1);
  assert.ok(b.last>now-3*DAY&&b.last<now-2*DAY,'the reset is placed between the two snapshots');
  assert.equal(api.seedBoardsFromHistory(),0,'the backfill must not run a second time');
});
