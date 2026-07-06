/* ============================================================
   Art@Work — atmosphere.js
   Loads mood palettes from themes.csv via PapaParse
   Space/weather toggle · clock · moon phase
   City typeahead (Open-Meteo) · weather mood
   Sky zone changes with mood; ground zone stays static
   Theme never touches images, colour pickers, or search results
   ============================================================ */

const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API   = 'https://api.open-meteo.com/v1/forecast';

let weatherActive  = false;
let cityCoords     = null;
let cityLabel      = '';
let moodPalettes   = {};
let typeaheadTimer = null;

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => {
  loadThemes();
  initToggle();
  initCityTypeahead();
});

/* ── Load themes.csv ── */
function loadThemes() {
  Papa.parse('data/themes.csv', {
    download:       true,
    header:         true,
    skipEmptyLines: true,
    complete: ({ data }) => {
      data.forEach(row => { moodPalettes[row.mood] = row; });
      applySpaceMood();
    },
    error: err => {
      console.error('Could not load themes.csv', err);
      applyFallback();
    }
  });
}

/* ── Toggle ── */
function initToggle() {
  const toggle      = document.getElementById('atmosphere-toggle');
  const citySection = document.getElementById('city-input-section');
  if (!toggle) return;

  toggle.addEventListener('change', () => {
    weatherActive = toggle.checked;
    if (citySection) citySection.style.display = weatherActive ? 'flex' : 'none';

    if (!weatherActive) {
      applySpaceMood();
    } else if (cityCoords) {
      // Restore previous city — no need to re-enter
      fetchAndApplyWeather(cityCoords.lat, cityCoords.lon, cityLabel);
    }
    // If weather active but no city yet, wait for typeahead selection
  });
}

/* ── City typeahead ── */
function initCityTypeahead() {
  const input    = document.getElementById('city-input');
  const dropdown = document.getElementById('city-dropdown');
  if (!input || !dropdown) return;

  input.addEventListener('input', () => {
    clearTimeout(typeaheadTimer);
    const q = input.value.trim();
    if (q.length < 2) { dropdown.innerHTML = ''; dropdown.style.display = 'none'; return; }

    typeaheadTimer = setTimeout(async () => {
      try {
        const res  = await fetch(`${GEOCODING_API}?name=${encodeURIComponent(q)}&count=6&language=en&format=json`);
        const data = await res.json();
        renderCityDropdown(data.results || [], dropdown, input);
      } catch {
        dropdown.style.display = 'none';
      }
    }, 300);
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}

function renderCityDropdown(results, dropdown, input) {
  if (!results.length) { dropdown.style.display = 'none'; return; }

  dropdown.innerHTML = results.map(r => `
    <div class="city-option"
      data-lat="${r.latitude}"
      data-lon="${r.longitude}"
      data-name="${r.name}"
      data-country="${r.country || ''}">
      <span class="city-name">${r.name}</span>
      <span class="city-country">${r.country || ''}</span>
    </div>
  `).join('');

  dropdown.style.display = 'block';

  dropdown.querySelectorAll('.city-option').forEach(el => {
    el.addEventListener('click', () => {
      const lat     = +el.dataset.lat;
      const lon     = +el.dataset.lon;
      const name    = el.dataset.name;
      const country = el.dataset.country;
      const label   = `${name}, ${country}`;

      // Persist so re-toggling doesn't require re-entry
      cityCoords = { lat, lon };
      cityLabel  = label;
      input.value           = label;
      dropdown.style.display = 'none';

      fetchAndApplyWeather(lat, lon, label);
    });
  });
}

/* ── Weather fetch ── */
async function fetchAndApplyWeather(lat, lon, label) {
  try {
    const url  = `${WEATHER_API}?latitude=${lat}&longitude=${lon}&current=weather_code,temperature_2m,cloud_cover&timezone=auto`;
    const res  = await fetch(url);
    const data = await res.json();
    const curr = data.current;
    const mood = weatherCodeToMood(curr.weather_code, curr.cloud_cover, curr.temperature_2m);
    applyMood(mood, `${label} · ${Math.round(curr.temperature_2m)}°`);
  } catch {
    applySpaceMood();
  }
}

function weatherCodeToMood(code, cloud, temp) {
  if (temp > 28)                       return 'hot';
  if (temp < -5)                       return 'cold';
  if (code >= 95)                      return 'storm';
  if (code >= 85 && code <= 86)        return 'snow';
  if (code >= 80 && code <= 82)        return 'rain';
  if (code >= 71 && code <= 77)        return 'snow';
  if (code >= 51 && code <= 67)        return 'rain';
  if (code >= 45 && code <= 48)        return 'fog';
  if (code === 3)                      return 'overcast';
  if (code <= 2 && cloud > 60)         return 'overcast';
  return 'clear';
}

/* ── Moon phase (no API — pure maths) ── */
function getMoonPhase(date) {
  const knownNew = new Date(2000, 0, 6);
  const diff     = (date - knownNew) / (1000 * 60 * 60 * 24);
  const cycle    = 29.53058867;
  const phase    = ((diff % cycle) + cycle) % cycle;
  if (phase < 1.85)  return 'new';
  if (phase < 7.38)  return 'waxing_crescent';
  if (phase < 9.22)  return 'first_quarter';
  if (phase < 14.77) return 'waxing_gibbous';
  if (phase < 16.61) return 'full';
  if (phase < 22.15) return 'waning_gibbous';
  if (phase < 23.99) return 'last_quarter';
  return 'waning_crescent';
}

const NAMED_MOONS = {
  0:'Wolf Moon', 1:'Snow Moon', 2:'Worm Moon', 3:'Pink Moon',
  4:'Flower Moon', 5:'Strawberry Moon', 6:'Buck Moon', 7:'Sturgeon Moon',
  8:'Harvest Moon', 9:"Hunter's Moon", 10:'Beaver Moon', 11:'Cold Moon'
};

function getTimeOfDay(hour) {
  if (hour >= 4  && hour < 6)  return 'dawn';
  if (hour >= 6  && hour < 10) return 'morning';
  if (hour >= 10 && hour < 13) return 'midday';
  if (hour >= 13 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 19) return 'dusk';
  if (hour >= 19 && hour < 21) return 'blue_hour';
  if (hour >= 21 && hour < 23) return 'evening';
  return 'deep_night';
}

/* ── Space mood (default) ── */
function applySpaceMood() {
  const now    = new Date();
  const hour   = now.getHours();
  const month  = now.getMonth();
  const tod    = getTimeOfDay(hour);
  const moon   = getMoonPhase(now);

  const isStrawberry = month === 5 && moon === 'full';
  const moonKey      = isStrawberry ? 'strawberry_moon' : moon;
  const moonName     = isStrawberry ? 'Strawberry Moon' : NAMED_MOONS[month];
  const season       = getSeason(month);

  // Primary mood from time of day, moon enriches the label
  const label = `${formatTodLabel(tod)} · ${moonName} · ${capitalise(season)}`;
  applyMood(tod, label);
}

function getSeason(m) {
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

/* ── Apply mood from palettes ── */
function applyMood(moodKey, label) {
  const palette = moodPalettes[moodKey];
  if (!palette) { applyFallback(); return; }

  const root    = document.documentElement;
  const bg      = palette.bg;
  const lum     = luminance(bg);
  const useLight = lum < 0.4; // dark bg → use light text

  root.style.setProperty('--theme-bg',      '#' + bg);
  root.style.setProperty('--theme-surface',  '#' + palette.surface);
  root.style.setProperty('--theme-border',   '#' + palette.border);
  root.style.setProperty('--theme-accent',   '#' + palette.accent);
  root.style.setProperty('--theme-text',     '#' + (useLight ? palette.text_light : palette.text_dark));
  root.style.setProperty('--theme-mid',      '#' + (useLight ? palette.mid_light  : palette.mid_dark));

  document.body.setAttribute('data-theme', useLight ? 'dark' : 'light');

  updateAtmosphereLabel(label || moodKey);
  triggerAnimation(palette.animation || 'none');

  // Export palette bar colours (sky zone only)
  if (typeof window.updatePaletteBar === 'function') {
    window.updatePaletteBar([bg, palette.border, palette.accent]);
  }
}

/* ── Luminance check for contrast ── */
function luminance(hex) {
  const rgb = [0,2,4].map(i => {
    const c = parseInt(hex.slice(i, i+2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/* ── Animations ── */
let currentAnimation = null;

function triggerAnimation(name) {
  // Remove any existing animation layer
  document.getElementById('sky-animation')?.remove();
  clearInterval(currentAnimation);

  if (name === 'none' || !name) return;

  const sky = document.getElementById('hero');
  if (!sky) return;

  const canvas = document.createElement('canvas');
  canvas.id    = 'sky-animation';
  canvas.style.cssText = `
    position:absolute;inset:0;width:100%;height:100%;
    pointer-events:none;z-index:0;opacity:0.35;
  `;
  sky.style.position = 'relative';
  sky.prepend(canvas);

  const ctx = canvas.getContext('2d');

  const resize = () => {
    canvas.width  = sky.offsetWidth;
    canvas.height = sky.offsetHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  if (name === 'rain')       animateRain(ctx, canvas);
  if (name === 'snow')       animateSnow(ctx, canvas);
  if (name === 'stars')      animateStars(ctx, canvas);
  if (name === 'moon_glow')  animateMoonGlow(ctx, canvas);
  if (name === 'aurora_hint') animateAurora(ctx, canvas);
  if (name === 'storm')      animateRain(ctx, canvas, true);
}

/* Rain */
function animateRain(ctx, canvas, heavy = false) {
  const drops = Array.from({ length: heavy ? 180 : 80 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    len:   6 + Math.random() * 14,
    speed: 8 + Math.random() * 10
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(160,200,255,0.5)';
    ctx.lineWidth   = heavy ? 1.5 : 1;
    drops.forEach(d => {
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.len * 0.3, d.y + d.len); // diagonal
      ctx.stroke();
      d.y += d.speed;
      d.x -= d.speed * 0.3;
      if (d.y > canvas.height) {
        d.y = -d.len;
        d.x = Math.random() * canvas.width;
      }
    });
    currentAnimation = requestAnimationFrame(draw);
  }
  draw();
}

/* Snow */
function animateSnow(ctx, canvas) {
  const flakes = Array.from({ length: 60 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: 1 + Math.random() * 3,
    speed: 0.5 + Math.random() * 1.5,
    drift: (Math.random() - 0.5) * 0.4
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(220,235,255,0.7)';
    flakes.forEach(f => {
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
      f.y += f.speed;
      f.x += f.drift;
      if (f.y > canvas.height) { f.y = -4; f.x = Math.random() * canvas.width; }
    });
    currentAnimation = requestAnimationFrame(draw);
  }
  draw();
}

/* Stars */
function animateStars(ctx, canvas) {
  const stars = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.5,
    phase: Math.random() * Math.PI * 2
  }));
  let t = 0;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      const alpha = 0.4 + 0.4 * Math.sin(s.phase + t * 0.02);
      ctx.fillStyle = `rgba(220,225,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    t++;
    currentAnimation = requestAnimationFrame(draw);
  }
  draw();
}

/* Moon glow */
function animateMoonGlow(ctx, canvas) {
  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const x = canvas.width * 0.8;
    const y = canvas.height * 0.2;
    const r = 60 + 8 * Math.sin(t * 0.02);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    grad.addColorStop(0,   `rgba(240,240,200,${0.3 + 0.05 * Math.sin(t * 0.02)})`);
    grad.addColorStop(0.4, 'rgba(200,210,180,0.08)');
    grad.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r * 3, 0, Math.PI * 2);
    ctx.fill();
    t++;
    currentAnimation = requestAnimationFrame(draw);
  }
  draw();
}

/* Aurora hint */
function animateAurora(ctx, canvas) {
  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 3; i++) {
      const y    = canvas.height * (0.2 + i * 0.12) + 20 * Math.sin(t * 0.01 + i);
      const grad = ctx.createLinearGradient(0, y - 30, 0, y + 30);
      const hue  = 140 + i * 40 + 20 * Math.sin(t * 0.008);
      grad.addColorStop(0,   'rgba(0,0,0,0)');
      grad.addColorStop(0.5, `hsla(${hue},70%,60%,0.12)`);
      grad.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, y - 30, canvas.width, 60);
    }
    t++;
    currentAnimation = requestAnimationFrame(draw);
  }
  draw();
}

/* ── Atmosphere label ── */
function updateAtmosphereLabel(text) {
  const el = document.getElementById('atmosphere-label');
  if (el) el.textContent = text;
}

/* ── Fallback (if themes.csv fails) ── */
function applyFallback() {
  const root = document.documentElement;
  root.style.setProperty('--theme-bg',      '#0E0E12');
  root.style.setProperty('--theme-surface',  '#141418');
  root.style.setProperty('--theme-border',   '#2A2A3A');
  root.style.setProperty('--theme-accent',   '#8B6F4E');
  root.style.setProperty('--theme-text',     '#E8E4DC');
  root.style.setProperty('--theme-mid',      '#7A7468');
  document.body.setAttribute('data-theme', 'dark');
}

/* ── Helpers ── */
function formatTodLabel(tod) {
  return { dawn:'Dawn', morning:'Morning', midday:'Midday', afternoon:'Afternoon',
           dusk:'Dusk', blue_hour:'Blue hour', evening:'Evening', deep_night:'Deep night' }[tod] || tod;
}

function capitalise(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
