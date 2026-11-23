/* Machine models: band saws and CNC circular saws. Data: data/machine-models.json */
window.AlfaMachines = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SHOW_VIDEOS = false; // video links off for now
  let types = [];

  async function load() {
    try {
      const r = await fetch('data/machine-models.json');
      if (!r.ok) return [];
      const d = await r.json();
      types = d.types || [];
      return (d.models || []).map(m => ({ ...m, searchAliases: [m.model, m.typeName, ...(m.highlights || []).map(h => h.value)] }));
    } catch { return []; }
  }

  const familyName = { 'band-saw': 'Band saws', 'circular-saw': 'CNC circular saws' };

  // Filter row for #/products/machines?type=...  (type may also be a family id)
  function filters(active) {
    const fam = f => types.filter(t => t.family === f);
    const link = (id, label, n) => `<a href="#/products/machines${id ? '?type=' + id : ''}" class="${(active || '') === id ? 'active' : ''}">${esc(label)}${n != null ? `<span>${n}</span>` : ''}</a>`;
    const total = types.reduce((a, t) => a + t.count, 0);
    return `<div class="machine-types" aria-label="Machine types">${link('', 'All machines', null)}${Object.keys(familyName).map(f =>
      `<div class="machine-type-group"><p class="label">${link(f, familyName[f], fam(f).reduce((a, t) => a + t.count, 0))}</p>${fam(f).map(t => link(t.id, t.name.replace(/^CNC circular saws — /, ''), t.count)).join('')}</div>`).join('')}<p class="small">${total} machine models</p></div>`;
  }
  const matches = (p, type) => !type || p.type === type || p.family === type;

  function specTable(rows, caption) {
    return `<div class="table-scroll"><table class="machine-spec">${caption ? `<caption class="small">${esc(caption)}</caption>` : ''}<tbody>${rows.map((r, i) =>
      `<tr>${r.map(c => { const tag = i === 0 ? 'th' : 'td'; return `<${tag}${c.rs ? ` rowspan="${c.rs}"` : ''}${c.cs ? ` colspan="${c.cs}"` : ''}>${esc(c.t)}</${tag}>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  const list = items => `<ul class="machine-list">${items.map(i => `<li>${esc(i.replace(/\.$/, ''))}</li>`).join('')}</ul>`;

  function detail(p, h) {
    const imgs = p.gallery.length ? p.gallery : [p.image];
    const gallery = `<div class="machine-gallery"><div class="detail-image"><img id="machine-main" src="${esc(imgs[0])}" alt="${esc(p.name)}"></div>${imgs.length > 1 ? `<div class="machine-thumbs" role="group" aria-label="Product images">${imgs.map((src, i) =>
      `<button type="button" data-src="${esc(src)}" aria-label="Show image ${i + 1} of ${imgs.length}" aria-pressed="${i === 0}"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}</div>`;
    const facts = p.highlights.length ? `<dl class="machine-facts">${p.highlights.map(x => `<div><dt>${esc(x.label)}</dt><dd>${esc(x.value)}</dd></div>`).join('')}</dl>` : '';
    const tech = p.specTables.length
      ? p.specTables.map((t, i) => specTable(t, p.specTables.length > 1 ? `Table ${i + 1}` : '')).join('')
      : p.specText.length ? list(p.specText) : '<p class="muted">Contact us for the full specification.</p>';
    const related = h.products.filter(x => x.id !== p.id && x.type === p.type).slice(0, 4);
    const videos = SHOW_VIDEOS && p.videos.length ? `<h3>Videos</h3>${p.videos.map(v => `<a class="download-link" href="https://www.youtube.com/watch?v=${esc(v)}" target="_blank" rel="noopener">Watch on YouTube ${h.arrow}</a>`).join('')}` : '';
    return `<section class="page-top">${h.crumb(p.name, true)}</section>
<section class="detail-hero machine-hero">${gallery}<div class="detail-copy"><p class="label"><a href="#/products/machines?type=${esc(p.type)}">${esc(p.typeName)}</a></p><h1>${esc(p.name)}</h1><p class="code">MODEL / ${esc(p.model)}</p>${p.intro.map(t => `<p>${esc(t)}</p>`).join('')}${facts}${h.button('Enquire about this machine', `#/contact?product=${encodeURIComponent(p.name)}`)}</div></section>
<section class="section detail-info"><div><h2>Specifications.</h2>${tech}<p class="small" style="margin-top:20px">Specifications may change. Confirm capacity, blade size, power supply and options with our team before ordering.</p></div><div>${p.standard.length ? `<h3>Standard equipment</h3>${list(p.standard)}` : ''}${p.optional.length ? `<h3>Optional equipment</h3>${list(p.optional)}` : ''}${!p.standard.length && !p.optional.length ? `<h3>Equipment & options</h3><p class="muted">Ask our team about standard equipment, options and automation for this model.</p>` : ''}${videos}<a class="text-link" href="#/contact?subject=${encodeURIComponent('Machine application: ' + p.model)}">Discuss your application ${h.arrow}</a></div></section>
${related.length ? `<section class="section" style="border-top:1px solid var(--line)"><div class="section-head"><h2>More ${esc(p.typeName.toLowerCase())}.</h2><a class="text-link" href="#/products/machines?type=${esc(p.type)}">View all ${h.arrow}</a></div><div class="product-grid">${related.map(h.productCard).join('')}</div></section>` : ''}`;
  }

  function bind() {
    const main = document.querySelector('#machine-main'); if (!main) return;
    document.querySelectorAll('.machine-thumbs button').forEach(b => b.addEventListener('click', () => {
      main.src = b.dataset.src;
      document.querySelectorAll('.machine-thumbs button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    }));
  }

  return { load, filters, matches, detail, bind, get types() { return types; } };
})();
