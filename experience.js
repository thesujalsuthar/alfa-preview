/* Company homepage and the first guided product station. Scene code loads on demand. */
window.AlfaExperience = (() => {
  const icon = (name) => {
    const paths = {
      arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
      back: '<path d="M20 12H5m6-6-6 6 6 6"/>',
      cube: '<path d="m12 3 9 5v9l-9 5-9-5V8l9-5Zm0 10v9M3 8l9 5 9-5M8 5l9 5"/>',
      calc: '<rect x="5" y="2" width="14" height="20" rx="1"/><path d="M8 6h8M8 11h2m4 0h2m-8 4h2m4 0h2m-8 4h2m4 0h2"/>',
      pause: '<path d="M9 5v14m6-14v14"/>',
      play: '<path d="m8 4 12 8-12 8V4Z"/>',
      reset: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    };
    return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.arrow}</svg>`;
  };
  const escape = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ranges = [
    ['bimetal-bandsaws', 'Bimetal bandsaws', 'assets/products/SW-MS/alfa_MS_product1.webp'],
    ['holesaws', 'Holesaws', 'assets/products/Holesaw/alfa_product_holesaw4.webp'],
    ['circular-saws', 'Circular saws', 'assets/circular-saw.png'],
    ['machines', 'Machines', 'assets/machine.png']
  ];

  function home() {
    return `<section class="precision-hero" aria-labelledby="precision-title">
      <div class="precision-media" id="hero-scene" aria-hidden="true"></div>
      <div class="precision-copy"><h1 id="precision-title">Precision<br>for every cut.</h1><p>Saw blades, machines and application expertise.</p><a class="button" href="#/products">Explore products ${icon('arrow')}</a></div>
      <button class="motion-control" id="hero-motion" type="button" aria-label="Pause hero animation">${icon('pause')}<span>Pause motion</span></button>
    </section>
    <section class="precision-services" aria-label="Digital tools">
      <div class="showroom-invite">${icon('cube')}<h2>Explore the Alfa showroom.</h2><a class="button light" href="#/showroom">Enter showroom ${icon('arrow')}</a></div>
      <a class="calc-invite" href="#/alfacalc">${icon('calc')}<span><strong>ALFACALC</strong><span>Find your cutting setup ${icon('arrow')}</span></span></a>
    </section>
    <section class="precision-ranges"><div class="precision-section-title"><h2>Tools for the way you cut.</h2><a href="#/products">All products ${icon('arrow')}</a></div><div class="precision-range-grid">${ranges.map(r => `<a class="precision-range" href="#/products/${r[0]}"><div><img src="${r[2]}" alt="${r[1]}" loading="lazy"></div><h3>${r[1]}</h3><span>View range ${icon('arrow')}</span></a>`).join('')}</div></section>
    <section class="precision-support"><h2>Technical support.</h2><p>Product selection, application advice and cutting parameters.</p><a href="#/support">Talk to our team ${icon('arrow')}</a></section>
    <section class="precision-about"><h2>From blade to machine.<br>A complete sawing solution.</h2><div><p>Explore Alfa’s cutting tools, sawing machines and application resources. Find product specifications in the technical library, or start with your material in ALFACALC.</p><a class="text-link" href="#/about">About Alfa ${icon('arrow')}</a><a class="text-link" href="#/downloads">Catalogues & data sheets ${icon('arrow')}</a></div></section>`;
  }

  function showroom(products,query=new URLSearchParams()) {
    return window.AlfaShowroom.showroom(products);
  }

  function mountHome() {
    const container = document.querySelector('#hero-scene');
    const button = document.querySelector('#hero-motion');
    let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const showState = () => {
      button.innerHTML = icon(paused ? 'play' : 'pause') + `<span>${paused ? 'Play motion' : 'Pause motion'}</span>`;
      button.setAttribute('aria-label', paused ? 'Play hero animation' : 'Pause hero animation');
      container.classList.toggle('motion-paused', paused);
    };
    showState();
    const toggle = () => { paused = !paused; showState(); };
    button.addEventListener('click', toggle);
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const change = e => {paused = e.matches;showState();};
    preference.addEventListener('change',change);
    return () => { button.removeEventListener('click', toggle); preference.removeEventListener('change',change); };
  }

  function mountShowroom(products,query) {
    return window.AlfaShowroom.mount(products,query);
  }
  return {home, showroom, mountHome, mountShowroom, icon};
})();
