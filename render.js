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
  document.addEventListener('click',e=>{if(!drop.contains(e.target)&&!btn.contains(e.target))drop.classList.add('h')});
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

// Coat of arms (player emblem). Returns an <img> with a same-origin data URL, or '' when the
// pack isn't loaded yet / the row has no emblem. crest.js re-renders the table once the pack loads.
function crestImg(emblem,size,cls){
  if(!emblem||!window.Crest||!Crest.ready)return'';
  const u=Crest.url(emblem,size);
  return u?`<img class="${cls||'pcrest'}" src="${u}" width="${size}" height="${size}" alt="" title="${L('Herb')}">`:'';
}

function buildSynthRows(pool){
  const f=synthField();
  const valid=(pool||[]).filter(r=>r[f]!=null);
  const sorted=valid.sort((a,b)=>(b[f]||0)-(a[f]||0));
  // Re-rank by the chosen field and surface it as the row's score (the table's "score" column).
  return sorted.map((r,i)=>({...r,rank:i+1,score:r[f]}));
}
function renderTable(){
  const isAl=S.allianceMode;
  const synth=synthActive()&&!!S.synthRows;
  const filt=!synth&&filterActive()&&!!S.pool;
  const full=synth?(S.sort?applySort(S.synthRows):S.synthRows)
            :filt?applySort(applyFilter(S.pool)):visibleRows();
  if(filt)S.filtered=full;
  const local=synth||filt;
  const rows=local?full.slice((S.curPage-1)*S.pageSize,S.curPage*S.pageSize):full;
  // Keep the open detail panel pinned to its player/alliance by name (rank can shift
  // between refreshes), so it survives re-renders instead of vanishing.
  if(S.expandedName!=null){
    const m=rows.find(r=>r.name===S.expandedName);
    S.expandedRank=m?m.rank:null;
    if(!m)S.expandedName=null;
  }
  const sortCol=S.sort?.col, sortDir=S.sort?.dir;
  const sortable=(col,extraClass='')=>{
    let cls=`sortable ${extraClass}`;
    if(sortCol===col)cls+=' sort-'+sortDir;
    return cls.trim();
  };
  // Glory lives in its own ranking (the "Chwała" entry in the sidebar, like the other synthetic
  // boards) and in the player detail panel, so it is not a permanent extra column in the table.
  // Every column carries a width: with table-layout:fixed the percentages keep the name
  // and alliance columns in a fixed ratio, so nothing drifts apart on a wide screen.
  const ncols=6;
  let h=`<div class="twrap${isAl?' al-mode':''}"><table><thead><tr>
    <th style="width:38px"></th>
    <th class="${sortable('rank')}" data-sort="rank" style="width:58px;text-align:center">#</th>
    <th style="width:30px"></th>
    <th class="${sortable('name')}" data-sort="name" style="width:${isAl?'52%':'46%'}">${isAl?L('Sojusz'):L('Gracz')}</th>
    <th class="${sortable(isAl?'members':'al',isAl?'r':'')}" data-sort="${isAl?'members':'al'}" style="width:${isAl?'14%':'20%'}">${isAl?L('Członkowie'):L('Sojusz')}</th>
    <th class="${sortable('score','r')}" data-sort="score" style="width:170px">${synth?esc(evname(S.eventKey)):L('Wynik')}</th>
    </tr></thead><tbody>`;

  const game=srvGame(S.server);
  const sq=S.lastSearch;
  rows.forEach(r=>{
    const fv=isFav(r.name,game,S.server);
    const badge=r.rank;
    const rkCls=r.rank<=3?'rk'+r.rank:'';
    const exp=S.expandedRank===r.rank;
    const favNote=fv?(S.favs.find(f=>f.name===r.name&&f.game===game&&f.server===S.server)||{}).note:'';
    const noteBadge=favNote?`<span class="badge b-note" title="${esc(favNote)}">${ico('note')}</span>`:'';
    const isMatch=sq&&r.name.toLowerCase().includes(sq);
    const inCmp=S.compare.some(c=>c.name===r.name&&c.server===S.server);
    const chg=chgIndicator(r.name,r.rank);
    const scd=scoreChgIndicator(r.name,r.score);
    const nameContent=isAl
      ?`<span class="pn" title="${esc(r.name)}">${esc(r.name)}</span>${noteBadge}`
      :`<span class="player-name-line">${crestImg(r.emblem,20,'pcrest')}<span class="pn" title="${esc(r.name)}">${esc(r.name)}</span>${noteBadge}</span>`;
    const alCell=isAl
      ?`<td class="r c-members">${r.members!=null?fmtN(r.members):'—'}</td>`
      :`<td class="c-al">${r.al?`<button class="badge b-al al-tag" data-al="${esc(r.al)}" title="${L('Pokaż graczy tego sojuszu')}">${esc(r.al)}</button>`:'<span class="c-none">—</span>'}</td>`;
    h+=`<tr class="dr ${rkCls}${fv?' fav':''}${exp?' exp':''}${isMatch?' match':''}${inCmp?' sel':''}" data-rk="${r.rank}">
      <td><input type="checkbox" class="ck" data-rk="${r.rank}" ${inCmp?'checked':''} aria-label="${L('Zaznacz do porównania')}" onclick="event.stopPropagation()"></td>
      <td class="rk ${rkCls}"><div class="rk-stack"><span class="rk-value">${badge}</span>${chg}</div></td>
      <td><button class="sb${fv?' on':''}" data-n="${esc(r.name)}" aria-label="${fv?L('Usuń z ulubionych'):L('Dodaj do ulubionych')}">${ico('star')}</button></td>
      <td class="c-name">${nameContent}</td>
      ${alCell}
      <td class="r"><div class="sc"><span class="sv">${fmtN(r.score)}</span>${scd}</div></td>
      </tr>
      <tr class="xr" data-for="${r.rank}" style="display:${exp?'':'none'}">
      <td colspan="${ncols}"><div class="dp" id="dp_${r.rank}"></div></td>
      </tr>`;
  });
  h+='</tbody></table></div>';
  // Alliance aggregates banner — shown when filtering players by a single alliance
  let banner='';
  if(synth&&full.length){
    // Count the pool, not the visible rows: a name search narrows S.synthRows down to the
    // matches, but the ranking was still assembled from every player pulled from the base board.
    const poolN=(S.pool||[]).length||full.length;
    banner=`<div class="al-summary">${ico('trophy')} ${L('Ranking „{r}” złożony z {n} najlepszych graczy serwera (gra nie udostępnia takiego rankingu).',{r:esc(evname(S.eventKey)),n:fmtN(poolN)})}</div>`;
  }
  if(filt&&S.filter.alName&&!S.allianceMode&&full.length){
    const sum=full.reduce((s,x)=>s+(x.score||0),0);
    const avg=Math.round(sum/full.length);
    banner=`<div class="al-summary">${ico('columns')} ${L('Sojusz {n}: {c} graczy · suma {sum} · śr. {avg}',{n:esc(S.filter.alName),c:full.length,sum:fmtN(sum),avg:fmtN(avg)})}</div>`;
  }
  if(!rows.length&&(filt||S.rows.length)){
    const sub=filt?L('Wśród {n} pobranych graczy nikt nie pasuje do filtrów.',{n:fmtN((S.pool||[]).length)}):L('Spróbuj wyczyścić filtry lub zmienić kryteria.');
    h=`<div class="st"><div class="si">${ico('search')}</div><div class="sm">${L('Brak wyników po filtrach')}</div><div class="ss">${sub}</div></div>`;
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
    const icon=c.type==='alliance'?ico('shield'):ico('user');
    return`<span class="cChip">${icon}${esc(c.name)}<button class="cChip-rm" data-i="${i}" aria-label="${L('Usuń')}">×</button></span>`;
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
        <div class="cmp-name"><span>${c.type==='alliance'?ico('shield'):ico('user')}<span>${esc(c.name)}</span></span><button class="cmp-rm" data-i="${idx}" aria-label="${L('Usuń')}">×</button></div>
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
function ggtMembersBtn(rank){return `<button class="btn" id="ggtm_btn_${rank}">${ico('users')}<span>${L('Pokaż członków')}</span></button>`}
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
// Protection (peace mode): gge-tracker's peace_disabled_at is null when unprotected, or a future
// timestamp marking when the active protection expires. Returns that epoch (ms) while active, else 0.
function ggtProtectedUntil(p){const t=p.peace_disabled_at?Date.parse(p.peace_disabled_at):0;return t>Date.now()?t:0}
// Compact remaining-time label, e.g. 51d / 5h / 30m (how much protection is left).
function fmtDur(ms){
  if(ms<=0)return'';
  const m=Math.round(ms/60000),h=Math.floor(m/60),d=Math.floor(h/24);
  if(d>=1)return d+L('d');
  if(h>=1)return h+L('h');
  return Math.max(1,m)+L('min');
}
// Sortable columns for the member-stats list — rendered as clickable headers.
// `rank` sorts by in-alliance role (leader = 0 first); negate so the default DESC click lifts the leader to the top.
const GGT_SORTS=[
  {k:'might',l:'Moc',get:p=>p.might_current??0},
  {k:'loot',l:'Rabunek',get:p=>p.loot_current??0},
  {k:'glory',l:'Chwała',get:p=>p.current_fame??0},
  {k:'honor',l:'Honor',get:p=>p.honor??0},
  {k:'level',l:'Poziom',get:p=>(p.legendary_level>0?1e6+p.legendary_level:(p.level??0))},
  {k:'rank',l:'Ranga',get:p=>-(p.alliance_rank??999)},
  {k:'prot',l:'Ochrona',get:p=>ggtProtectedUntil(p)},
];
function renderGgtMembers(box,res){
  const msg=t=>`<div style="color:var(--c-muted);font-size:12px;padding:8px 0">${esc(t)}</div>`;
  if(!res||res.error){box.innerHTML=msg(L('Błąd pobierania danych'));return}
  if(res.unsupported){box.innerHTML=msg(L('Brak danych dla tego serwera'));return}
  const players=res.players||[];
  if(res.notFound||!players.length){box.innerHTML=msg(L('Nie znaleziono sojuszu'));return}
  box._players=players;box._sortK='might';box._sortD=-1;
  paintGgtMembers(box);
}
// Member stat: a small caps key next to the value — replaces the old emoji-per-metric line.
function ggtStat(label,value){return`<span><i class="gtm-k">${L(label)}</i><b>${esc(fmtN(value))}</b></span>`}
function paintGgtMembers(box){
  const players=box._players||[];
  const col=GGT_SORTS.find(s=>s.k===box._sortK)||GGT_SORTS[0],dir=box._sortD;
  const sorted=[...players].sort((a,b)=>{
    const d=col.get(a)-col.get(b);
    return d?d*dir:(a.player_name||'').localeCompare(b.player_name||'');
  });
  const rows=sorted.map((p,i)=>{
    const legendaryLevel=Number.isFinite(+p.legendary_level)?+p.legendary_level:0;
    const level=Number.isFinite(+p.level)?+p.level:0;
    const ll=legendaryLevel>0?`✦${legendaryLevel}`:(level>=70?`✦${level}`:`${level||'?'}`);
    const rkCls=i<3?` rk${i+1}`:'';
    const allianceRank=p.alliance_rank!==null&&p.alliance_rank!==''&&Number.isFinite(+p.alliance_rank)?+p.alliance_rank:null;
    const isLeader=allianceRank===0;
    const roleBadge=isLeader
      ?`<span class="gtm-role gtm-leader" title="${L('Lider sojuszu')}">${ico('crown')}${L('Lider')}</span>`
      :(allianceRank!=null?`<span class="gtm-role" title="${L('Ranga w sojuszu')}: ${allianceRank}">${L('Ranga')} ${allianceRank}</span>`:'');
    const protUntil=ggtProtectedUntil(p);
    const protLeft=protUntil?fmtDur(protUntil-Date.now()):'';
    const protBadge=protUntil?`<span class="gtm-prot" title="${L('Ochrona jeszcze {n} (do {d})',{n:protLeft,d:new Date(protUntil).toLocaleString(curLocale())})}">${ico('shield')}${protLeft}</span>`:'';
    // All-time / peak values (record might, loot, glory, honor) on a dimmer second line.
    const at=[];
    if(p.might_all_time)at.push(ggtStat('Moc',p.might_all_time));
    if(p.loot_all_time)at.push(ggtStat('Rabunek',p.loot_all_time));
    if(p.highest_fame)at.push(ggtStat('Chwała',p.highest_fame));
    if(p.max_honor)at.push(ggtStat('Honor',p.max_honor));
    const atRow=at.length?`<div class="gtm-sub gtm-at"><span class="gtm-at-tag" title="${L('Wartości all-time (rekordowe)')}">${L('Rekord')}</span>${at.join('')}</div>`:'';
    return`<div class="gtm-row${isLeader?' gtm-leader-row':''}" data-search-player="${esc(p.player_name||'')}">
      <div class="gtm-rk${rkCls}">${i+1}</div>
      <div class="gtm-nm">${esc(p.player_name||'—')}${protBadge}${roleBadge}<span class="gtm-lv">Lv ${ll}</span></div>
      <div class="gtm-sub">${ggtStat('Moc',p.might_current)}${ggtStat('Rabunek',p.loot_current)}${ggtStat('Chwała',p.current_fame)}${ggtStat('Honor',p.honor)}</div>
      ${atRow}
    </div>`;
  }).join('');
  const headHtml=GGT_SORTS.map(s=>{
    const on=s.k===box._sortK,arr=on?(dir<0?' ▼':' ▲'):'';
    return`<button class="gtm-sb${on?' active':''}" data-gsort="${s.k}">${L(s.l)}${arr}</button>`;
  }).join('');
  const upd=players.map(p=>p.updated_at).filter(Boolean).sort().pop();
  const updHtml=upd?`<span class="gtm-upd">${L('Zaktualizowano {t}',{t:new Date(upd).toLocaleDateString(curLocale())})}</span>`:'';
  box.innerHTML=`<div class="gtm">
    <div class="gtm-h"><span class="gtm-t">${L('Statystyki członków ({n})',{n:players.length})}</span>${updHtml}</div>
    <div class="gtm-sort">${headHtml}</div>
    <div class="gtm-list">${rows}</div></div>`;
  box.querySelectorAll('[data-gsort]').forEach(b=>{
    b.addEventListener('click',e=>{
      e.stopPropagation();
      const k=b.dataset.gsort;
      if(box._sortK===k)box._sortD=-box._sortD;else{box._sortK=k;box._sortD=-1;}
      paintGgtMembers(box);
    });
  });
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
// `panel` is itself the .dp element, so these paths only switch it to column layout
// instead of nesting a second .dp (which would double the padding).
function allianceFallbackPanel(panel,r,msgText){
  panel.className='dp dp-col';
  panel.innerHTML=`<span class="dp-msg">${esc(msgText)}</span>
    <div class="da">${ggtMembersBtn(r.rank)}</div>
    <div id="ggtm_${r.rank}"></div>`;
  wireGgtMembers(r.rank,r.name);
}

async function renderAllianceDetail(r,panel){
  panel.className='dp dp-col';
  panel.innerHTML=`<div class="st dp-load"><div class="spin"></div></div>`;
  if(!r.allianceId){allianceFallbackPanel(panel,r,L('Brak ID sojuszu'));return}
  try{
    const url=`${GGE_API}/${S.server}/ain/%22AID%22:${r.allianceId}`;
    const d=await timeout(ggeGet(url),8000);
    if(!d||d.return_code!==0){allianceFallbackPanel(panel,r,L('Brak danych'));return}
    const al=d.content.A||d.content;
    const members=Array.isArray(d.content.M)?d.content.M:[];
    const sorted=[...members].sort((a,b)=>(b.MP??b.H??0)-(a.MP??a.H??0));
    // Alliance-wide numbers link to the alliance boards; the attack/defense/loot sums have no
    // alliance leaderboard, so they open the matching player ranking instead.
    const an=r.name;
    const stats=[];
    if(al.MP!=null)stats.push({v:fmtN(al.MP),l:'Moc',link:'allianceMight',mode:'alliance',search:an});
    if(al.CF!=null)stats.push({v:fmtN(al.CF),l:'Punkty chwały',link:'playerGlory',mode:'player'});
    if(al.IS!=null)stats.push({v:al.IS?L('Tak'):L('Nie'),l:'Otwarty'});
    const memberCount=sorted.length||(al.M&&Array.isArray(al.M)?al.M.length:0)||(al.MC??al.NM??0);
    stats.push({v:fmtN(memberCount),l:'Członkowie',link:'allianceHonor',mode:'alliance',search:an});
    if(sorted.length){
      const totalAvp=sorted.reduce((s,m)=>s+(m.AVP??0),0);
      const totalRpt=sorted.reduce((s,m)=>s+(m.RPT??0),0);
      const totalHf=sorted.reduce((s,m)=>s+(m.HF??0),0);
      const totalMp=sorted.reduce((s,m)=>s+(m.MP??0),0);
      if(totalMp>0)stats.push({v:fmtN(Math.round(totalMp/sorted.length)),l:'Śr. moc',link:'allianceMight',mode:'alliance',search:an});
      if(totalAvp>0)stats.push({v:fmtN(totalAvp),l:'Punkty ataku',link:'playerAttack',mode:'player'});
      if(totalRpt>0)stats.push({v:fmtN(totalRpt),l:'Punkty rabunku',link:'playerLoot',mode:'player'});
      if(totalHf>0)stats.push({v:fmtN(totalHf),l:'Punkty obrony',link:'playerDefense',mode:'player'});
    }
    // Description lives in its own full-width section below the tiles — inside .ds it would
    // stretch the stat tiles sharing its grid row to its (tall) height.
    let descBlock='';
    if(al.D&&al.D!=='Opisz swój sojusz.'){
      const descHtml=al.D.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/&lt;br\s*\/?&gt;/gi,'<br>').replace(/&lt;\/?(b|i|u)&gt;/gi,'');
      descBlock=`<div class="dsec">
        <div class="dsec-t">${L('Opis')}</div>
        <div class="dsec-body">${descHtml}</div>
      </div>`;
    }
    const statHtml=statTilesHtml(stats);
    let membersHtml='';
    if(sorted.length){
      membersHtml=`<div class="dsec">
        <div class="dsec-t">${L('Członkowie ({n})',{n:sorted.length})}</div>
        <div class="dmem">
        ${sorted.map(m=>{
          const lvl=m.LL>0?`✦${m.LL}`:(m.L>=70?`✦${m.L}`:(m.L>0?`${m.L}`:'?'));
          return`<button class="dmem-i" data-search-player="${esc(m.N||'')}">
            <span class="dmem-n">${esc(m.N||'—')}</span>
            <span class="dmem-m">Lv ${lvl} · ${esc(fmtN(m.MP??0))}</span>
          </button>`;
        }).join('')}
        </div></div>`;
    }
    const favAl=isFavAl(r.name,S.server);
    panel.className='dp dp-col';
    panel.innerHTML=`<div class="dp-top">
        <div class="ds">${statHtml}</div>
        <div class="da">
          <button class="btn${favAl?' on':''}" id="dfaval_${r.rank}">${ico('star')}<span>${favAl?L('Obserwowany'):L('Obserwuj')}</span></button>
          ${ggtMembersBtn(r.rank)}
        </div>
      </div>
      ${descBlock}
      ${membersHtml}
      <div id="ggtm_${r.rank}"></div>`;
    $(`dfaval_${r.rank}`)?.addEventListener('click',e=>{
      e.stopPropagation();
      toggleFavAl(r.name,S.server,r.allianceId,$(`dfaval_${r.rank}`));
    });
    wireGgtMembers(r.rank,r.name);
    wireStatLinks(panel);
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

// ── Stat tiles (player & alliance detail panels) ──
// Every tile may point at the ranking that ranks that stat, so each number in the panel is a way
// into the matching leaderboard. A tile descriptor is {v,l,link,mode,search,cat}:
//   link   — ranking key ('honorPoints', 'playerAttack', …)
//   mode   — 'player' (default) or 'alliance'; switching flips the players/alliances toggle
//   search — name to look up in the target ranking; empty → jump to that ranking's top
//   cat    — optional category index within the target ranking (e.g. the level bracket)
// The catalogue differs per game/server, so links are validated against the live event list:
// a stat whose ranking is missing renders as a plain, non-clickable tile instead of a dead link.
function statLinkOk(st){
  if(!st||!st.link)return false;
  const list=S.events[st.mode==='alliance'?'alliance':'player']||{};
  return st.link in list;
}
function statTilesHtml(stats){
  return stats.map(st=>{
    const val=String(st.v);
    if(!statLinkOk(st))return`<div class="db db-plain"><div class="db-v">${esc(val)}</div><div class="db-l">${esc(L(st.l))}</div></div>`;
    const eventName=evname(st.link);
    const cat=st.cat!=null?` data-cat="${esc(String(st.cat))}"`:'';
    return`<div class="db" title="${esc(L('Otwórz ranking: {x}',{x:eventName}))}" data-link="${esc(st.link)}" data-mode="${esc(st.mode||'player')}" data-search="${esc(st.search||'')}"${cat}><div class="db-v">${esc(val)}</div><div class="db-l">${esc(L(st.l))}</div><div class="db-hint">${ico('arrow-right')}<span>${esc(eventName)}</span></div></div>`;
  }).join('');
}
function wireStatLinks(panel){
  panel.querySelectorAll('.db[data-link]').forEach(el=>{
    el.addEventListener('click',async e=>{
      e.stopPropagation();
      const linkKey=el.dataset.link,searchVal=el.dataset.search;
      const isAl=el.dataset.mode==='alliance';
      if(isAl!==S.allianceMode){
        S.allianceMode=isAl;
        const pair=S.events.player_to_alliance?.find(p=>p[+!isAl]===S.eventKey);
        if(pair)S.eventKey=pair[+isAl];
        updateTypeSeg();
      }
      if(evList()[linkKey])S.eventKey=linkKey;
      // Set the category before rebuilding the sidebar — buildEventSel() renders the cat bar
      // from S.catIdx, so assigning it afterwards would leave the wrong chip highlighted.
      S.catIdx=el.dataset.cat!=null?+el.dataset.cat:0;
      validateEv();buildEventSel();
      S.curPage=1;clearExpanded();
      if(searchVal){$('searchInput').value=searchVal;await loadRanking(searchVal)}
      else{$('searchInput').value='';await loadRanking('1')}
    });
  });
}
// Index of the honorPoints category covering a player level, so the "Poziom" tile lands on the
// right bracket. Categories are level_placeholder entries like '1-19' … '70' (normalizeCats()
// reverses them, so the index can't be assumed). Returns null when the ranking isn't level-based.
function levelCatIdx(level){
  const cats=(S.events.player||{}).honorPoints?.categories;
  if(!cats?.length||level==null)return null;
  const idx=cats.findIndex(c=>{
    if(c.name!=='level_placeholder')return false;
    const v=String(c.value??'');
    const m=v.match(/^(\d+)\s*-\s*(\d+)$/);
    if(m)return level>=+m[1]&&level<=+m[2];
    const n=+v;return Number.isFinite(n)&&n>0&&level>=n;
  });
  return idx>=0?idx:null;
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
  panel.className='dp';
  const stats=[];
  const pn=r.name;
  // Nobility board: titles (PRE/SUF) and the noble rank (R) are awarded there, so those tiles
  // link to it. Synthetic boards (playerGlory/Attack/Defense/Loot) cover the fields the game
  // publishes no leaderboard for — see SYNTHETIC_PLAYER_EVENTS.
  const nobility='dialog_BeggingKnights_nobilityPoints';
  if(r.honor!=null)stats.push({v:fmtN(r.honor),l:'Honor',link:'honorPoints',mode:'player',search:pn});
  if(r.might!=null)stats.push({v:fmtN(r.might),l:'Moc',link:'playerMight',mode:'player',search:pn});
  if(r.glory!=null)stats.push({v:fmtN(r.glory),l:'Punkty chwały',link:'playerGlory',mode:'player',search:pn});
  if(r.legendLevel!=null&&r.legendLevel>0)stats.push({v:'✦ '+r.legendLevel,l:'Poziom legendarny',link:'legendLevel',mode:'player',search:pn});
  else if(r.level!=null&&r.level>=70)stats.push({v:'✦ '+r.level,l:'Poziom legendarny',link:'legendLevel',mode:'player',search:pn});
  else if(r.level!=null&&r.level>0)stats.push({v:'Lv '+r.level,l:'Poziom',link:'honorPoints',mode:'player',search:pn,cat:levelCatIdx(r.level)});
  if(r.avp!=null)stats.push({v:fmtN(r.avp),l:'Punkty ataku',link:'playerAttack',mode:'player',search:pn});
  if(r.hf!=null)stats.push({v:fmtN(r.hf),l:'Punkty obrony',link:'playerDefense',mode:'player',search:pn});
  if(r.rpt!=null)stats.push({v:fmtN(r.rpt),l:'Punkty rabunku',link:'playerLoot',mode:'player',search:pn});
  if(r.rank2!=null)stats.push({v:fmtN(r.rank2),l:'Ranga',link:nobility,mode:'player',search:pn});
  if(r.pre!=null&&r.pre>0)stats.push({v:String(r.pre),l:'Tytuł (prefix)',link:nobility,mode:'player',search:pn});
  if(r.suf!=null&&r.suf>0)stats.push({v:String(r.suf),l:'Tytuł (suffix)',link:nobility,mode:'player',search:pn});
  // No search term: the score tile opens the current ranking at its top, so it isn't a no-op
  // click that just reloads the same view around this player.
  if(r.score!=null)stats.push({v:fmtN(r.score),l:'Wynik rankingu',link:S.eventKey,mode:'player'});
  if(r.al)stats.push({v:r.al,l:'Sojusz',link:'allianceHonor',mode:'alliance',search:r.al});
  if(r.members!=null)stats.push({v:fmtN(r.members),l:'Członkowie',link:'allianceHonor',mode:'alliance',search:r.al||''});
  const statHtml=statTilesHtml(stats);
  // Mini-sparkline of historical rank (current ranking only)
  const series=getRankSeriesForKey(r.name,histKey(),12);
  const spkHtml=series.length>=2?`
    <div class="spk-wrap dsec">
      <div class="spk-lbl"><span>${ico('activity')}${L('Historia pozycji ({n} pkt)',{n:series.length})}</span><span>#${series[0].rk} → #${r.rank}</span></div>
      ${renderSparklineSVG(series)}
    </div>`:'';
  const favObj=S.favs.find(f=>f.name===r.name&&f.game===game&&f.server===S.server);
  const noteHtml=favObj&&favObj.note?`<div class="dnote">${ico('note')}<span>${esc(favObj.note)}</span></div>`:'';
  const dc=crestImg(r.emblem,88,'dcrest');
  panel.innerHTML=`
    ${dc?`<div class="dcrest-box">${dc}</div>`:''}
    <div class="ds">${statHtml||`<span style="color:var(--c-muted);font-size:12px">${L('Brak szczegółowych danych')}</span>`}</div>
    <div class="da">
      <button class="btn${fv?' on':''}" id="dfav_${rank}">${ico('star')}<span>${fv?L('Obserwowany'):L('Obserwuj')}</span></button>
      <button class="btn" id="dpng_${rank}">${ico('copy')}<span>${L('Kopiuj kartę')}</span></button>
    </div>
    ${noteHtml}
    ${spkHtml}`;
  wireStatLinks(panel);
  $(`dfav_${rank}`)?.addEventListener('click',e=>{
    e.stopPropagation();toggleFav(r.name,game,S.server,null);
    const btn=$(`dfav_${rank}`);if(btn){const now=isFav(r.name,game,S.server);btn.innerHTML=ico('star')+`<span>${now?L('Obserwowany'):L('Obserwuj')}</span>`;btn.classList.toggle('on',now)}
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

// ── Ranking list & cats (sidebar) ──
// The rankings are the app's primary navigation axis, so they render as a scannable
// list in the sidebar rather than a <select>. Name kept for the existing call sites.
function buildEventSel(){
  const box=$('eventList');const list=evList();const keys=Object.keys(list);
  if(!keys.length){box.innerHTML=`<div class="side-empty">${L('Brak')}</div>`;updateViewTitle();return}
  if(!(S.eventKey in list))S.eventKey=keys[0];
  box.innerHTML=keys.map(k=>{
    const n=evname(k),on=k===S.eventKey;
    return`<button class="ev-i${on?' on':''}" data-k="${esc(k)}" role="tab" aria-selected="${on}" title="${esc(n)}">${esc(n)}</button>`;
  }).join('');
  box.querySelectorAll('.ev-i').forEach(el=>el.addEventListener('click',()=>selectEvent(el.dataset.k)));
  updateViewTitle();buildCats();
}
// Picking a ranking always lands on the ranking view, so the list doubles as navigation.
async function selectEvent(k){
  if(typeof setPage==='function'&&S.page!=='ranking')setPage('ranking');
  if(!k||k===S.eventKey)return;
  S.eventKey=k;S.catIdx=0;S.curPage=1;S.compare=[];updateCompareBar();clearExpanded();
  buildEventSel();await reloadCtx();
}
function updateViewTitle(){
  const el=$('viewTitle');if(!el)return;
  el.textContent=S.page==='favorites'?L('Obserwowani gracze'):(evname(S.eventKey)||'GGE Rankings');
}
function buildCats(){
  const cb=$('catBar'),sec=$('catSec');const cats=curEv().categories;
  if(!cats?.length||cats.length<=1){if(sec)sec.style.display='none';return}
  if(sec)sec.style.display='';
  cb.innerHTML=cats.map((c,i)=>{const n=catname(c);return n?`<button class="cat${i===S.catIdx?' on':''}" data-i="${i}">${esc(n)}</button>`:''}).join('');
  cb.querySelectorAll('.cat').forEach(el=>el.addEventListener('click',async()=>{S.catIdx=+el.dataset.i;S.curPage=1;clearExpanded();buildCats();await reloadCtx()}));
}
function updateTypeSeg(){
  $('typeSeg').querySelectorAll('.seg-b').forEach(b=>{
    const active=b.dataset.v===(S.allianceMode?'alliance':'player');
    b.classList.toggle('on',active);
    b.setAttribute('aria-selected',active);
  });
}
