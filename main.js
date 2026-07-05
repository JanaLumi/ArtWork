/* ============================================================
   Art@Work — main.js
   ============================================================ */

const ARTWORK_BASE = 'https://raw.githubusercontent.com/JanaLumi/ArtWork/main/artworks/paintings/';
const COLOUR_TOLERANCE = 60; // Euclidean distance threshold for fuzzy colour matching

let allPaintings = [];
let lastSearch = {};

/* ── Load data ── */
async function init() {
  try {
    const res = await fetch('artworks.json');
    allPaintings = await res.json();
    renderResults(allPaintings);
    initColourPicker();
    initAccordion();
    initPaletteBar();
  } catch (err) {
    console.error('Could not load artworks.json', err);
  }
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

/* ── Palette bar (signature element) ── */
function initPaletteBar() {
  updatePaletteBar([]);
}

function updatePaletteBar(colours) {
  const bar = document.getElementById('palette-bar');
  if (!bar) return;

  bar.innerHTML = '';

  // Default: show a gentle gradient of the brand palette
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
  const picker = document.getElementById('colour-picker');
  const rInput = document.getElementById('colour-r');
  const gInput = document.getElementById('colour-g');
  const bInput = document.getElementById('colour-b');
  const hexInput = document.getElementById('colour-hex');

  if (!picker) return;

  picker.addEventListener('input', () => {
    const rgb = hexToRgb(picker.value);
    rInput.value = rgb.r;
    gInput.value = rgb.g;
    bInput.value = rgb.b;
    hexInput.value = picker.value.toUpperCase();
    updatePaletteBar([picker.value]);
  });

  function syncFromRgb() {
    const r = parseInt(rInput.value) || 0;
    const g = parseInt(gInput.value) || 0;
    const b = parseInt(bInput.value) || 0;
    const hex = rgbToHex(r, g, b);
    picker.value = hex;
    hexInput.value = hex.toUpperCase();
    updatePaletteBar([hex]);
  }

  function syncFromHex() {
    const hex = hexInput.value.trim();
    if (/^#?[0-9a-fA-F]{6}$/.test(hex)) {
      const normalised = hex.startsWith('#') ? hex : '#' + hex;
      picker.value = normalised;
      const rgb = hexToRgb(normalised);
      rInput.value = rgb.r;
      gInput.value = rgb.g;
      bInput.value = rgb.b;
      updatePaletteBar([normalised]);
    }
  }

  [rInput, gInput, bInput].forEach(el => el.addEventListener('input', syncFromRgb));
  hexInput.addEventListener('input', syncFromHex);
}

/* ── Search ── */
function getSearchParams() {
  const colourActive = document.getElementById('filter-colour')?.checked;
  const uvOnly = document.getElementById('filter-uv')?.checked;
  const shapeVal = document.getElementById('filter-shape')?.value;
  const supportVal = document.getElementById('filter-support')?.value;

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
  const grid = document.getElementById('paintings-grid');
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
    const imgSrc = ARTWORK_BASE + encodeURIComponent(p.filename);
    const swatches = p.colours.map(c =>
      `<span class="swatch" style="background:rgb(${c.r},${c.g},${c.b})" title="rgb(${c.r},${c.g},${c.b})"></span>`
    ).join('');
    const uvBadge = p.uv_active ? `<div class="uv-badge">UV active</div>` : '';
    const price = p.price_eur
      ? `€${p.price_eur}`
      : (p.framed === 'open' ? 'Contact for price' : 'POA');
    const dims = `${p.width_cm} × ${p.height_cm} cm`;

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

/* ── Search button ── */
function bindSearch() {
  const btn = document.getElementById('btn-search');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const params = getSearchParams();
    const results = applySearch(params);
    renderResults(results);

    // Scroll to results
    document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });

    // If colour filter active, update palette bar with search colour
    if (params.colourRgb) {
      const hex = rgbToHex(params.colourRgb.r, params.colourRgb.g, params.colourRgb.b);
      updatePaletteBar([hex]);
    }
  });

  const btnReset = document.getElementById('btn-reset');
  if (!btnReset) return;
  btnReset.addEventListener('click', () => {
    document.getElementById('filter-colour').checked = false;
    document.getElementById('filter-uv').checked = false;
    document.getElementById('filter-shape').value = 'any';
    document.getElementById('filter-support').value = 'any';
    updatePaletteBar([]);
    renderResults(allPaintings);
  });
}

/* ── Accordion (request form) ── */
function initAccordion() {
  const trigger = document.getElementById('accordion-trigger');
  const body = document.getElementById('accordion-body');
  if (!trigger || !body) return;

  trigger.addEventListener('click', () => {
    const isOpen = body.classList.contains('open');
    body.classList.toggle('open', !isOpen);
    trigger.setAttribute('aria-expanded', String(!isOpen));

    // Prefill from last search when opening
    if (!isOpen) {
      prefillRequestForm();
      body.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

function prefillRequestForm() {
  // Copy shape filter
  const shapeEl = document.getElementById('request-shape');
  if (shapeEl && lastSearch.shapeVal && lastSearch.shapeVal !== 'any') {
    // check the matching checkbox
    const cb = shapeEl.querySelector(`input[value="${lastSearch.shapeVal}"]`);
    if (cb) cb.checked = true;
  }

  // Copy colour
  if (lastSearch.colourRgb) {
    const hex = rgbToHex(lastSearch.colourRgb.r, lastSearch.colourRgb.g, lastSearch.colourRgb.b);
    const colourField = document.getElementById('request-colour-hex');
    if (colourField) colourField.value = hex.toUpperCase();

    const note = document.getElementById('request-colour-note');
    if (note) note.textContent = `Colour preference carried over from your search: ${hex.toUpperCase()}`;
  }

  // UV
  if (lastSearch.uvOnly) {
    const uvCb = document.getElementById('request-uv');
    if (uvCb) uvCb.checked = true;
  }
}

/* ── Request form submission ── */
function bindRequestForm() {
  const form = document.getElementById('request-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const entry = Object.fromEntries(data.entries());

    // Collect checkboxes manually
    entry['art_types'] = [...form.querySelectorAll('input[name="art_type"]:checked')].map(el => el.value).join(', ');

    // For now: log and show confirmation (Google Sheets integration goes here)
    console.log('Request entry:', entry);
    showRequestConfirmation();
  });
}

function showRequestConfirmation() {
  const form = document.getElementById('request-form');
  const conf = document.getElementById('request-confirmation');
  if (form) form.style.display = 'none';
  if (conf) conf.style.display = 'block';
}

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => {
  init();
  bindSearch();
  bindRequestForm();
});
