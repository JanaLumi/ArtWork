/* ============================================================
   Art@Work — main.js
   Parses artworks.csv directly via PapaParse (CDN)
   ============================================================ */

const ARTWORK_BASE = 'https://raw.githubusercontent.com/JanaLumi/ArtWork/main/artworks/paintings/';
const COLOUR_TOLERANCE = 60;

let allPaintings = [];
let lastSearch = {};

/* ── Load and parse CSV ── */
function init() {
  Papa.parse('artworks.csv', {
    download: true,
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    complete: ({ data }) => {
      allPaintings = data.map(normalisePainting);
      renderResults(allPaintings);
      initColourPicker();
      initAccordion();
      initPaletteBar();
      bindSearch();
      bindRequestForm();
    },
    error: (err) => console.error('Could not load artworks.csv', err)
  });
}

/* ── Normalise a CSV row into a usable object ── */
function normalisePainting(row) {
  // Build colours array from up to 4 RGB triplets
  const colours = [];
  for (let i = 1; i <= 4; i++) {
    const r = row[`colour${i}_r`];
    const g = row[`colour${i}_g`];
    const b = row[`colour${i}_b`];
    if (r !== '' && r != null) colours.push({ r: +r, g: +g, b: +b });
  }

  return {
    filename:    row.filename,
    title:       row.title || row.filename,
    material:    row.material,
    support:     row.support,
    width_cm:    row.width_cm,
    height_cm:   row.height_cm,
    shape:       row.shape,
    year:        row.year,
    description: row.description,
    colours,
    uv_active:   row.uv_active === true || String(row.uv_active).toLowerCase() === 'yes',
    framed:      row.framed,
    price_eur:   row.price_eur || null,
    available:   row.available === true || String(row.available).toLowerCase() === 'yes'
  };
}

/* ── Colour utilities ── */
function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => {
    const h = Math.max(0, Math.min(255, Math.round(v))).toString(16);
    return h.length === 1 ? '0' + h : h;
  }).join('');
}

function colourDistance(a, b) {
  return Math.sqrt(
    Math.pow(a.r - b.r, 2) +
    Math.pow(a.g - b.g, 2) +
    Math.pow(a.b - b.b, 2)
  );
}

function paintingMatchesColour(painting, targetRgb) {
  return painting.colours.some(c => colourDistance(c, targetRgb) <= COLOUR_TOLERANCE);
}

/* ── Palette bar ── */
function initPaletteBar() {
  updatePaletteBar([]);
}

function updatePaletteBar(colours) {
  const bar = document.getElementById('palette-bar');
  if (!bar) return;
  bar.innerHTML = '';
  const defaults = ['#1C1C1A', '#2E4A3E', '#8B6F4E', '#C4B8A8', '#F2EDE4'];
  const toShow = colours.length > 0 ? colours : defaults;
  toShow.forEach(hex => {
    const seg = document.createElement('div');
    seg.className = 'palette-segment';
    seg.style.background = hex;
    bar.appendChild(seg);
  });
}

/* ── Colour picker sync ── */
function initColourPicker() {
  const picker  = document.getElementById('colour-picker');
  const rInput  = document.getElementById('colour-r');
  const gInput  = document.getElementById('colour-g');
  const bInput  = document.getElementById('colour-b');
  const hexInput = document.getElementById('colour-hex');
  if (!picker) return;

  picker.addEventListener('input', () => {
    const rgb = hexToRgb(picker.value);
    rInput.value  = rgb.r;
    gInput.value  = rgb.g;
    bInput.value  = rgb.b;
    hexInput.value = picker.value.toUpperCase();
    updatePaletteBar([picker.value]);
  });

  function syncFromRgb() {
    const hex = rgbToHex(+rInput.value || 0, +gInput.value || 0, +bInput.value || 0);
    picker.value   = hex;
    hexInput.value = hex.toUpperCase();
    updatePaletteBar([hex]);
  }

  function syncFromHex() {
    const hex = hexInput.value.trim();
    if (/^#?[0-9a-fA-F]{6}$/.test(hex)) {
      const n = hex.startsWith('#') ? hex : '#' + hex;
      picker.value = n;
      const rgb = hexToRgb(n);
      rInput.value = rgb.r;
      gInput.value = rgb.g;
      bInput.value = rgb.b;
      updatePaletteBar([n]);
    }
  }

  [rInput, gInput, bInput].forEach(el => el.addEventListener('input', syncFromRgb));
  hexInput.addEventListener('input', syncFromHex);
}

/* ── Search ── */
function getSearchParams() {
  const colourActive = document.getElementById('filter-colour')?.checked;
  const uvOnly       = document.getElementById('filter-uv')?.checked;
  const shapeVal     = document.getElementById('filter-shape')?.value;
  const supportVal   = document.getElementById('filter-support')?.value;

  let colourRgb = null;
  if (colourActive) {
    const hex = document.getElementById('colour-picker')?.value;
    if (hex) colourRgb = hexToRgb(hex);
  }

  return { colourRgb, uvOnly, shapeVal, supportVal };
}

function applySearch(params) {
  lastSearch = params;
  return allPaintings.filter(p => {
    if (!p.available) return false;
    if (params.uvOnly && !p.uv_active) return false;
    if (params.shapeVal && params.shapeVal !== 'any' && p.shape !== params.shapeVal) return false;
    if (params.supportVal && params.supportVal !== 'any' && p.support !== params.supportVal) return false;
    if (params.colourRgb && !paintingMatchesColour(p, params.colourRgb)) return false;
    return true;
  });
}

function renderResults(paintings) {
  const grid  = document.getElementById('paintings-grid');
  const count = document.getElementById('results-count');
  if (!grid) return;

  count.textContent = `${paintings.length} work${paintings.length !== 1 ? 's' : ''} found`;

  if (paintings.length === 0) {
    grid.innerHTML = `<p class="mono" style="color:var(--mid);grid-column:1/-1;">
      No works matched those filters. Scroll down to make a request — I'll reach out to my network.
    </p>`;
    return;
  }

  grid.innerHTML = paintings.map(p => {
    const imgSrc   = ARTWORK_BASE + encodeURIComponent(p.filename);
    const swatches = p.colours.map(c =>
      `<span class="swatch" style="background:rgb(${c.r},${c.g},${c.b})" title="rgb(${c.r},${c.g},${c.b})"></span>`
    ).join('');
    const uvBadge = p.uv_active ? `<div class="uv-badge">UV active</div>` : '';
    const price   = p.price_eur ? `€${p.price_eur}` : (p.framed === 'open' ? 'Contact for price' : 'POA');
    const dims    = `${p.width_cm} × ${p.height_cm} cm`;

    return `
      <article class="painting-card" data-filename="${p.filename}">
        <img src="${imgSrc}" alt="${p.title}" loading="lazy">
        <div class="card-body">
          <div class="card-title">${p.title}</div>
          <div class="card-meta">
            ${p.material} on ${p.support}<br>
            ${dims} · ${p.shape}<br>
            ${p.year}<br>
            ${price}
          </div>
          <div class="card-swatches">${swatches}</div>
          ${uvBadge}
        </div>
      </article>
    `;
  }).join('');
}

/* ── Search buttons ── */
function bindSearch() {
  document.getElementById('btn-search')?.addEventListener('click', () => {
    const params  = getSearchParams();
    const results = applySearch(params);
    renderResults(results);
    document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (params.colourRgb) {
      updatePaletteBar([rgbToHex(params.colourRgb.r, params.colourRgb.g, params.colourRgb.b)]);
    }
  });

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    document.getElementById('filter-colour').checked = false;
    document.getElementById('filter-uv').checked     = false;
    document.getElementById('filter-shape').value    = 'any';
    document.getElementById('filter-support').value  = 'any';
    updatePaletteBar([]);
    renderResults(allPaintings);
  });
}

/* ── Accordion ── */
function initAccordion() {
  const trigger = document.getElementById('accordion-trigger');
  const body    = document.getElementById('accordion-body');
  if (!trigger || !body) return;

  trigger.addEventListener('click', () => {
    const isOpen = body.classList.contains('open');
    body.classList.toggle('open', !isOpen);
    trigger.setAttribute('aria-expanded', String(!isOpen));
    if (!isOpen) {
      prefillRequestForm();
      body.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

function prefillRequestForm() {
  if (lastSearch.shapeVal && lastSearch.shapeVal !== 'any') {
    const cb = document.querySelector(`#request-shape input[value="${lastSearch.shapeVal}"]`);
    if (cb) cb.checked = true;
  }
  if (lastSearch.colourRgb) {
    const hex = rgbToHex(lastSearch.colourRgb.r, lastSearch.colourRgb.g, lastSearch.colourRgb.b);
    const field = document.getElementById('request-colour-hex');
    if (field) field.value = hex.toUpperCase();
    const note = document.getElementById('request-colour-note');
    if (note) note.textContent = `Colour carried over from your search: ${hex.toUpperCase()}`;
  }
  if (lastSearch.uvOnly) {
    const cb = document.getElementById('request-uv');
    if (cb) cb.checked = true;
  }
}

/* ── Request form ── */
function bindRequestForm() {
  document.getElementById('request-form')?.addEventListener('send', (e) => {
    e.preventDefault();
    const data  = new FormData(e.target);
    const entry = Object.fromEntries(data.entries());
    entry.art_types = [...e.target.querySelectorAll('input[name="art_type"]:checked')]
      .map(el => el.value).join(', ');
    console.log('Request entry:', entry);
    // Google Sheets / Apps Script POST goes here
    document.getElementById('request-form').style.display  = 'none';
    document.getElementById('request-confirmation').style.display = 'block';
  });
}

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', init);
