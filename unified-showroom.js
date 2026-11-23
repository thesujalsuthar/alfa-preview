/* A shared room with an inclined bandsaw tray and a freestanding circular display. */
window.AlfaShowroom=(()=>{
  const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=n=>window.AlfaExperience.icon(n);
  const circular=p=>p.category==='circular-saws';
  const ranges=[['bimetal-bandsaws','Bimetal bandsaws','Bandsaws'],['circular-saws','Circular saw blades','Circular blades']];
  const catalogue=products=>products.filter(p=>ranges.some(([r])=>p.category===r));
  function showroom(products){
    const blades=catalogue(products);
    return `<section class="showroom-page unified-showroom" aria-labelledby="showroom-title">
      <div class="showroom-heading"><div><a href="#/">${icon('back')} Back to home</a><h1 id="showroom-title">Alfa showroom</h1></div><nav class="room-navigation" aria-label="Move around the showroom"><button type="button" data-room="all" aria-pressed="true">Overview</button>${ranges.map(([r,n,short])=>`<button type="button" data-room="${r}" aria-pressed="false">${short}</button>`).join('')}<button type="button" data-browse aria-expanded="false">Browse products</button></nav></div>
      <div class="showroom-workspace"><div class="showroom-stage" id="showroom-stage">
        <div id="showroom-scene" class="showroom-canvas" role="img" aria-label="Alfa showroom with an inclined bandsaw tray and freestanding circular blade display"></div><div class="scene-loading" id="scene-loading"><span></span><p>Opening the Alfa showroom…</p></div><div id="showroom-markers" class="showroom-markers" aria-label="Products in the showroom"></div>
        <button type="button" class="room-return" data-return-display hidden>${icon('back')} Back to display</button>
        <div class="room-hover-card" hidden><span class="showroom-label" id="room-hover-family"></span><strong id="room-hover-name"></strong><button type="button" data-inspect>Inspect blade ${icon('arrow')}</button></div>
        <div class="scene-controls"><button type="button" id="scene-reset" aria-label="Reset showroom view">${icon('reset')}</button><button type="button" id="scene-expand" aria-label="Expand 3D view">${icon('expand')}</button><button type="button" data-zoom="in" aria-label="Zoom in">+</button><button type="button" data-zoom="out" aria-label="Zoom out">−</button></div><span class="scene-hint"><span class="room-desktop-hint">Scroll to zoom · Drag to look · Right-drag to move</span><span class="room-touch-hint">Pinch to zoom · Drag to rotate</span></span>
      </div><aside class="showroom-panel room-panel" aria-label="Blade information"><button class="room-panel-close" type="button" data-close-panel aria-label="Close product information">×</button><div class="room-intro"><h2>Explore the range</h2><p>Select a blade to open its 3D inspection and product details.</p></div><div class="room-product-browser">${ranges.map(([r,n])=>`<details data-range-list="${r}"><summary>${n}<span>${blades.filter(p=>p.category===r).length}</span></summary><div class="room-product-list">${blades.filter(p=>p.category===r).map(p=>`<button type="button" data-room-product="${e(p.id)}" aria-pressed="false">${e(p.name)} ${icon('arrow')}</button>`).join('')}</div></details>`).join('')}</div><div id="room-details" aria-live="polite"></div></aside></div>
      <div class="showroom-bottom"><p id="scene-status" role="status">Scroll to zoom. Select a display to explore the blades.</p><a href="#/products">Product catalogue ${icon('arrow')}</a></div>${window.AlfaCircular.showroom().match(/<dialog[\s\S]*<\/dialog>/)[0]}</section>`;
  }
  function mount(products,query){
    const blades=catalogue(products),shell=document.querySelector('.unified-showroom'),panel=shell.querySelector('.room-panel'),details=shell.querySelector('#room-details'),stage=shell.querySelector('.showroom-stage'),status=shell.querySelector('#scene-status'),guide=shell.querySelector('dialog'),hover=shell.querySelector('.room-hover-card');
    let scene,disposed=false,selected=null,preview=null,currentRange='all';
    const abort=new AbortController(),signal=abort.signal;
    const address=()=>history.replaceState(null,'','#/showroom'+(selected?'?product='+encodeURIComponent(selected.id):currentRange!=='all'?'?range='+currentRange:''));
    function setPanel(open){shell.classList.toggle('panel-open',open);shell.querySelector('[data-browse]').setAttribute('aria-expanded',String(open));scene?.resize();}
    function updateNavigation(){shell.querySelectorAll('.room-navigation [data-room]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.room===currentRange)));}
    function renderDetails(p,pin){
      const circ=circular(p);
      details.innerHTML=`<div class="circular-detail-heading"><div><p class="showroom-label">${circ?'ESPADA / CIRCULAR SAWS':'ALFA / BIMETAL BANDSAWS'}</p><h2>${e(p.name)}</h2><a class="room-product-page" href="#/product/${e(p.id)}">Open product page ${icon('arrow')}</a></div><img src="${e(p.image)}" alt="${e(p.imageNote||p.name+' catalogue photograph')}"></div><p class="room-description">${e(circ?p.tips:p.description.replaceAll(' · ','. '))}</p>
      <dl class="circular-specs"><div><dt>Application</dt><dd>${e(p.application.replace(/\s-\s/g,' · ').replace(/^-\s*/,''))}</dd></div>${circ?`<div><dt>Machine compatibility</dt><dd>${e(p.machine)}</dd></div><div><dt>Cutting speed</dt><dd>${e(p.speed||'Not specified for this coating in the catalogue.')}</dd></div>${p.bar?`<div><dt>Bar feed · Fz</dt><dd>${e(p.bar)}</dd></div>`:''}${p.tube?`<div><dt>Tube feed · Fz</dt><dd>${e(p.tube)}</dd></div>`:''}`:''}</dl>
      ${!circ?window.AlfaBimetal.applications(p):''}${!circ?`<div class="room-feature-buttons" aria-label="Examine blade features"><button type="button" data-feature="tooth" aria-pressed="false">Tooth geometry</button><button type="button" data-feature="pitch" aria-pressed="false">Tooth pitch</button><button type="button" data-feature="body" aria-pressed="false">Blade body</button></div><p id="room-feature-text">Choose a feature to examine the blade up close.</p>`:''}
      <div class="circular-features">${(p.features||[]).map(f=>`<div><h3>${e(f.title)}</h3><p>${e(f.text)}</p></div>`).join('')}</div>
      ${!circ?window.AlfaBimetal.sidebar(p):`<p class="circular-reference">Catalogue page ${p.page}. ${p.bar||p.tube?'Fz values are reproduced as printed; confirm settings for your machine.':'The catalogue does not provide speed or feed settings for this coating.'}</p>`}
      <div class="circular-detail-actions"><button class="button" type="button" data-inspect="${e(p.id)}">${pin?'Reset blade view':'Inspect blade'} ${icon('reset')}</button><button type="button" data-room="${p.category}">Back to this display ${icon('back')}</button>${circ?'<button type="button" data-open-guide>Sizes & selection guide</button>':'<a href="#/alfacalc">Open ALFACALC</a>'}<a href="${e(p.pdf)}" target="_blank" rel="noopener">${circ?'Catalogue page '+p.page:'Product catalogue'} ${icon('arrow')}</a><a href="#/contact?product=${encodeURIComponent((circ?'ESPADA ':'')+p.name)}">Enquire about ${e(p.name)} ${icon('arrow')}</a></div>`;
    }
    function show(id,pin=false,fromList=false){
      const p=blades.find(p=>p.id===id);if(!p||(!pin&&selected))return;
      if(preview===id&&!pin&&!fromList)return;preview=id;scene?.highlight(id);
      if(!pin&&!fromList){hover.hidden=false;hover.querySelector('#room-hover-name').textContent=p.name;hover.querySelector('#room-hover-family').textContent=circular(p)?'Circular saw blade':'Bimetal bandsaw';hover.querySelector('[data-inspect]').dataset.inspect=id;return;}
      if(pin){
        selected=p;currentRange=p.category;hover.hidden=true;shell.classList.add('product-open');setPanel(true);updateNavigation();address();
        shell.querySelector('#showroom-scene').setAttribute('aria-label','Interactive 3D inspection of '+p.name);
        shell.querySelector('[data-return-display]').hidden=false;shell.querySelector('.room-intro').hidden=true;shell.querySelectorAll('[data-range-list]').forEach(d=>d.open=false);
      }
      shell.querySelectorAll('[data-room-product]').forEach(b=>b.setAttribute('aria-pressed',String(selected?.id===b.dataset.roomProduct)));
      renderDetails(p,pin);
      if(pin){scene?.select(id);panel.scrollTop=0;status.textContent=p.name+' · Product inspection. Drag to rotate; scroll to zoom.';}
      const fallback=stage.querySelector('.scene-fallback-image');if(fallback){fallback.src=p.image;fallback.alt=p.name;}
      if(pin&&matchMedia('(max-width:800px)').matches)stage.scrollIntoView({block:'start',behavior:'smooth'});
    }
    function room(range,instant=false){
      currentRange=ranges.some(([r])=>r===range)?range:'all';selected=null;preview=null;hover.hidden=true;details.replaceChildren();scene?.highlight(null);
      shell.querySelector('#showroom-scene').setAttribute('aria-label','Alfa showroom with an inclined bandsaw tray and freestanding circular blade display');
      shell.classList.remove('product-open');setPanel(false);shell.querySelector('[data-return-display]').hidden=true;shell.querySelector('.room-intro').hidden=false;updateNavigation();
      shell.querySelectorAll('[data-room-product]').forEach(b=>b.setAttribute('aria-pressed','false'));shell.querySelectorAll('[data-range-list]').forEach(d=>d.open=d.dataset.rangeList===currentRange);
      currentRange==='all'?scene?.overview(instant):scene?.focusStation(currentRange,instant);address();status.textContent='Scroll to zoom · Drag to look around · Select a blade to open it';
    }
    function feature(id){
      if(!selected||circular(selected))return;scene?.feature(id);shell.querySelectorAll('[data-feature]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.feature===id)));
      shell.querySelector('#room-feature-text').textContent=id==='tooth'?(selected.features?.[0]?.text||selected.description):id==='pitch'?'Refer to the catalogue for the available constant and variable pitches.':'Match blade width and thickness to your machine.';
    }
    shell.addEventListener('click',ev=>{
      const b=ev.target.closest('button');if(!b)return;
      if(b.dataset.room)room(b.dataset.room);
      if(b.dataset.roomProduct||b.dataset.inspect)show(b.dataset.roomProduct||b.dataset.inspect,true);
      if(b.dataset.feature)feature(b.dataset.feature);
      if(b.hasAttribute('data-return-display'))room(currentRange);
      if(b.hasAttribute('data-browse')){hover.hidden=true;setPanel(!shell.classList.contains('panel-open'));}
      if(b.hasAttribute('data-close-panel'))selected?room(currentRange):setPanel(false);
      if(b.id==='scene-reset')selected?show(selected.id,true):room('all');
      if(b.id==='scene-expand'){const expanded=shell.classList.toggle('expanded-scene');b.setAttribute('aria-label',expanded?'Exit expanded showroom':'Expand 3D view');document.body.classList.toggle('showroom-expanded',expanded);document.querySelector('body>header').inert=expanded;scene?.resize();}
      if(b.dataset.zoom)scene?.zoom(b.dataset.zoom==='in'?.8:1.25);
      if(b.hasAttribute('data-open-guide'))guide.showModal();if(b.hasAttribute('data-close-guide'))guide.close();
    },{signal});
    shell.addEventListener('pointerover',ev=>{if(ev.pointerType==='touch')return;const b=ev.target.closest('[data-room-product]');if(b)show(b.dataset.roomProduct,false,true);},{signal});
    shell.addEventListener('focusin',ev=>{const b=ev.target.closest('[data-room-product]');if(b)show(b.dataset.roomProduct,false,true);},{signal});
    const initial=blades.find(p=>p.id===window.AlfaBimetal.resolveId(query.get('product')));room(initial?initial.category:query.get('range'));if(initial)show(initial.id,true);
    import('./product-scene.mjs?v=profiles-1').then(async m=>{
      await m.loadShowroomVectors();if(disposed)return;
      scene=m.createShowroom(shell.querySelector('#showroom-scene'),blades,{kind:'unified',markers:shell.querySelector('#showroom-markers'),onSelect:id=>show(id,true),onHover:id=>show(id),onStation:room,onFeature:feature});
      shell.querySelector('#scene-loading').hidden=true;if(selected)scene.select(selected.id,true);else if(currentRange!=='all')scene.focusStation(currentRange,true);
    }).catch(error=>{
      if(disposed)return;console.error('Showroom could not be loaded',error);shell.querySelector('#scene-loading').hidden=true;stage.classList.add('scene-unavailable');const img=document.createElement('img');img.className='scene-fallback-image';img.src=selected?.image||blades[0].image;img.alt='Alfa catalogue product photograph';shell.querySelector('#showroom-scene').replaceChildren(img);shell.querySelector('.scene-controls').hidden=true;shell.querySelector('.scene-hint').textContent='3D is unavailable. Use Browse products for catalogue details.';
    });
    return()=>{disposed=true;abort.abort();document.body.classList.remove('showroom-expanded');document.querySelector('body>header').inert=false;if(guide.open)guide.close();scene?.dispose();};
  }
  return {showroom,mount};
})();
