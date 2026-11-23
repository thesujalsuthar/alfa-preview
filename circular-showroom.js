/* Circular station shares the company shell and the existing 3D gallery. */
window.AlfaCircular = (() => {
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>window.AlfaExperience.icon(name);
  const catalogue=()=>window.AlfaCircularCatalogue;
  const stationTabs=active=>`<div class="showroom-stations" role="navigation" aria-label="Showroom stations"><a href="#/showroom" ${active==='bimetal'?'aria-current="page"':''}>Bimetal bandsaws</a><a href="#/showroom?range=circular-saws" ${active==='circular'?'aria-current="page"':''}>Circular saws</a></div>`;
  function showroom() {
    const {products,pdf}=catalogue();
    return `<section class="showroom-page circular-showroom" aria-labelledby="showroom-title"><div class="showroom-heading"><div><a href="#/">${icon('back')} Back to home</a><h1 id="showroom-title">Alfa showroom</h1></div>${stationTabs('circular')}</div>
      <div class="showroom-workspace"><div class="showroom-stage" id="showroom-stage"><div id="showroom-scene" class="showroom-canvas" role="img" aria-label="Interactive 3D display of nine ESPADA circular saw blade choices"></div><div class="scene-loading" id="scene-loading"><span></span><p>Preparing the circular saw display…</p></div><div id="showroom-markers" class="showroom-markers" aria-label="Circular saw blades in the display"></div><div class="scene-controls"><button type="button" id="scene-reset" aria-label="Reset showroom view">${icon('reset')}</button><button type="button" id="scene-expand" aria-label="Expand 3D view">${icon('expand')}</button></div><span class="scene-hint">Drag to orbit · Scroll to zoom</span><span class="circular-scene-title">ESPADA <span>Circular saw blades</span></span></div>
      <aside class="showroom-panel circular-panel" aria-label="Circular blade information"><div class="circular-browser"><button class="showroom-back" id="circular-back" data-circular-overview type="button" hidden>${icon('back')} All circular blades</button><p class="showroom-label">ESPADA CIRCULAR SAW BLADES</p><p class="circular-instruction" id="circular-instruction">Hover over a blade to preview its details. Click to inspect it.</p><details class="circular-type-picker"><summary>Browse all 9 blade types</summary><div class="circular-type-list" aria-label="Browse circular blade types">${products.map(p=>`<button type="button" data-circular-blade="${p.id}" aria-pressed="false">${escape(p.name)}</button>`).join('')}</div></details></div><div id="circular-details" aria-live="polite" aria-atomic="false"></div></aside></div>
      <div class="showroom-bottom"><p id="scene-status" role="status">Illustrative models. Catalogue specifications are shown alongside.</p><a href="${pdf}" target="_blank" rel="noopener">Open circular saw catalogue ${icon('arrow')}</a></div>
      <dialog id="circular-guide" class="circular-guide" aria-labelledby="circular-guide-title"><div class="guide-heading"><h2 id="circular-guide-title">Blade selection guide</h2><button type="button" data-close-guide aria-label="Close selection guide">Close ×</button></div><p>Shared reference chart from catalogue page 4. Confirm the exact configuration for your blade and machine.</p><div class="guide-content">${window.AlfaCircularDetail?.data?`<div class="guide-chart">${window.AlfaCircularDetail.chartSVG()}</div>`:`<img src="assets/circular/selection-guide.webp" alt="Catalogue chart of cutting material thickness against blade diameter and number of teeth, followed by cutting amount and speed formulas.">`}<div><table><caption>Diameter / tooth-count combinations in the guide</caption><thead><tr><th>Diameter (mm)</th><th>Teeth</th></tr></thead><tbody>${catalogue().guide.map(([d,t])=>`<tr><td>${d}</td><td>${t.join(', ')}</td></tr>`).join('')}</tbody></table><h3>Catalogue formulas</h3><p><strong>V = π × D × N / 1000</strong><br>V: cutting speed (m/min); D: outer diameter (mm); N: spindle speed (rpm).</p><p><strong>Fz = F / (N × Z)</strong><br>F: feed speed (mm/min); N: spindle speed; Z: number of teeth. Consult the PDF for its feed notation and reference values.</p><a class="button" href="${pdf}#page=4" target="_blank" rel="noopener">Open catalogue page 4 ${icon('arrow')}</a></div></div></dialog></section>`;
  }
  function mount(query) {
    const {products,pdf}=catalogue();
    const shell=document.querySelector('.circular-showroom'), stage=shell.querySelector('.showroom-stage'), details=shell.querySelector('#circular-details');
    let scene,disposed=false,preview=null,pinned=null;
    const abort=new AbortController(),signal=abort.signal;
    const guide=shell.querySelector('#circular-guide');
    shell.querySelector('.circular-type-picker').open=matchMedia('(max-width:800px)').matches;
    function previewBlade(id,force=false) {
      const p=products.find(p=>p.id===id);if(!p || (!force && (pinned || preview?.id===id)))return;
      preview=p;
      if(matchMedia('(min-width:801px)').matches)shell.querySelector('.circular-panel').scrollTop=0;
      shell.querySelectorAll('[data-circular-blade]').forEach(b=>{b.classList.toggle('is-preview',b.dataset.circularBlade===id);b.setAttribute('aria-pressed',String(pinned===b.dataset.circularBlade));});
      scene?.highlight(id);
      details.innerHTML=`<div class="circular-detail-heading"><div><p class="showroom-label">${escape(p.family==='HSS SAW'?'HSS COATING OPTION':'CERMET / TIPPED RANGE')}</p><h2>${escape(p.name)}</h2></div><img src="${p.image}" alt="${escape(p.imageNote)}"></div><p class="circular-tips">${escape(p.tips)}</p>
        <dl class="circular-specs"><div><dt>Application</dt><dd>${escape(p.application)}</dd></div><div><dt>Machine compatibility</dt><dd>${escape(p.machine)}</dd></div><div><dt>Cutting speed</dt><dd>${escape(p.speed||'Not specified for this HSS coating in the catalogue.')}</dd></div>${p.bar?`<div><dt>Bar feed · Fz</dt><dd>${escape(p.bar)}</dd></div>`:''}${p.tube?`<div><dt>Tube feed · Fz</dt><dd>${escape(p.tube)}</dd></div>`:''}</dl>
        <div class="circular-features">${p.features.map(f=>`<div><h4>${escape(f.title)}</h4><p>${escape(f.text)}</p></div>`).join('')}</div><p class="circular-reference">Catalogue page ${p.page}. Fz values are reproduced as printed; use the catalogue’s definitions and confirm operating settings for your machine.</p>
        <div class="circular-detail-actions"><button class="button" type="button" ${pinned?'data-circular-overview':'data-inspect-current'}>${pinned?'Back to all blades':'Inspect in 3D'} ${icon(pinned?'back':'arrow')}</button><button class="circular-guide-link" type="button" data-open-guide>Sizes & selection guide ${icon('arrow')}</button><a href="${p.pdf}" target="_blank" rel="noopener">View catalogue page ${p.page} ${icon('arrow')}</a><a href="#/contact?product=${encodeURIComponent('ESPADA '+p.name)}">Enquire about this blade ${icon('arrow')}</a></div>`;
      const fallback=stage.querySelector('.scene-fallback-image');if(fallback){fallback.src=p.image;fallback.alt=p.imageNote;}
    }
    function inspect(id,update=true) {
      const p=products.find(p=>p.id===id);if(!p)return;
      pinned=id;previewBlade(id,true);scene?.select(id);
      shell.querySelector('#circular-back').hidden=false;
      shell.querySelector('#circular-instruction').textContent='Drag to examine the blade. Choose another type, or return to the full display.';
      shell.querySelector('#scene-status').textContent='ESPADA '+p.name+' selected. Illustrative geometry; refer to the catalogue for specifications.';
      if(update)history.replaceState(null,'','#/showroom?range=circular-saws&product='+encodeURIComponent(id));
      if(update && matchMedia('(max-width:800px)').matches)stage.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
    }
    function overview(){
      pinned=null;scene?.overview();previewBlade(preview?.id||products[0].id,true);
      shell.querySelector('#circular-back').hidden=true;
      shell.querySelector('#circular-instruction').textContent='Hover over a blade to preview its details. Click to inspect it.';
      history.replaceState(null,'','#/showroom?range=circular-saws');
      shell.querySelector('#scene-status').textContent='Illustrative models. Catalogue specifications are shown alongside.';
      if(matchMedia('(max-width:800px)').matches)stage.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
    }
    shell.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;const b=e.target.closest('[data-circular-blade]');if(b)previewBlade(b.dataset.circularBlade);},{signal});
    shell.addEventListener('focusin',e=>{const b=e.target.closest('[data-circular-blade]');if(b)previewBlade(b.dataset.circularBlade);},{signal});
    shell.addEventListener('click',e=>{
      const b=e.target.closest('[data-circular-blade]');if(b)inspect(b.dataset.circularBlade);
      if(e.target.closest('[data-inspect-current]')&&preview)inspect(preview.id);
      if(e.target.closest('[data-circular-overview]'))overview();
      if(e.target.closest('#scene-reset'))pinned?scene?.select(pinned):scene?.overview();
      if(e.target.closest('#scene-expand')){const expanded=shell.classList.toggle('expanded-scene');shell.querySelector('#scene-expand').setAttribute('aria-label',expanded?'Restore product information':'Expand 3D view');scene?.resize();}
      if(e.target.closest('[data-open-guide]'))guide.showModal();
      if(e.target.closest('[data-close-guide]'))guide.close();
    },{signal});
    const initial=products.find(p=>p.id===query.get('product'));
    if(initial)inspect(initial.id,false);else previewBlade(products[0].id,true);
    import('./product-scene.mjs?v=circular-1').then(m=>{
      if(disposed)return;
      scene=m.createShowroom(shell.querySelector('#showroom-scene'),products,{kind:'circular',markers:shell.querySelector('#showroom-markers'),onSelect:inspect,onHover:previewBlade});
      shell.querySelector('#scene-loading').hidden=true;
      if(pinned)scene.select(pinned,true);else scene.highlight(preview.id);
    }).catch(()=>{
      if(disposed)return;
      shell.querySelector('#scene-loading').hidden=true;stage.classList.add('scene-unavailable');
      const image=document.createElement('img');image.className='scene-fallback-image';image.src=preview.image;image.alt=preview.imageNote;
      shell.querySelector('#showroom-scene').replaceChildren(image);shell.querySelector('.scene-controls').hidden=true;
      shell.querySelector('.scene-hint').textContent='Browse the blade types alongside for catalogue details.';
    });
    return ()=>{disposed=true;abort.abort();if(guide.open)guide.close();scene?.dispose();};
  }
  return {showroom,mount,stationTabs};
})();
