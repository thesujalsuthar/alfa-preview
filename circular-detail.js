/* Circular saw blade details, flying saws and the Alfa blade selection chart. Data: data/circular-details.json */
window.AlfaCircularDetail = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let data = null;

  async function load() {
    try { const r = await fetch('data/circular-details.json'); if (r.ok) data = await r.json(); } catch { data = null; }
    return data;
  }

  // Attach details to the ESPADA ranges and append the flying-saw products
  function merge(products) {
    if (!data) return products;
    const out = products.map(p => {
      const slug = p.id?.startsWith('espada-') ? p.id.slice(7) : null;
      const d = slug && data.ranges[slug];
      if (d?.gallery?.[0]) { p.image = d.gallery[0]; p.imageNote = `${p.name} circular saw blade`; } // showroom reads these records directly
      // clean ESPADA-branded blade photo replaces the catalogue cut-out as the main image
      return d ? { ...p, imageNote: null, details: d, searchAliases: [...(p.searchAliases || []), ...(d.characteristics || []), d.material || ''] } : p;
    });
    const flying = data.flying.map(f => ({
      id: f.slug, name: f.name, category: 'circular-saws', image: f.gallery[0], description: f.title,
      application: f.application, flying: f, details: { gallery: f.gallery },
      searchAliases: ['flying saw', 'tube mill', f.tips, ...(f.specs || []).map(s => s.raw)]
    }));
    return [...out, ...flying];
  }

  /* ---------- selection chart (SVG) ---------- */
  function chartSVG(d = data, opts = {}) {
    const rows = d.chart, max = 180, step = 5;
    const L = 150, W = 980, gridW = W - L - 20, rowH = 26, top = 74, H = top + rows.length * rowH + 46;
    const x = mm => L + (mm / max) * gridW;
    const groups = [...new Set(rows.map(r => r.d))];
    const ink = '#131820', blue = '#0051d2', line = '#dbe1e7', pale = '#eef4fa', muted = '#56616d';
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="alfa-chart-t alfa-chart-d" class="alfa-chart" font-family="Karla, Arial, Helvetica, sans-serif">`;
    s += `<title id="alfa-chart-t">Alfa blade selection chart</title><desc id="alfa-chart-d">Recommended cutting material thickness for each blade diameter and number of teeth.</desc>`;
    s += `<rect width="${W}" height="${H}" fill="#fff"/>`;
    s += `<text x="0" y="22" font-size="18" font-weight="700" fill="${ink}" font-family="Arial, Helvetica, sans-serif" letter-spacing="-0.4">Blade selection chart</text>`;
    s += `<text x="${W}" y="22" font-size="11" fill="${blue}" text-anchor="end" font-weight="700" letter-spacing="1.6">ALFA PRECISION TECHNOLOGIES</text>`;
    s += `<rect x="0" y="34" width="${W}" height="${top - 34}" fill="${blue}"/>`;
    s += `<text x="12" y="${top - 13}" font-size="11" font-weight="700" fill="#fff" letter-spacing="0.8">DIAMETER</text><text x="${L - 58}" y="${top - 13}" font-size="11" font-weight="700" fill="#fff" letter-spacing="0.8">TEETH</text>`;
    s += `<text x="${L + gridW / 2}" y="50" font-size="11" font-weight="700" fill="#fff" text-anchor="middle" letter-spacing="0.8">CUTTING MATERIAL THICKNESS (mm)</text>`;
    for (let mm = 0; mm <= max; mm += 10) s += `<text x="${x(mm)}" y="${top - 8}" font-size="10" fill="#dce8ff" text-anchor="middle">${mm}</text>`;
    // group bands
    groups.forEach((g, gi) => {
      const idx = rows.findIndex(r => r.d === g), n = rows.filter(r => r.d === g).length, y = top + idx * rowH;
      if (gi % 2 === 0) s += `<rect x="0" y="${y}" width="${W}" height="${n * rowH}" fill="${pale}"/>`;
      s += `<text x="12" y="${y + n * rowH / 2 + 5}" font-size="15" font-weight="700" fill="${ink}">Ø ${g}</text>`;
      s += `<line x1="0" x2="${W}" y1="${y + n * rowH}" y2="${y + n * rowH}" stroke="#aab9cb" stroke-width="1"/>`;
    });
    for (let mm = 0; mm <= max; mm += step) s += `<line x1="${x(mm)}" x2="${x(mm)}" y1="${top}" y2="${top + rows.length * rowH}" stroke="${line}" stroke-width="${mm % 10 ? 0.5 : 1}"/>`;
    rows.forEach((r, i) => {
      const y = top + i * rowH;
      s += `<text x="${L - 58}" y="${y + rowH / 2 + 4}" font-size="12" fill="${muted}">${r.z} T</text>`;
      s += `<g><title>Ø${r.d} mm, ${r.z} teeth: ${r.min}–${r.max} mm</title><rect x="${x(r.min)}" y="${y + 7}" width="${x(r.max) - x(r.min)}" height="${rowH - 14}" rx="${(rowH - 14) / 2}" fill="${blue}"/>`;
      s += `<text x="${x(r.max) + 6}" y="${y + rowH / 2 + 4}" font-size="10" fill="${blue}" font-weight="700">${r.min}–${r.max}</text></g>`;
    });
    s += `<text x="0" y="${H - 14}" font-size="10.5" fill="${muted}">Bars show the recommended solid-material thickness range per blade. Confirm the final blade specification for your machine with the Alfa application team.</text>`;
    return s + '</svg>';
  }

  /* ---------- page pieces ---------- */
  const list = items => `<ul class="cd-list">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
  function gallery(p, imgs) {
    return `<div class="machine-gallery"><div class="detail-image"><img id="machine-main" src="${esc(imgs[0])}" alt="${esc(p.name)}"></div>${imgs.length > 1 ? `<div class="machine-thumbs" role="group" aria-label="Product images">${imgs.map((src, i) =>
      `<button type="button" data-src="${esc(src)}" aria-label="Show image ${i + 1} of ${imgs.length}" aria-pressed="${i === 0}"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}</div>`;
  }
  function sizesTable(sizes) {
    if (!sizes?.length) return '';
    const ds = [...new Set(sizes.map(s => s.d))];
    return `<section class="section cd-sizes" style="border-top:1px solid var(--line)"><div class="section-head"><h2>Available sizes.</h2><p>${sizes.length} standard specifications. Other sizes on request.</p></div>
<div class="cd-chips" role="group" aria-label="Filter by diameter"><button type="button" class="active" data-d="">All</button>${ds.map(d => `<button type="button" data-d="${d}">Ø ${d}</button>`).join('')}</div>
<div class="table-scroll"><table class="cd-table"><thead><tr><th>Outer Ø D (mm)</th><th>Bore d (mm)</th><th>Kerf B (mm)</th><th>Teeth Z</th><th>Specification</th></tr></thead><tbody>${sizes.map(s =>
      `<tr data-d="${s.d}"><td>${s.d}</td><td>${s.bore}</td><td>${s.kerf}</td><td>${s.z}</td><td><code>${s.d}×${s.bore}×${s.kerf.toFixed(s.kerf % 1 ? 2 : 1).replace(/0$/, '')}×${s.z}T</code></td></tr>`).join('')}</tbody></table></div></section>`;
  }
  function pinTable(pins) {
    if (!pins?.length) return '';
    return `<h3>Pin holes by bore</h3><div class="table-scroll"><table class="cd-table cd-pins"><thead><tr><th>Bore (mm)</th><th>Pin holes (count / Ø / PCD)</th></tr></thead><tbody>${pins.map(r => `<tr><td>${esc(r.bore)}</td><td>${esc(r.pins)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function formulas() {
    const f = data.formulas;
    return `<div class="cd-formulas"><div><p class="label">Cutting amount</p><p class="cd-eq">${esc(f.fz)}</p><p class="small">Fz: cut per tooth (mm) · F: feed speed (mm/min) · N: spindle speed (rpm) · Z: number of teeth</p><p><strong>Bar</strong> ${esc(f.recommended.bar)}<br><strong>Pipe</strong> ${esc(f.recommended.pipe)}</p></div>
<div><p class="label">Cutting speed</p><p class="cd-eq">${esc(f.v)}</p><p class="small">V: cutting line speed (m/min) · D: outer diameter (mm) · N: spindle speed (rpm)</p><p>${esc(f.recommended.vLow)}<br>${esc(f.recommended.vHigh)}</p></div></div>`;
  }
  function chartSection() {
    return `<section class="section cd-chart-section" style="border-top:1px solid var(--line)"><div class="section-head"><h2>Blade selection chart.</h2><a class="text-link" href="assets/circular/alfa-blade-selection-chart.svg" download>Download chart (SVG) <span aria-hidden="true">↓</span></a></div>
<div class="cd-chart">${chartSVG()}</div>${formulas()}</section>`;
  }

  function detail(p, h) {
    const d = p.details || {}, f = p.flying;
    const imgs = d.gallery?.length ? d.gallery : [p.image];
    const specRows = f
      ? [['Application', f.application], ['Machine', f.machine], ['Cutting speed', f.speed], ['Cut per tooth, Fz', f.feed], ['Tips', f.tips]]
      : [...(p.specs || []).slice(1), ...(d.equipment ? [['Equipment', d.equipment]] : []), ...(d.material ? [['Material', d.material]] : []), ...(d.rpm ? [['Spindle speed', d.rpm.replace('N=', '').replace('--', '–')]] : [])];
    const chars = f ? f.features : (d.characteristics?.length ? d.characteristics : (p.features || []).map(x => x.title));
    const related = h.products.filter(x => x.category === 'circular-saws' && x.id !== p.id).slice(0, 4);
    return `<section class="page-top">${h.crumb(p.name, true)}</section>
<section class="detail-hero machine-hero">${gallery(p, imgs)}<div class="detail-copy"><p class="label">${p.brand ? esc(p.brand) + ' / ' : ''}Circular saw blades${f ? ' / Flying saws' : ''}</p><h1>${esc(p.name)}</h1><p>${esc(f ? f.title : p.description)}</p>
${f?.intro ? `<p>${esc(f.intro[0])}</p>` : ''}${chars.length ? `<h3>Characteristics</h3>${list(chars)}` : ''}
${h.button('Enquire about this blade', `#/contact?product=${encodeURIComponent(p.name)}`)}
${p.id.startsWith('espada-') ? `<a class="download-link" href="#/showroom?range=circular-saws">Explore this blade in 3D ${h.arrow}</a>` : ''}${p.pdf ? `<a class="download-link" href="${esc(p.pdf)}" target="_blank" rel="noopener">↓ View product catalogue (PDF)</a>` : ''}</div></section>
<section class="section detail-info"><div><h2>Specifications.</h2><div class="table-scroll"><table class="machine-spec"><tbody>${specRows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table></div>${pinTable(d.pinholes)}<p class="small">Confirm the blade specification against your machine before ordering.</p></div>
<div>${d.toothShape ? `<figure class="cd-tooth"><img src="${esc(d.toothShape)}" alt="Tooth shape of ${esc(p.name)}" loading="lazy"><figcaption>Tooth shape</figcaption></figure>` : ''}${f ? flyingAside(f) : ''}<a class="text-link" href="#/support">Get application support ${h.arrow}</a></div></section>
${f ? flyingBody(f) : ''}${sizesTable(d.sizes)}${d.chart ? chartSection() : ''}
${related.length ? `<section class="section" style="border-top:1px solid var(--line)"><div class="section-head"><h2>Explore the range.</h2><a class="text-link" href="#/products/circular-saws">View all ${h.arrow}</a></div><div class="product-grid">${related.map(h.productCard).join('')}</div></section>` : ''}`;
  }
  function flyingAside(f) {
    return f.applications?.length ? `<h3>Applications</h3>${list(f.applications.filter(a => !/:$/.test(a)))}` : '';
  }
  function flyingBody(f) {
    let s = '';
    if (f.intro?.length > 1 || f.benefits?.length) s += `<section class="section two-col" style="border-top:1px solid var(--line)"><div class="prose">${(f.intro || []).slice(1).map(t => `<p>${esc(t)}</p>`).join('')}</div><div class="cd-benefits">${(f.benefits || []).map(([t, x]) => `<div><h3>${esc(t)}</h3><p>${esc(x)}</p></div>`).join('')}</div></section>`;
    if (f.specs?.length) s += `<section class="section" style="border-top:1px solid var(--line)"><div class="section-head"><h2>Standard specifications.</h2><p>Tooth designs R, P and ZYT. Custom specifications on request.</p></div><div class="table-scroll"><table class="cd-table"><thead><tr><th>Outer Ø (mm)</th><th>Bore (mm)</th><th>Kerf / plate (mm)</th><th>Teeth</th><th>Tooth design</th><th>Pin holes</th></tr></thead><tbody>${f.specs.map(r =>
      `<tr><td>${r.d}</td><td>${r.bore}</td><td>${esc(r.kerf)} / ${esc(r.plate)}</td><td>${r.z}</td><td>${esc(r.tooth)}</td><td>${esc(r.pins || '—')}</td></tr>`).join('')}</tbody></table></div></section>`;
    if (f.select?.length) { const [lead, ...items] = f.select; s += `<section class="section two-col" style="border-top:1px solid var(--line)"><div><h2>Choosing the right blade.</h2><p class="muted">${esc(lead)}</p></div><dl class="machine-facts">${items.map(i => { const [k, ...v] = i.split(':'); return `<div><dt>${esc(k)}</dt><dd>${esc(v.join(':').trim())}</dd></div>`; }).join('')}</dl></section>`; }
    if (f.faq?.length) s += `<section class="section two-col" style="border-top:1px solid var(--line)"><h2>Frequently asked questions.</h2><div class="faq">${f.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></section>`;
    return s;
  }

  function bind() {
    const main = document.querySelector('#machine-main');
    document.querySelectorAll('.machine-thumbs button').forEach(b => b.addEventListener('click', () => {
      main.src = b.dataset.src; document.querySelectorAll('.machine-thumbs button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    }));
    document.querySelectorAll('.cd-chips button').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.cd-chips button').forEach(x => x.classList.toggle('active', x === b));
      document.querySelectorAll('.cd-sizes tbody tr').forEach(tr => { tr.hidden = !!b.dataset.d && tr.dataset.d !== b.dataset.d; });
    }));
  }

  return { load, merge, detail, bind, chartSVG, get data() { return data; } };
})();
