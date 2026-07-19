/* ============================================================
   Art@Work — main.js
   Search, filters, results grid, lightbox, accordion, form
   CSV parsed via PapaParse
   ============================================================ */

const ARTWORK_BASE  = 'https://raw.githubusercontent.com/JanaLumi/ArtWork/main/artworks/paintings/';
const AUDIO_BASE    = 'https://raw.githubusercontent.com/JanaLumi/ArtWork/main/audio/';
const COLOUR_TOLERANCE   = 60;
const MAX_SEARCH_COLOURS = 3;

/* ── Lighting types ── */
const LIGHT_TYPES = [
  { id: 'daylight',     label: 'Daylight',     icon: 'elements/light-daylight.svg',     filter: 'brightness(1.05) saturate(1.0)' },
  { id: 'overcast',     label: 'Overcast',     icon: 'elements/light-overcast.svg',     filter: 'brightness(0.95) saturate(0.85) hue-rotate(5deg)' },
  { id: 'fluorescent',  label: 'Fluorescent',  icon: 'elements/light-fluorescent.svg',  filter: 'brightness(1.0) saturate(0.9) hue-rotate(-8deg)' },
  { id: 'led',          label: 'LED',          icon: 'elements/light-led.svg',          filter: 'brightness(1.02) saturate(0.95) hue-rotate(2deg)' },
  { id: 'halogen',      label: 'Halogen',      icon: 'elements/light-halogen.svg',      filter: 'brightness(1.05) saturate(1.1) sepia(0.08)' },
  { id: 'incandescent', label: 'Incandescent', icon: 'elements/light-incandescent.svg', filter: 'brightness(0.95) saturate(1.2) sepia(0.25) hue-rotate(-5deg)' },
  { id: 'candlelight',  label: 'Candlelight',  icon: 'elements/light-candlelight.svg',  filter: 'brightness(0.85) saturate(1.4) sepia(0.45) hue-rotate(-10deg)', flicker: true },
  { id: 'fireplace',    label: 'Fireplace',    icon: 'elements/light-fireplace.svg',    filter: 'brightness(0.8) saturate(1.6) sepia(0.55) hue-rotate(-15deg)', flicker: true, heavy: true },
];

/* Default light per time-of-day mood */
const MOOD_LIGHT_DEFAULTS = {
  dawn:       'candlelight',
  morning:    'daylight',
  midday:     'daylight',
  afternoon:  'halogen',
  dusk:       'incandescent',
  blue_hour:  'led',
  evening:    'incandescent',
  deep_night: 'candlelight',
  clear:      'daylight',
  overcast:   'overcast',
  rain:       'overcast',
  snow:       'overcast',
  fog:        'fluorescent',
  storm:      'led',
  hot:        'daylight',
  cold:       'fluorescent',
};

let currentLightIdx  = 0; // index into LIGHT_TYPES
let flickerInterval  = null;

let allPaintings  = [];
let lastSearch    = {};
let searchColours = []; // array of hex strings, max 3

/* ── Mobile nav accordion ── */
function initMobileNav() {
  const toggle = document.getElementById('nav-mobile-toggle');
  const panel  = document.getElementById('nav-collapsible');
  if (!toggle || !panel) return;

  function closePanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    const arrow = toggle.querySelector('.nav-mobile-arrow');
    if (arrow) arrow.style.transform = '';
  }

  function openPanel() {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    const arrow = toggle.querySelector('.nav-mobile-arrow');
    if (arrow) arrow.style.transform = 'rotate(180deg)';
  }

  toggle.addEventListener('click', () => {
    panel.classList.contains('open') ? closePanel() : openPanel();
  });

  // Close when any link inside is tapped
  panel.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', closePanel);
  });

  // Close when tapping outside the nav
  document.addEventListener('click', e => {
    if (!toggle.contains(e.target) && !panel.contains(e.target)) {
      closePanel();
    }
  });
}

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => {
  Papa.parse('data/artworks.csv', {
    download:      true,
    header:        true,
    skipEmptyLines: true,
    dynamicTyping: false,
    complete: ({ data }) => {
      allPaintings = data.map(normalisePainting).filter(p => p.filename);
      renderResults(allPaintings);
      initColourPickers();
      initAccordion();
      initPaletteBar();
      bindSearch();
      bindRequestForm();
      bindLightbox();
    },
    error: err => console.error('Could not load artworks.csv', err)
  });
});

/* ── Normalise CSV row ── */
function normalisePainting(row) {
  const colours = [];
  for (let i = 1; i <= 6; i++) {
    const raw = (row[`colour${i}`] || '').trim();
    if (raw) colours.push(normaliseHex(raw));
  }
  return {
    filename:    row.filename,
    title:       row.title || row.filename,
    medium:      row.medium,
    material:    row.material,
    width_cm:    row.width_cm,
    height_cm:   row.height_cm,
    shape:       row.shape,
    year:        row.year,
    description: row.description,
    colours,
    uv_active:   String(row.uv_active).toLowerCase() === 'yes',
    framed:      row.framed,
    price_eur:   row.price_eur ? parseFloat(row.price_eur) : null,
    price_note:  row.price_note || '',
    series:      String(row.series).toLowerCase() === 'yes',
    available:   String(row.available).toLowerCase() === 'yes',
    audio_file:   row.audio_url || '',
    audio_label:  row.audio_label || '',
    uv_filename:  row.uv_filename || ''
  };
}

function normaliseHex(raw) {
  const clean = raw.replace('#', '').trim();
  return clean.length === 5 ? '0' + clean : clean;
}

function formatPrice(p) {
  const num  = p.price_eur != null ? '€' + p.price_eur.toLocaleString('fi-FI') : null;
  const note = p.price_note || null;
  if (num && note) return num + ' | ' + note;
  if (num)         return num;
  if (note)        return note;
  return 'POA';
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
  return [r, g, b].map(v => {
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

function paintingMatchesAnyColour(painting, targetHexList) {
  if (!targetHexList.length) return true;
  return targetHexList.some(hex => {
    const target = hexToRgb(hex);
    return painting.colours.some(c => {
      const pRgb = hexToRgb(c);
      return colourDistance(pRgb, target) <= COLOUR_TOLERANCE;
    });
  });
}

/* ── Palette bar ── */
function initPaletteBar() {
  updatePaletteBar([]);
}

// Called from main.js for search colours, and from atmosphere.js for mood colours
window.updatePaletteBar = function(hexList) {
  const bar = document.getElementById('palette-bar');
  if (!bar) return;
  bar.innerHTML = '';
  const defaults = ['1C1C1A', '2E4A3E', '8B6F4E', 'C4B8A8', 'F2EDE4'];
  const toShow   = hexList.length > 0 ? hexList : defaults;
  toShow.forEach(hex => {
    const seg = document.createElement('div');
    seg.className      = 'palette-segment';
    seg.style.background = '#' + hex.replace('#', '');
    bar.appendChild(seg);
  });
};

/* ── Multi-colour search pickers (max 3) ── */
function initColourPickers() {
  const container = document.getElementById('colour-pickers');
  if (!container) return;

  searchColours = [''];
  renderColourPickers(container);

  document.getElementById('btn-add-colour')?.addEventListener('click', () => {
    if (searchColours.length < MAX_SEARCH_COLOURS) {
      searchColours.push('');
      renderColourPickers(container);
    }
  });
}

function renderColourPickers(container) {
  container.innerHTML = '';
  const addBtn = document.getElementById('btn-add-colour');

  searchColours.forEach((hex, idx) => {
    const displayHex = hex ? '#' + hex : '#8B6F4E';
    const row = document.createElement('div');
    row.className = 'colour-row';
    row.innerHTML = `
      <input type="color" class="cp-picker" data-idx="${idx}" value="${displayHex}">
      <div class="colour-inputs">
        <span>HEX</span>
        <input type="text" class="cp-hex" data-idx="${idx}" value="${hex ? '#' + hex : ''}" maxlength="7" placeholder="#rrggbb">
        ${searchColours.length > 1
          ? `<button class="cp-remove mono" data-idx="${idx}" aria-label="Remove colour">✕</button>`
          : ''}
      </div>
    `;
    container.appendChild(row);
  });

  // Bind picker → hex
  container.querySelectorAll('.cp-picker').forEach(el => {
    el.addEventListener('input', e => {
      const idx = +e.target.dataset.idx;
      const hex = e.target.value.replace('#', '');
      searchColours[idx] = hex;
      const hexInput = container.querySelector(`.cp-hex[data-idx="${idx}"]`);
      if (hexInput) hexInput.value = '#' + hex;
      updatePaletteBar(searchColours.filter(Boolean));
    });
  });

  // Bind hex → picker
  container.querySelectorAll('.cp-hex').forEach(el => {
    el.addEventListener('input', e => {
      const idx = +e.target.dataset.idx;
      const val = e.target.value.trim().replace('#', '');
      if (/^[0-9a-fA-F]{6}$/.test(val)) {
        searchColours[idx] = val;
        const picker = container.querySelector(`.cp-picker[data-idx="${idx}"]`);
        if (picker) picker.value = '#' + val;
        updatePaletteBar(searchColours.filter(Boolean));
      }
    });
  });

  // Remove buttons
  container.querySelectorAll('.cp-remove').forEach(el => {
    el.addEventListener('click', e => {
      const idx = +e.target.dataset.idx;
      searchColours.splice(idx, 1);
      renderColourPickers(container);
      updatePaletteBar(searchColours.filter(Boolean));
    });
  });

  if (addBtn) {
    addBtn.style.display = searchColours.length >= MAX_SEARCH_COLOURS ? 'none' : 'inline-flex';
  }
}

/* ── Search ── */
function getSearchParams() {
  return {
    colourHexList: document.getElementById('filter-colour')?.checked
      ? searchColours.filter(Boolean)
      : [],
    uvOnly:       document.getElementById('filter-uv')?.checked,
    seriesOnly:   document.getElementById('filter-series')?.value,
    budgetMax:    parseFloat(document.getElementById('filter-budget-max')?.value) || null,
    shapeVal:     document.getElementById('filter-shape')?.value,
    supportVal:   document.getElementById('filter-material')?.value
  };
}

function applySearch(params) {
  lastSearch = params;
  return allPaintings.filter(p => {
    if (!p.available) return false;
    if (params.uvOnly && !p.uv_active) return false;
    if (params.shapeVal   && params.shapeVal   !== 'any' && p.shape    !== params.shapeVal)   return false;
    if (params.supportVal && params.supportVal !== 'any' && p.material !== params.supportVal) return false;
    if (!paintingMatchesAnyColour(p, params.colourHexList)) return false;
    if (params.seriesOnly === 'yes'  && !p.series) return false;
    if (params.seriesOnly === 'no'   &&  p.series) return false;
    if (params.budgetMax  != null    &&  p.price_eur != null && p.price_eur > params.budgetMax) return false;
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
      No works matched those filters — scroll down to make a request.
    </p>`;
    return;
  }

  grid.innerHTML = paintings.map((p, i) => {
    const imgSrc   = ARTWORK_BASE + encodeURIComponent(p.filename);
    const swatches = p.colours.map(c =>
      `<span class="swatch" style="background:#${c}" title="#${c}"></span>`
    ).join('');
    const uvBadge     = p.uv_active ? `<div class="uv-badge">UV active</div>` : '';
    const seriesBadge = p.series   ? `<div class="series-badge">sarja</div>` : '';
    const price       = formatPrice(p);
    const dims        = `${p.width_cm} × ${p.height_cm} cm`;

    return `
      <article class="painting-card"
        data-idx="${i}"
        data-filename="${p.filename}"
        tabindex="0"
        role="button"
        aria-label="View ${p.title}">
        <img src="${imgSrc}" alt="${p.title}" loading="lazy">
        <div class="card-body">
          <div class="card-title">${p.title}</div>
          <div class="card-meta">
            ${p.medium} on ${p.material}<br>
            ${dims} · ${p.shape}<br>
            ${p.year}<br>
            ${price}
          </div>
          <div class="card-swatches">${swatches}</div>
          <div class="card-badges">${uvBadge}${seriesBadge}</div>
        </div>
      </article>
    `;
  }).join('');

  // Store current results for lightbox navigation
  window._currentResults = paintings;
}

/* ── Lighting viewer ── */
function buildLightingSlider(uvFilename) {
  const strip = document.getElementById('lb-lighting-strip');
  if (!strip) return;
  strip.innerHTML = '';

  LIGHT_TYPES.forEach((lt, idx) => {
    const btn = document.createElement('button');
    btn.className   = 'light-btn';
    btn.dataset.idx = idx;
    btn.title       = lt.label;
    btn.setAttribute('aria-label', lt.label);
    btn.innerHTML   = `<img src="${lt.icon}" alt="${lt.label}" width="32" height="32">`;
    btn.addEventListener('click', () => applyLighting(idx));
    strip.appendChild(btn);
  });

  // UV button — separate, greyed out unless uv_filename populated
  const uvBtn = document.getElementById('lb-uv-btn');
  if (uvBtn) {
    if (uvFilename) {
      uvBtn.removeAttribute('disabled');
      uvBtn.classList.remove('disabled');
      uvBtn.onclick = () => applyUVLight(uvFilename);
    } else {
      uvBtn.setAttribute('disabled', true);
      uvBtn.classList.add('disabled');
      uvBtn.onclick = null;
    }
  }

  // Set default light from current atmosphere mood
  const mood    = (typeof window.getCurrentMood === 'function' ? window.getCurrentMood() : null) || document.body.getAttribute('data-mood') || 'daylight';
  const defId   = MOOD_LIGHT_DEFAULTS[mood] || 'daylight';
  const defIdx  = LIGHT_TYPES.findIndex(l => l.id === defId);
  applyLighting(defIdx >= 0 ? defIdx : 0);
}

function applyLighting(idx) {
  clearInterval(flickerInterval);
  currentLightIdx = idx;
  const lt  = LIGHT_TYPES[idx];
  const img = document.getElementById('lb-img');
  if (!img) return;

  // Mark active button
  document.querySelectorAll('.light-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === idx);
  });

  // Remove UV overlay if present
  document.getElementById('lb-uv-overlay')?.remove();
  document.getElementById('lb-uv-btn')?.classList.remove('uv-active');

  if (lt.flicker) {
    applyFlicker(img, lt);
  } else {
    img.style.filter = lt.filter;
  }
}

function applyFlicker(img, lt) {
  const base   = lt.filter;
  const heavy  = lt.heavy || false;
  flickerInterval = setInterval(() => {
    const delta = (Math.random() - 0.5) * (heavy ? 0.18 : 0.08);
    const warm  = (Math.random() - 0.5) * (heavy ? 6 : 3);
    // Rebuild filter with slight random brightness and hue variation
    img.style.filter = base
      .replace(/brightness\(([\d.]+)\)/, (_, v) => `brightness(${(+v + delta).toFixed(3)})`)
      .replace(/hue-rotate\(([-\d.]+)deg\)/, (_, v) => `hue-rotate(${(+v + warm).toFixed(1)}deg)`);
  }, heavy ? 80 : 120);
}

function applyUVLight(uvFilename) {
  clearInterval(flickerInterval);
  const img = document.getElementById('lb-img');
  if (!img) return;

  // Deactivate light strip selection
  document.querySelectorAll('.light-btn').forEach(btn => btn.classList.remove('active'));

  // Show UV image instead of regular image
  img.src = ARTWORK_BASE + encodeURIComponent(uvFilename);
  img.style.filter = 'none';

  document.getElementById('lb-uv-btn')?.classList.add('uv-active');
}

function resetLightingOnClose(originalSrc) {
  clearInterval(flickerInterval);
  const img = document.getElementById('lb-img');
  if (img) { img.src = originalSrc; img.style.filter = 'none'; }
  document.getElementById('lb-uv-btn')?.classList.remove('uv-active');
}

/* ── Lightbox ── */
function bindLightbox() {
  const lb        = document.getElementById('lightbox');
  const lbClose   = document.getElementById('lb-close');
  const lbPrev    = document.getElementById('lb-prev');
  const lbNext    = document.getElementById('lb-next');
  if (!lb) return;

  let currentIdx = 0;

  function openLightbox(idx) {
    currentIdx = idx;
    showLightboxItem(idx);
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  }

  function closeLightbox() {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    stopAudio();
    resetLightingOnClose('');
  }

  function showLightboxItem(idx) {
    const paintings = window._currentResults || allPaintings;
    if (!paintings.length) return;
    const p = paintings[idx];
    if (!p) return;

    const imgSrc = ARTWORK_BASE + encodeURIComponent(p.filename);
    document.getElementById('lb-img').src         = imgSrc;
    document.getElementById('lb-img').alt         = p.title;
    document.getElementById('lb-title').textContent = p.title;
    document.getElementById('lb-meta').innerHTML  = `
      ${p.medium} on ${p.material}<br>
      ${p.width_cm} × ${p.height_cm} cm · ${p.shape}<br>
      ${p.year}
    `;
    document.getElementById('lb-price').textContent = formatPrice(p);
    document.getElementById('lb-desc').textContent  = p.description || '';

    const swatches = p.colours.map(c =>
      `<span class="swatch swatch-lg" style="background:#${c}" title="#${c}"></span>`
    ).join('');
    document.getElementById('lb-swatches').innerHTML = swatches;

    const uvEl = document.getElementById('lb-uv');
    uvEl.style.display = p.uv_active ? 'inline-block' : 'none';

    // Lighting slider
    buildLightingSlider(p.uv_filename || '');

    // Update enquiry link with painting title
    const enquireBtn = document.getElementById('lb-enquire');
    if (enquireBtn) {
      enquireBtn.href = `mailto:hello@artwork.fi?subject=Kysely: ${encodeURIComponent(p.title)}`;
    }

    // Audio
    const audioSection = document.getElementById('lb-audio-section');
    if (p.audio_file) {
      const audioUrl = AUDIO_BASE + encodeURIComponent(p.audio_file);
      document.getElementById('lb-audio').src = audioUrl;
      document.getElementById('lb-audio-label').textContent = p.audio_label || 'Listen';
      audioSection.style.display = 'block';
    } else {
      audioSection.style.display = 'none';
      stopAudio();
    }

    // Prev/next visibility
    const total = paintings.length;
    lbPrev.style.visibility = idx > 0        ? 'visible' : 'hidden';
    lbNext.style.visibility = idx < total - 1 ? 'visible' : 'hidden';
  }

  function stopAudio() {
    const audio = document.getElementById('lb-audio');
    if (audio) { audio.pause(); audio.currentTime = 0; }
  }

  // Open from grid
  document.getElementById('paintings-grid').addEventListener('click', e => {
    const card = e.target.closest('.painting-card');
    if (!card) return;
    openLightbox(+card.dataset.idx);
  });

  document.getElementById('paintings-grid').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.painting-card');
      if (card) { e.preventDefault(); openLightbox(+card.dataset.idx); }
    }
  });

  lbClose.addEventListener('click', closeLightbox);
  lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });

  lbPrev.addEventListener('click', () => {
    if (currentIdx > 0) { stopAudio(); currentIdx--; showLightboxItem(currentIdx); }
  });

  lbNext.addEventListener('click', () => {
    const total = (window._currentResults || allPaintings).length;
    if (currentIdx < total - 1) { stopAudio(); currentIdx++; showLightboxItem(currentIdx); }
  });

  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  lbPrev.click();
    if (e.key === 'ArrowRight') lbNext.click();
  });
}

/* ── Search buttons ── */
function bindSearch() {
  document.getElementById('btn-search')?.addEventListener('click', () => {
    const params  = getSearchParams();
    const results = applySearch(params);
    renderResults(results);
    document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (params.colourHexList.length) updatePaletteBar(params.colourHexList);
  });

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    document.getElementById('filter-colour').checked    = false;
    document.getElementById('filter-uv').checked        = false;
    document.getElementById('filter-shape').value       = 'any';
    document.getElementById('filter-material').value    = 'any';
    document.getElementById('filter-series').value      = 'any';
    document.getElementById('filter-budget-max').value  = '';
    searchColours = [''];
    const container = document.getElementById('colour-pickers');
    if (container) renderColourPickers(container);
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
  // Copy shape
  if (lastSearch.shapeVal && lastSearch.shapeVal !== 'any') {
    const cb = document.querySelector(`#request-shape-group input[value="${lastSearch.shapeVal}"]`);
    if (cb) cb.checked = true;
  }
  // Copy search colours into colour wishes (max 6)
  if (lastSearch.colourHexList?.length) {
    lastSearch.colourHexList.forEach((hex, i) => {
      const field = document.getElementById(`req-colour-wish-${i + 1}`);
      if (field) field.value = '#' + hex;
    });
    const note = document.getElementById('request-colour-note');
    if (note) note.textContent = `Colour preferences carried over from your search.`;
  }
  // UV
  if (lastSearch.uvOnly) {
    const cb = document.getElementById('request-uv');
    if (cb) cb.checked = true;
  }
}

/* ── Request form ── */
function bindRequestForm() {
  // Space colour inputs → palette bar (max 9)
  for (let i = 1; i <= 9; i++) {
    document.getElementById(`req-space-colour-${i}`)?.addEventListener('input', updateSpacePalette);
  }

  document.getElementById('request-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const data  = new FormData(e.target);
    const entry = Object.fromEntries(data.entries());
    entry.art_types = [...e.target.querySelectorAll('input[name="art_type"]:checked')]
      .map(el => el.value).join(', ');
    console.log('Request entry:', entry);
    // Google Sheets / Apps Script POST goes here
    document.getElementById('request-form').style.display        = 'none';
    document.getElementById('request-confirmation').style.display = 'block';
  });
}

function updateSpacePalette() {
  const hexList = [];
  for (let i = 1; i <= 9; i++) {
    const val = (document.getElementById(`req-space-colour-${i}`)?.value || '').trim().replace('#', '');
    if (/^[0-9a-fA-F]{6}$/.test(val)) hexList.push(val);
  }
  updatePaletteBar(hexList);
}
