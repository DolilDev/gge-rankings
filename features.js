// gge-rankings — features.js (split from app.js; classic script, shared global scope).
// Load order: config → i18n → state → api → render → features → main. All wiring + init() live in main.js (loaded last).

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
function invalidatePool(){S.pool=null;S.poolCtx=null;S._poolPromise=null;S.synthRows=null}
function activeRows(){
  if(synthActive()&&S.synthRows)return S.synthRows;
  return (filterActive()&&S.filtered)?S.filtered:S.rows;
}
function findRow(rank){return activeRows().find(x=>x.rank===rank)}
async function ensurePool(fresh=false){
  const ctx=poolCtx();
  if(S.pool&&S.poolCtx===ctx)return S.pool;
  if(S._poolPromise)return S._poolPromise;
  S._poolPromise=(async()=>{
    const all=[];
    for(let sv=1;sv<=FILTER_POOL_MAX;){
      const batch=[];
      for(let j=0;j<FILTER_FETCH_CONC&&sv<=FILTER_POOL_MAX;j++,sv+=API_PAGE)batch.push(sv);
      const res=await Promise.all(batch.map(s=>fetchRanking(String(s),fresh).then(d=>d?parseRows(d).rows:[]).catch(()=>[])));
      let got=0;res.forEach(rows=>{got+=rows.length;all.push(...rows)});
      if(poolCtx()!==ctx){S._poolPromise=null;return S.pool||[]}
      setSt('spin',L('Pobieranie graczy… {n}',{n:all.length}));
      if(got===0)break;
    }
    const map=new Map();all.forEach(r=>{if(r&&r.rank!=null)map.set(r.rank,r)});
    const pool=[...map.values()].sort((a,b)=>a.rank-b.rank);
    S.pool=pool;S.poolCtx=ctx;S._poolPromise=null;
    return pool;
  })();
  return S._poolPromise;
}
function renderSynthStatus(){
  const n=(S.synthRows||[]).length,poolN=(S.pool||[]).length;
  const totalPgs=Math.max(1,Math.ceil(n/S.pageSize));
  $('sTotal').textContent=fmtN(n);
  $('sPage').textContent=`${Math.min(S.curPage,totalPgs)} / ${totalPgs}`;
  const r=evname(S.eventKey),t=new Date().toLocaleTimeString(curLocale());
  // A name search leaves only the matches in S.synthRows, so "top n" would misreport the ranking.
  setSt('live',S.lastSearch
    ?L('{r}: {n} z {pool} graczy · {t}',{r,n:fmtN(n),pool:fmtN(poolN),t})
    :L('{r}: top {n} graczy · {t}',{r,n:fmtN(n),t}));
}
function applyFiltered(){S.filtered=applySort(applyFilter(S.pool||[]))}
function renderFilteredStatus(){
  const n=S.filtered.length,poolN=(S.pool||[]).length;
  const totalPgs=Math.max(1,Math.ceil(n/S.pageSize));
  $('sTotal').textContent=fmtN(n);
  $('sPage').textContent=`${Math.min(S.curPage,totalPgs)} / ${totalPgs}`;
  setSt('live',L('Filtr: {n} z {pool} pobranych',{n:fmtN(n),pool:fmtN(poolN)}));
}
async function runFilter(fresh=false){
  if(!filterActive()){S.filtered=null;await loadRanking('1',fresh);return}
  const rid=++S.reqId;
  const ctx=poolCtx();
  if(!(S.pool&&S.poolCtx===ctx)){S.loading=true;setSt('spin',L('Pobieranie graczy do filtrów…'));if(S.rows.length)$('mainView').classList.add('stale');else showSpin()}
  const pool=await ensurePool(fresh);
  if(rid!==S.reqId)return;
  S.loading=false;
  if(poolCtx()!==ctx)return;
  if(!filterActive()){S.filtered=null;await loadRanking('1',fresh);return}
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
async function reloadCtx(fresh=false){invalidatePool();if(filterActive()&&!synthActive())await runFilter(fresh);else await loadRanking('1',fresh)}

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
  scrollViewTop();
}
// ── Favorites ──
function updFavCnt(){const n=S.favs.length+S.favAls.length;const el=$('favCnt');el.textContent=n;el.classList.toggle('has',n>0)}
function isFavAl(name,server){return S.favAls.some(f=>f.name===name&&f.server===server)}
function saveFavAls(){localStorage.setItem('gge_favAls_v1',JSON.stringify(S.favAls))}
function toggleFavAl(name,server,allianceId,btn){
  if(isFavAl(name,server)){
    S.favAls=S.favAls.filter(f=>!(f.name===name&&f.server===server));
    toast(L('Usunięto sojusz z obserwowanych'));
  }else{
    S.favAls.push({name,server,allianceId,game:srvGame(server)});
    toast(L('Obserwujesz sojusz {n}',{n:name}),'success');
  }
  saveFavAls();updFavCnt();
  if(btn){const now=isFavAl(name,server);btn.innerHTML=ico('star')+`<span>${now?L('Obserwowany'):L('Obserwuj')}</span>`;btn.classList.toggle('on',now)}
}
function toggleFav(name,game,server,tr){
  if(isFav(name,game,server)){S.favs=S.favs.filter(f=>!(f.name===name&&f.game===game&&f.server===server));toast(L('Usunięto z obserwowanych'))}
  else{S.favs.push({name,game,server});toast(L('Obserwujesz {n}',{n:name}),'success')}
  saveFavs();updFavCnt();
  document.querySelectorAll(`.sb[data-n="${CSS.escape(name)}"]`).forEach(b=>{b.classList.toggle('on',isFav(name,game,server));b.innerHTML=ico('star')});
  if(tr)tr.classList.toggle('fav',isFav(name,game,server));
}

function renderFavPage(){
  const grid=$('favGrid');
  if(!S.favs.length&&!S.favAls.length){grid.innerHTML=`<div class="fe">${L('Brak obserwowanych graczy i sojuszów.<br>Kliknij gwiazdkę przy dowolnym graczu lub sojuszu.')}</div>`;return}
  grid.innerHTML='';
  S.favs.forEach(fav=>{
    const card=document.createElement('div');card.className='fc';
    const si=srvInfo(fav.server);
    const label=si?`${si.flag} ${si.name}`:fav.server;
    const cid='fr_'+fav.name.replace(/\W/g,'_');
    const spkId='spk_'+fav.name.replace(/\W/g,'_')+'_'+fav.server;
    card.innerHTML=`<div class="fch"><div><div class="fcn">${ico('user')}<span>${esc(fav.name)}</span></div><div class="fcm">${esc(label)}<span class="fcal h"></span></div></div><button class="fcd" data-n="${esc(fav.name)}" data-g="${fav.game}" data-s="${fav.server}" aria-label="${L('Usuń')}">${ico('x')}</button></div>
      <div class="frr" id="${cid}"><div class="fr"><span class="fl">${L('Pobieranie...')}</span></div></div>
      <input type="text" class="fnote" maxlength="500" placeholder="${L('Notatka (np. wróg / sojusznik / cel)')}" value="${esc(fav.note||'')}" aria-label="${L('Notatka (np. wróg / sojusznik / cel)')}">
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
    card.innerHTML=`<div class="fch"><div><div class="fcn">${ico('shield')}<span>${esc(fav.name)}</span></div><div class="fcm">${esc(label)}</div></div><button class="fcd" data-n="${esc(fav.name)}" data-s="${fav.server}" aria-label="${L('Usuń')}">${ico('x')}</button></div><div class="frr" id="${cid}"><div class="fr"><span class="fl">${L('Pobieranie...')}</span></div></div>`;
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
    const {al,members}=allianceInfo(d.content);
    const rows=[];
    if(al.MP!=null)rows.push({l:'Moc',v:fmtN(al.MP)});
    if(al.CF!=null)rows.push({l:'Punkty chwały',v:fmtN(al.CF)});
    rows.push({l:'Członkowie',v:fmtN(members.length)});
    el.innerHTML=rows.map(r=>`<div class="fr"><span class="fl">${esc(L(r.l))}</span><span class="fp2">${esc(r.v)}</span></div>`).join('');
  }catch{
    if(el.isConnected)el.innerHTML=`<div class="fr"><span class="fl" style="color:var(--c-muted)">${L('Błąd')}</span></div>`;
  }
}

// All favourite cards share one request budget, so opening the page with many of them stays
// bounded no matter how many cards are on screen. Built on first use rather than at load time,
// so this file doesn't depend on api.js/config.js having been evaluated already.
let _favFetchSlot=null;
function favFetchSlot(task){
  if(!_favFetchSlot)_favFetchSlot=limiter(FAV_FETCH_CONC);
  return _favFetchSlot(task);
}
// Show the watched player's alliance next to their server, as a chip that opens the alliance
// boards on that player's own server. Hidden when they have none (or none of the boards knew it).
function showFavAlliance(card,fav,name){
  const el=card.querySelector('.fcal');
  if(!el)return;
  if(!name){el.classList.add('h');el.textContent='';return}
  el.classList.remove('h');
  el.innerHTML=`<button class="fcal-b" title="${esc(L('Otwórz ranking: {x}',{x:evname('allianceHonor')}))}">${ico('shield')}<span>${esc(name)}</span></button>`;
  el.querySelector('.fcal-b').addEventListener('click',()=>
    gotoRanking({server:fav.server,event:'allianceHonor',alliance:true,search:name}));
}
async function loadFavRanks(fav,card,spkId){
  const cid='fr_'+fav.name.replace(/\W/g,'_');const el=card.querySelector('#'+CSS.escape(cid));if(!el)return;
  const catalog=await getEventCatalog(fav.game);
  if(!el.isConnected)return;
  const evs=catalog?.player||(fav.game===srvGame(S.server)?S.events?.player:null)||{};
  // One lookup per ranking board (~25 of them). Awaiting them one by one took ~11.5s per card;
  // through the shared budget they overlap and finish in about a second, and Promise.all keeps
  // the catalogue's order so the rows still read the same.
  const boards=Object.entries(evs).filter(([,ev])=>ev.id);
  const found=await Promise.all(boards.map(([key,ev])=>favFetchSlot(async()=>{
    try{
      const d=await ggeGet(ggeUrl(fav.server,ev.id,fav.name,''));
      if(d?.return_code!=0||!d.content?.L?.length)return null;
      const f=d.content.L.find(p=>Array.isArray(p)&&(p[2]?.N||'').toLowerCase()===fav.name.toLowerCase());
      const rank=f?Number(f[0]):NaN,score=f?Number(f[1]):NaN;
      // The board rows carry the player's alliance, so the card gets it for free.
      const al=typeof f?.[2]?.AN==='string'&&f[2].AN?f[2].AN:null;
      return f&&Number.isFinite(rank)?{key,rank,score:Number.isFinite(score)?score:null,al}:null;
    }catch{return null}
  })));
  const res=found.filter(Boolean);
  if(!el.isConnected)return;
  showFavAlliance(card,fav,res.find(x=>x.al)?.al||null);
  // Each row is the player's standing in one ranking: clicking opens that ranking on that
  // server with the player looked up, hovering charts their position history there.
  el.innerHTML=res.length?res.map(r=>
      `<button class="fr fr-link" data-ev="${esc(r.key)}" title="${esc(L('Otwórz ranking: {x}',{x:evname(r.key)}))}"><span class="fl">${esc(evname(r.key))}</span><span class="fp2${r.rank<=3?' g':''}">#${r.rank}</span><span class="fs">${esc(fmtN(r.score))}</span></button>`).join('')
    :`<div class="fr"><span class="fl" style="color:var(--c-muted)">${L('Nie znaleziono')}</span></div>`;
  el.querySelectorAll('.fr-link').forEach(row=>{
    row.addEventListener('click',()=>gotoRanking({server:fav.server,event:row.dataset.ev,search:fav.name}));
  });
  const spkEl=card.querySelector('#'+CSS.escape(spkId));
  if(spkEl)renderFavChart(spkEl,fav,el,res);
}

// Position history of one favourite in one ranking. Mirrors the detail panel's chart: the
// default is Might, hovering a ranking row switches to it, leaving the list restores the default.
const favChartSeries=(fav,eventKey)=>getRankSeriesForEvent(fav.name,fav.server,eventKey,HIST_MAX_PER_PLAYER);
const favChartValue=v=>'#'+fmtN(v);
function favChartHtml(fav,eventKey){
  const series=favChartSeries(fav,eventKey);
  const label=esc(evname(eventKey));
  let head=`<span>${ico('activity')}${label}</span>`;
  if(series.length>=2){
    const first=series[0].v,last=series[series.length-1].v;
    // Position: a smaller number is better, so climbing counts as up.
    const dir=first===last?'':(last<first?' up':' down');
    head=`<span>${ico('activity')}${label} · ${L('{n} pkt',{n:series.length})}</span>`
      +`<span class="spk-delta${dir}">#${esc(fmtN(first))} → #${esc(fmtN(last))}</span>`;
  }
  return`<div class="spk-lbl">${head}</div>
    ${renderSparklineSVG(series,{lower:true,w:260,h:32,fmt:favChartValue})}
    ${spkAxisHtml(series)}`;
}
// Prefer Might, then any listed ranking with a line to draw, then whatever the player has the
// most history in (which may be a ranking they have since dropped out of). Null → no chart.
function favDefaultChartEvent(fav,res){
  const hasData=k=>favChartSeries(fav,k).length>=2;
  if(hasData(DEFAULT_FAV_CHART_EVENT))return DEFAULT_FAV_CHART_EVENT;
  return res.map(r=>r.key).find(hasData)||bestHistEvent(fav.name,fav.server);
}
function renderFavChart(spkEl,fav,rowsEl,res){
  const def=favDefaultChartEvent(fav,res);
  if(!def){spkEl.innerHTML='';return}
  spkEl.innerHTML=`<div class="spk-wrap" data-chart="${esc(def)}" data-cur="${esc(def)}">${favChartHtml(fav,def)}</div>`;
  const box=spkEl.querySelector('.spk-wrap');
  wireChartHover(box,favChartSeries(fav,def),favChartValue);
  const rows=[...rowsEl.querySelectorAll('.fr-link')];
  const mark=ev=>rows.forEach(r=>r.classList.toggle('charted',r.dataset.ev===ev));
  const show=ev=>{
    if(!ev||box.dataset.cur===ev)return;
    box.dataset.cur=ev;
    paintChart(box,favChartHtml(fav,ev),favChartSeries(fav,ev),favChartValue);
    mark(ev);
  };
  mark(def);
  // Same dwell as the detail panel's tiles: passing over rows on the way to the chart must not
  // hijack it — only resting on one does. Keyboard focus is deliberate, so it switches at once.
  let pending=null;
  const cancel=()=>{clearTimeout(pending);pending=null};
  rows.forEach(row=>{
    row.addEventListener('mouseenter',()=>{cancel();pending=setTimeout(()=>show(row.dataset.ev),HOVER_DWELL_MS)});
    row.addEventListener('mouseleave',cancel);
    row.addEventListener('focus',()=>{cancel();show(row.dataset.ev)});
  });
  // Leaving the card, not just the row list — otherwise moving down onto the chart would reset
  // the metric before the hovered ranking could be read. See wireStatChart().
  (rowsEl.closest('.fc')||rowsEl).addEventListener('mouseleave',()=>{cancel();show(box.dataset.chart)});
}

// ── Export ──
function downloadFile(name,content,type){
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},100);
  toast(L('Pobrano {name}',{name}),'success');
}
function csvCell(value){
  let cell=String(value??'');
  // Prevent spreadsheet applications from evaluating player-controlled values.
  if(/^[\t\r ]*[=+\-@]/.test(cell))cell="'"+cell;
  return /[",\n]/.test(cell)?`"${cell.replace(/"/g,'""')}"`:cell;
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
    // The biscuit column is derived, so it ships with the export of the board that defines it.
    if(biscuitCol())headers.push('biscuits');
    const csv=[headers.join(',')];
    rows.forEach(r=>{
      const cells=headers.map(h=>csvCell(h==='biscuits'?biscuitsUsed(r):r[h]));
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
        navigator.clipboard.writeText(url).then(()=>toast(L('Link skopiowany do schowka'),'success')).catch(()=>toast(L('Skopiuj URL ręcznie'),'error'));
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
// Two of the card's numbers aren't in a ranking row: plunder points (unless that board is the one
// open) and the player's place in the glory ranking. Both come from one gge-tracker record. Each
// is null when the world isn't tracked, the player is unknown or the API is slow/down, and the
// card then leaves that tile out.
async function cardExtras(r){
  let rec=null;
  try{rec=await timeout(ggtPlayerRanking(r.name,srvInfo(S.server)?.code),3500)}catch{}
  const num=v=>{const n=Number(v);return Number.isFinite(n)&&n>0?n:null};
  const onPlunderBoard=S.eventKey===NOBILITY_EVENT&&r.score!=null;
  return{
    loot:onPlunderBoard?r.score:num(rec?.loot_current),
    fameRank:num(rec?.player_current_fame_rank)
  };
}
function drawPlayerCard(r,extras={}){
  const FONT=`-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif`;
  const dark=S.theme!=='light';
  const C=dark
    ?{bg:'#0f1114',surface:'#15181d',border:'#282d36',bright:'#f2f5f9',muted:'#858d9a',acc:'#f0b03e'}
    :{bg:'#ffffff',surface:'#f3f4f6',border:'#dfe2e8',bright:'#111620',muted:'#6c757f',acc:'#b45309'};
  const W=640,H=360,scale=2;
  const cv=document.createElement('canvas');cv.width=W*scale;cv.height=H*scale;
  const ctx=cv.getContext('2d');if(!ctx){toast(L('Brak danych do eksportu'),'error');return}
  ctx.scale(scale,scale);ctx.textBaseline='alphabetic';
  ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,H);
  ctx.fillStyle=C.acc;ctx.fillRect(0,0,W,5);
  ctx.fillStyle=C.muted;ctx.font=`700 13px ${FONT}`;ctx.textAlign='left';ctx.letterSpacing='1px';
  ctx.fillText('GGE RANKINGS',24,40);ctx.letterSpacing='0px';
  const srv=srvInfo(S.server);
  ctx.textAlign='right';ctx.font=`13px ${FONT}`;
  ctx.fillText(_fit(ctx,srv?`${srv.flag} ${srv.name}`:S.server,260),W-24,40);
  ctx.textAlign='left';ctx.fillStyle=C.bright;ctx.font=`700 30px ${FONT}`;
  ctx.fillText(_fit(ctx,r.name,W-220),24,92);
  ctx.fillStyle=C.acc;ctx.font=`600 14px ${FONT}`;
  const catTxt=catname(curCat());
  ctx.fillText(_fit(ctx,evname(S.eventKey)+(catTxt?` · ${catTxt}`:''),W-220),24,118);
  const medal=r.rank===1?(dark?'#cfa855':'#a97c16'):r.rank===2?(dark?'#9ba4b2':'#64748b'):r.rank===3?(dark?'#b0794a':'#92551f'):C.bright;
  ctx.textAlign='right';ctx.fillStyle=medal;ctx.font=`800 56px ${FONT}`;
  ctx.fillText('#'+r.rank,W-24,100);ctx.textAlign='left';
  ctx.strokeStyle=C.border;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(24,140);ctx.lineTo(W-24,140);ctx.stroke();
  const stats=[];
  if(r.might!=null)stats.push([L('Moc'),fmtN(r.might)]);
  if(r.honor!=null)stats.push(['Honor',fmtN(r.honor)]);
  if(extras.loot!=null)stats.push([evname(NOBILITY_EVENT),fmtN(extras.loot)]);
  if(r.glory!=null)stats.push([L('Punkty chwały'),fmtN(r.glory)]);
  if(extras.fameRank!=null)stats.push([L('Ranking chwały'),'#'+fmtN(extras.fameRank)]);
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
  ctx.textAlign='left';ctx.fillStyle=C.acc;ctx.font=`600 12px ${FONT}`;
  ctx.fillText('dolildev.github.io/gge-rankings',24,H-16);
  return cv;
}
function exportPlayerCard(r){
  const safe=r.name.replace(/[^\w-]+/g,'_').slice(0,40)||'player';
  const fname=`gge_${safe}_${new Date().toISOString().slice(0,10)}.png`;
  // Pass the blob-producing promise straight to ClipboardItem so Safari/Firefox keep the user
  // gesture — which is also what lets the loot lookup happen without losing the right to copy.
  const blobPromise=cardExtras(r)
    .then(extras=>drawPlayerCard(r,extras))
    .then(cv=>cv?new Promise(res=>cv.toBlob(res,'image/png')):null);
  const download=()=>blobPromise.then(b=>{
    if(!b){toast(L('Brak danych do eksportu'),'error');return false}
    downloadFile(fname,b,'image/png');return true;
  });
  if(navigator.clipboard?.write&&window.ClipboardItem){
    navigator.clipboard.write([new ClipboardItem({'image/png':blobPromise})])
      .then(()=>toast(L('Karta skopiowana do schowka'),'success'))
      .catch(()=>download().then(ok=>{if(ok)toast(L('Schowek niedostępny — karta pobrana'),'error')}));
  }else download();
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
    if(_arCount<=0){_arCount=S.autoRef;if(filterActive()||synthActive()){reloadCtx(true)}else{const sv=S.lastSearch||String((S.curPage-1)*S.pageSize+1);loadRanking(sv,true)}}
  },1000);
}
function updateAutoRefUI(){
  $('autoRefBtn').classList.toggle('on',S.autoRef>0);
  $('autoRefLbl').textContent=S.autoRef>0?fmtCountdown(S.autoRef):'Auto';
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
