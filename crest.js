// gge-rankings — crest.js (classic script, shared global scope). Renders GGE coats of arms (the `E`
// emblem field) on a plain canvas from a baked, same-origin asset pack (crest/ — webp + crest.json).
// The pack was extracted once from the official HTML5 client; the compositing recipe mirrors the
// game's CrestHelper: a shield with 4 colorable regions (cc0..3) + up to 2 flat-recolored symbols.
(function(global){
  const BASE='crest';
  const BGT_MAP=[[0,0,0,0],[0,1,0,1],[0,0,1,1],[0,1,1,0]]; // plain / horizontal / vertical / four-X
  // The source geometry fills each symbol slot edge-to-edge, which makes neighboring
  // emblems overlap visually. Keep some breathing room inside every slot.
  const SYMBOL_SCALE=0.72;
  function hex(c){return '#'+('000000'+((c>>>0)&0xffffff).toString(16)).slice(-6)}

  const Crest={
    ready:false, m:null, _imgs:null, _cache:new Map(), _readyCbs:[],
    load(){
      if(this._loading)return this._loading;
      const img=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src});
      this._loading=fetch(BASE+'/crest.json').then(r=>r.json()).then(m=>{
        this.m=m;
        return Promise.all([
          img(BASE+'/shield_under.webp'),img(BASE+'/shield_over.webp'),
          img(BASE+'/region0.webp'),img(BASE+'/region1.webp'),img(BASE+'/region2.webp'),img(BASE+'/region3.webp'),
          img(BASE+'/symbols.webp')
        ]);
      }).then(a=>{
        this._imgs={under:a[0],over:a[1],regions:[a[2],a[3],a[4],a[5]],symbols:a[6]};
        this.ready=true;
        this._readyCbs.splice(0).forEach(cb=>{try{cb()}catch(e){}});
        return this;
      }).catch(e=>{console.warn('Crest pack load failed:',e&&e.message);return null});
      return this._loading;
    },
    onReady(cb){ if(this.ready)cb(); else this._readyCbs.push(cb); },

    // tint a whole image flat (alpha preserved)
    _tintImg(img,color){
      const o=document.createElement('canvas');o.width=img.naturalWidth||img.width;o.height=img.naturalHeight||img.height;
      const c=o.getContext('2d');c.drawImage(img,0,0);c.globalCompositeOperation='source-in';c.fillStyle=hex(color);c.fillRect(0,0,o.width,o.height);return o;
    },
    // tint one atlas sub-rect flat
    _tintRect(atlas,fr,color){
      const o=document.createElement('canvas');o.width=fr.w;o.height=fr.h;const c=o.getContext('2d');
      c.drawImage(atlas,fr.x,fr.y,fr.w,fr.h,0,0,fr.w,fr.h);c.globalCompositeOperation='source-in';c.fillStyle=hex(color);c.fillRect(0,0,fr.w,fr.h);return o;
    },
    draw(ctx,E,size){
      const m=this.m,im=this._imgs;if(!m||!im||!E)return;
      const k=size/m.size,L=m.layers,SS=m.atlasScale||1;
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      const blit=(img,lay)=>{if(lay&&lay.w)ctx.drawImage(img,lay.x*k,lay.y*k,lay.w*k,lay.h*k)};
      blit(im.under,L.under);
      const map=BGT_MAP[E.BGT]||BGT_MAP[0],cols=[E.BGC1,E.BGC2];
      for(let r=0;r<4;r++)if(L.regions[r].w)blit(this._tintImg(im.regions[r],cols[map[r]]),L.regions[r]);
      const g=m.geo[E.SPT]||m.geo[1];
      if(g)g.slots.forEach(slot=>{
        const id=slot.c===1?E.S1:E.S2, col=slot.c===1?E.SC1:E.SC2, fr=m.atlas.frames[id];
        if(!fr)return;
        const s=Math.min(g.box[0]/fr.bw,g.box[1]/fr.bh)*SYMBOL_SCALE;
        const ccx=slot.cx+fr.ox*s, ccy=slot.cy+fr.oy*s, dw=(fr.w/SS)*s*k, dh=(fr.h/SS)*s*k;
        ctx.drawImage(this._tintRect(im.symbols,fr,col),ccx*k-dw/2,ccy*k-dh/2,dw,dh);
      });
      blit(im.over,L.over);
    },
    canvas(E,size){const cv=document.createElement('canvas');cv.width=cv.height=size;this.draw(cv.getContext('2d'),E,size);return cv},
    // cached data URL (same-origin pack → no canvas taint, safe for the card export)
    url(E,size){
      if(!this.ready||!E)return '';
      const key=size+':'+E.BGT+','+E.BGC1+','+E.BGC2+','+E.SPT+','+E.S1+','+E.SC1+','+E.S2+','+E.SC2;
      let u=this._cache.get(key);
      if(u===undefined){try{u=this.canvas(E,size).toDataURL('image/png')}catch(e){u=''}this._cache.set(key,u)}
      return u;
    }
  };
  global.Crest=Crest;
  // Start loading immediately; once ready, refresh any rendered table/detail so crests appear.
  Crest.load().then(()=>{
    if(!Crest.ready)return;
    if(typeof renderTable==='function' && global.S && S.rows && S.rows.length) renderTable();
  });
})(window);
