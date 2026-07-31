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
  const context={
    URL,Response,
    self:{location:{origin:'https://example.test'},addEventListener:(name,handler)=>{handlers[name]=handler},skipWaiting(){},clients:{claim(){}}},
    caches:{keys:async()=>['gge-old','other-app','gge-20260731-1'],delete:async key=>{deleted.push(key)}},
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
