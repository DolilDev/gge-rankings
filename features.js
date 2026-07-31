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
  const n=(S.synthRows||[]).length;
  const totalPgs=Math.max(1,Math.ceil(n/S.pageSize));
  $('sTotal').textContent=fmtN(n);
  $('sPage').textContent=`${Math.min(S.curPage,totalPgs)} / ${totalPgs}`;
  setSt('live',L('Chwała: top {n} graczy · {t}',{n:fmtN(n),t:new Date().toLocaleTimeString(curLocale())}));
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
  window.scrollTo({top:0,behavior:'smooth'});
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
  document.querySelectorAll(`.sb[data-n="${CSS.escape(name)}"]`).forEach(b=>{b.classList.toggle('on',isFav(name,game,server));b.textContent=isFav(name,game,server)?'⭐':'☆'});
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
    el.innerHTML=rows.map(r=>`<div class="fr"><span class="fl">${esc(L(r.l))}</span><span class="fp2">${esc(r.v)}</span></div>`).join('');
  }catch{
    if(el.isConnected)el.innerHTML=`<div class="fr"><span class="fl" style="color:var(--c-muted)">${L('Błąd')}</span></div>`;
  }
}

async function loadFavRanks(fav,card,spkId){
  const cid='fr_'+fav.name.replace(/\W/g,'_');const el=card.querySelector('#'+CSS.escape(cid));if(!el)return;
  const catalog=await getEventCatalog(fav.game);
  if(!el.isConnected)return;
  const evs=catalog?.player||(fav.game===srvGame(S.server)?S.events?.player:null)||{};const res=[];
  for(const[key,ev]of Object.entries(evs)){
    if(!ev.id)continue;
    try{
      const url=ggeUrl(fav.server,ev.id,fav.name,'');
      const d=await ggeGet(url);
      if(d?.return_code==0&&d.content?.L?.length){
        const f=d.content.L.find(p=>Array.isArray(p)&&(p[2]?.N||'').toLowerCase()===fav.name.toLowerCase());
        const rank=f?Number(f[0]):NaN,score=f?Number(f[1]):NaN;
        if(f&&Number.isFinite(rank))res.push({key,rank,score:Number.isFinite(score)?score:null});
      }
    }catch{}
  }
  if(!el.isConnected)return;
  el.innerHTML=res.length?res.map(r=>`<div class="fr"><span class="fl">${esc(evname(r.key))}</span><span class="fp2${r.rank<=3?' g':''}">#${r.rank}</span><span class="fs">${esc(fmtN(r.score))}</span></div>`).join('')
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
    const csv=[headers.join(',')];
    rows.forEach(r=>{
      const cells=headers.map(h=>csvCell(r[h]));
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
    ?{bg:'#0e0c0c',surface:'#161313',border:'#2a2424',bright:'#f2eaea',muted:'#a89a9a',blue:'#cf7676'}
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
  const safe=r.name.replace(/[^\w-]+/g,'_').slice(0,40)||'player';
  const fname=`gge_${safe}_${new Date().toISOString().slice(0,10)}.png`;
  // Pass the blob-producing promise straight to ClipboardItem so Safari/Firefox keep the user gesture.
  const blobPromise=new Promise(res=>cv.toBlob(res,'image/png'));
  const download=()=>blobPromise.then(b=>{
    if(!b){toast(L('Brak danych do eksportu'),'error');return false}
    downloadFile(fname,b,'image/png');return true;
  });
  if(navigator.clipboard?.write&&window.ClipboardItem){
    navigator.clipboard.write([new ClipboardItem({'image/png':blobPromise})])
      .then(()=>toast(L('📋 Karta skopiowana do schowka'),'success'))
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
