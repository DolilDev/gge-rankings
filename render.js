// gge-rankings — render.js (split from app.js; classic script, shared global scope).
// Load order: config → i18n → state → api → render → features → main. All wiring + init() live in main.js (loaded last).

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

// ── Render ──
function showSpin(){$('mainView').classList.remove('stale');$('mainView').innerHTML=`<div class="st"><div class="spin"></div><div class="sm">${L('Pobieranie danych...')}</div></div>`;$('pgBar').style.display='none'}
function showSt(icon,msg,sub){$('mainView').classList.remove('stale');$('mainView').innerHTML=`<div class="st"><div class="si">${icon}</div><div class="sm">${esc(msg)}</div>${sub?`<div class="ss">${esc(sub)}</div>`:''}</div>`;$('pgBar').style.display='none'}


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
  const ncols=hasGlory?7:6;
  // Data columns carry no width: with table-layout:fixed the leftover space is split
  // equally among them, so they spread evenly across the full width (and stay put per page).
  const gloryTh=hasGlory?`<th class="${sortable('glory','r')}" data-sort="glory">${L('Chwała')}</th>`:'';
  let h=`<div class="twrap"><table><thead><tr>
    <th style="width:34px"></th>
    <th class="${sortable('rank')}" data-sort="rank" style="width:48px;text-align:center">#</th>
    <th style="width:26px"></th>
    <th class="${sortable('name')}" data-sort="name">${isAl?L('Sojusz'):L('Gracz')}</th>
    <th class="${sortable(isAl?'members':'al','r')}" data-sort="${isAl?'members':'al'}">${isAl?L('Członkowie'):L('Sojusz')}</th>
    ${gloryTh}<th class="${sortable('score','r')}" data-sort="score">${L('Wynik')}</th>
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

// ── Alliance members via gge-tracker (opt-in button in the alliance detail panel) ──
function ggtMembersBtn(rank){return `<button class="btn" id="ggtm_btn_${rank}">${L('👥 Pokaż członków (gge-tracker)')}</button>`}
function wireGgtMembers(rank,allianceName){
  const btn=$(`ggtm_btn_${rank}`),box=$(`ggtm_${rank}`);
  if(!btn||!box)return;
  btn.addEventListener('click',async e=>{
    e.stopPropagation();
    btn.disabled=true;
    box.innerHTML=`<div class="st" style="padding:14px"><div class="spin"></div><div class="sm" style="font-size:12px">${L('Ładowanie członków…')}</div></div>`;
    const res=await ggtAllianceMembers(allianceName,srvInfo(S.server)?.code);
    btn.disabled=false;
    renderGgtMembers(box,res);
  });
}
function renderGgtMembers(box,res){
  const msg=t=>`<div style="color:var(--c-muted);font-size:12px;padding:8px 0">${esc(t)}</div>`;
  if(!res||res.error){box.innerHTML=msg(L('Błąd pobierania z gge-tracker'));return}
  if(res.unsupported){box.innerHTML=msg(L('Serwer nieobsługiwany przez gge-tracker'));return}
  const players=res.players||[];
  if(res.notFound||!players.length){box.innerHTML=msg(L('Nie znaleziono sojuszu w gge-tracker'));return}
  const rows=players.map((p,i)=>{
    const ll=p.legendary_level>0?`✦${p.legendary_level}`:(p.level>=70?`✦${p.level}`:`${p.level||'?'}`);
    const rkCls=i<3?` rk${i+1}`:'';
    return`<div class="gtm-row" data-search-player="${esc(p.player_name||'')}">
      <div class="gtm-rk${rkCls}">${i+1}</div>
      <div class="gtm-nm">${esc(p.player_name||'—')}<span class="gtm-lv">Lv ${ll}</span></div>
      <div class="gtm-sub"><span>💪 <b>${fmtN(p.might_current)}</b></span><span>🏆 <b>${fmtN(p.current_fame)}</b></span><span>❤ <b>${fmtN(p.honor)}</b></span></div>
    </div>`;
  }).join('');
  const upd=players.map(p=>p.updated_at).filter(Boolean).sort().pop();
  const updHtml=upd?`<span class="gtm-upd">${L('Zaktualizowano {t}',{t:new Date(upd).toLocaleDateString(curLocale())})}</span>`:'';
  box.innerHTML=`<div class="gtm">
    <div class="gtm-h"><span class="gtm-t">${L('Członkowie wg gge-tracker ({n})',{n:players.length})}</span>${updHtml}</div>
    <div class="gtm-list">${rows}</div></div>`;
  box.querySelectorAll('[data-search-player]').forEach(el=>{
    el.addEventListener('click',async e=>{
      e.stopPropagation();
      const name=el.dataset.searchPlayer;if(!name)return;
      S.allianceMode=false;updateTypeSeg();validateEv();buildEventSel();
      S.catIdx=0;S.curPage=1;clearExpanded();
      $('searchInput').value=name;await loadRanking(name);
    });
  });
}
// Minimal panel used when empire-api has no data — still offers the gge-tracker member list.
function allianceFallbackPanel(panel,r,msgText){
  panel.innerHTML=`<div class="dp" style="flex-direction:column;gap:8px">
    <span style="color:var(--c-muted);font-size:12px">${esc(msgText)}</span>
    <div class="da">${ggtMembersBtn(r.rank)}</div>
    <div id="ggtm_${r.rank}"></div>
  </div>`;
  wireGgtMembers(r.rank,r.name);
}

async function renderAllianceDetail(r,panel){
  panel.innerHTML=`<div class="dp"><div class="st" style="padding:20px"><div class="spin"></div></div></div>`;
  if(!r.allianceId){allianceFallbackPanel(panel,r,L('Brak ID sojuszu'));return}
  try{
    const url=`${GGE_API}/${S.server}/ain/%22AID%22:${r.allianceId}`;
    const d=await timeout(ggeGet(url),8000);
    if(!d||d.return_code!==0){allianceFallbackPanel(panel,r,L('Brak danych'));return}
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
          ${ggtMembersBtn(r.rank)}
        </div>
      </div>
      ${membersHtml}
      <div id="ggtm_${r.rank}"></div>
    </div>`;
    $(`dfaval_${r.rank}`)?.addEventListener('click',e=>{
      e.stopPropagation();
      toggleFavAl(r.name,S.server,r.allianceId,$(`dfaval_${r.rank}`));
    });
    wireGgtMembers(r.rank,r.name);
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
  }catch(e){console.warn('renderAllianceDetail:',e);allianceFallbackPanel(panel,r,L('Błąd pobierania danych'))}
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
