/* ============================================================
   Art@Work — atmosphere.js
   Loads mood palettes from themes.csv via PapaParse
   Space mode: always night, driven by moon phase + time
   Weather mode: day/night aware, city lights at night
   Theme affects sky zone only (hero + nav + body bg)
   Never touches images, colour pickers, or search results
   ============================================================ */

const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API   = 'https://api.open-meteo.com/v1/forecast';

const MOON_EMOJIS = {
  new:             '🌑',
  waxing_crescent: '🌒',
  first_quarter:   '🌓',
  waxing_gibbous:  '🌔',
  full:            '🌕',
  waning_gibbous:  '🌖',
  last_quarter:    '🌗',
  waning_crescent: '🌘'
};

const NAMED_MOONS = {
  0:'Wolf Moon', 1:'Snow Moon', 2:'Worm Moon', 3:'Pink Moon',
  4:'Flower Moon', 5:'Strawberry Moon', 6:'Buck Moon', 7:'Sturgeon Moon',
  8:'Harvest Moon', 9:"Hunter's Moon", 10:'Beaver Moon', 11:'Cold Moon'
};

/* Night moods used by space mode and weather-at-night */
const NIGHT_MOODS = [
  'dusk','blue_hour','evening','deep_night','dawn',
  'new','waxing_crescent','first_quarter','waxing_gibbous',
  'full','waning_gibbous','last_quarter','waning_crescent',
  'strawberry_moon'
];

let weatherActive  = false;
let cityCoords     = null;
let cityLabel      = '';
let moodPalettes   = {};
let typeaheadTimer = null;
let currentMoodKey = 'deep_night';

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
      fetchAndApplyWeather(cityCoords.lat, cityCoords.lon);
    }
    // If weather on but no city yet — wait for selection
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
      } catch { dropdown.style.display = 'none'; }
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
      data-lat="${r.latitude}" data-lon="${r.longitude}"
      data-name="${r.name}" data-country="${r.country || ''}">
      <span class="city-name">${r.name}</span>
      <span class="city-country">${r.country || ''}</span>
    </div>
  `).join('');
  dropdown.style.display = 'block';

  dropdown.querySelectorAll('.city-option').forEach(el => {
    el.addEventListener('click', () => {
      cityCoords = { lat: +el.dataset.lat, lon: +el.dataset.lon };
      cityLabel  = `${el.dataset.name}, ${el.dataset.country}`;
      input.value            = cityLabel;
      dropdown.style.display = 'none';
      fetchAndApplyWeather(cityCoords.lat, cityCoords.lon);
    });
  });
}

/* ── Weather fetch ── */
async function fetchAndApplyWeather(lat, lon) {
  try {
    const url  = `${WEATHER_API}?latitude=${lat}&longitude=${lon}&current=weather_code,temperature_2m,cloud_cover&timezone=auto`;
    const res  = await fetch(url);
    const data = await res.json();
    const curr = data.current;
    applyWeatherMood(curr.weather_code, curr.cloud_cover, curr.temperature_2m);
  } catch { applySpaceMood(); }
}

function applyWeatherMood(code, cloud, temp) {
  const hour    = new Date().getHours();
  const isNight = hour < 6 || hour >= 20;

  // Base weather condition
  let weatherKey = 'clear';
  if (temp > 28)                     weatherKey = 'hot';
  else if (temp < -5)                weatherKey = 'cold';
  else if (code >= 95)               weatherKey = 'storm';
  else if (code >= 85)               weatherKey = 'snow';
  else if (code >= 80)               weatherKey = 'rain';
  else if (code >= 71)               weatherKey = 'snow';
  else if (code >= 51)               weatherKey = 'rain';
  else if (code >= 45)               weatherKey = 'fog';
  else if (code === 3)               weatherKey = 'overcast';
  else if (cloud > 60)               weatherKey = 'overcast';

  // At night, blend toward city_night unless storm/rain (keep those dark)
  let moodKey = weatherKey;
  if (isNight && !['storm','rain','snow'].includes(weatherKey)) {
    moodKey = 'city_night';
  }

  // Weather condition label
  const conditionLabels = {
    clear:'Selkeää', overcast:'Pilvistä', rain:'Sadetta', snow:'Lumisadetta',
    fog:'Sumuinen', storm:'Myrsky', hot:'Kuuma', cold:'Kylmä',
    city_night:'Kaupunki yöllä'
  };

  const moon      = getMoonPhase(new Date());
  const moonEmoji = MOON_EMOJIS[moon];
  const condition = conditionLabels[weatherKey] || weatherKey;
  const label     = `${condition} · ${Math.round(temp)}° ${moonEmoji}`;

  applyMood(moodKey, label);
}

/* ── Space mood — always night ── */
function applySpaceMood() {
  const now    = new Date();
  const hour   = now.getHours();
  const month  = now.getMonth();
  const moon   = getMoonPhase(now);

  const isStrawberry = month === 5 && moon === 'full';
  const moonKey      = isStrawberry ? 'strawberry_moon' : moon;
  const moonEmoji    = MOON_EMOJIS[moon];
  const moonName     = isStrawberry ? 'Strawberry Moon' : NAMED_MOONS[month];

  // Space is always night — pick night mood from time of day
  let todMood = getNightTod(hour);

  const label = `${moonEmoji} ${moonName}`;
  applyMood(todMood, label);
}

/* Time-of-day mood, night range only */
function getNightTod(hour) {
  if (hour >= 4  && hour < 6)  return 'dawn';
  if (hour >= 19 && hour < 21) return 'dusk';
  if (hour >= 21 && hour < 23) return 'evening';
  // Daytime hours in space mode → treat as deep night
  return 'deep_night';
}

function getSeason(m) {
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

/* ── Moon phase ── */
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

/* ── Apply mood ── */
function applyMood(moodKey, label) {
  // Fall back to deep_night if mood not in CSV
  const palette = moodPalettes[moodKey] || moodPalettes['deep_night'];
  if (!palette) { applyFallback(); return; }

  currentMoodKey = moodKey;
  const bg  = palette.bg;
  const lum = luminance(bg);
  const dark = lum < 0.35;

  const root = document.documentElement;
  root.style.setProperty('--theme-bg',      '#' + bg);
  root.style.setProperty('--theme-surface',  '#' + palette.surface);
  root.style.setProperty('--theme-border',   '#' + palette.border);
  root.style.setProperty('--theme-accent',   '#' + palette.accent);
  root.style.setProperty('--theme-text',     '#' + (dark ? palette.text_light : palette.text_dark));
  root.style.setProperty('--theme-mid',      '#' + (dark ? palette.mid_light  : palette.mid_dark));

  // Store current mood on body for lighting defaults
  document.body.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.body.setAttribute('data-mood',  moodKey);

  updateAtmosphereLabel(label || moodKey);
  triggerAnimation(palette.animation || 'none');
}

/* ── Luminance ── */
function luminance(hex) {
  const h = hex.replace('#','');
  const rgb = [0,2,4].map(i => {
    const c = parseInt(h.slice(i, i+2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/* ── Atmosphere label ── */
function updateAtmosphereLabel(text) {
  const el = document.getElementById('atmosphere-label');
  if (el) el.textContent = text;
}

/* ── Animations (sky zone / hero canvas only) ── */
let currentAnimation = null;

function triggerAnimation(name) {
  document.getElementById('sky-animation')?.remove();
  if (currentAnimation) { cancelAnimationFrame(currentAnimation); currentAnimation = null; }

  if (!name || name === 'none') return;

  const sky = document.getElementById('hero');
  if (!sky) return;

  const canvas = document.createElement('canvas');
  canvas.id    = 'sky-animation';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;opacity:0.35;';
  sky.style.position   = 'relative';
  sky.prepend(canvas);

  const ctx    = canvas.getContext('2d');
  const resize = () => { canvas.width = sky.offsetWidth; canvas.height = sky.offsetHeight; };
  resize();
  window.addEventListener('resize', resize);

  if (name === 'rain')        animateRain(ctx, canvas, false);
  else if (name === 'storm')  animateRain(ctx, canvas, true);
  else if (name === 'snow')   animateSnow(ctx, canvas);
  else if (name === 'stars')  animateStars(ctx, canvas);
  else if (name === 'moon_glow')   animateMoonGlow(ctx, canvas);
  else if (name === 'aurora_hint') animateAurora(ctx, canvas);
}

function animateRain(ctx, canvas, heavy) {
  const drops = Array.from({ length: heavy ? 200 : 90 }, () => ({
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    len: 6 + Math.random() * 14, speed: 8 + Math.random() * 10
  }));
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(160,200,255,0.5)';
    ctx.lineWidth   = heavy ? 1.5 : 1;
    drops.forEach(d => {
      ctx.beginPath(); ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.len * 0.3, d.y + d.len); ctx.stroke();
      d.y += d.speed; d.x -= d.speed * 0.3;
      if (d.y > canvas.height) { d.y = -d.len; d.x = Math.random() * canvas.width; }
    });
    currentAnimation = requestAnimationFrame(draw);
  }
  draw();
}

function animateSnow(ctx, canvas) {
  const flakes = Array.from({ length: 60 }, () => ({
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    r: 1 + Math.random() * 3, speed: 0.5 + Math.random() * 1.5,
    drift: (Math.random() - 0.5) * 0.4
  }));
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(220,235,255,0.7)';
    flakes.forEach(f => {
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
      f.y += f.speed; f.x += f.drift;
      if (f.y > canvas.height) { f.y = -4; f.x = Math.random() * canvas.width; }
    });
    currentAnimation = requestAnimationFrame(draw);
  }
  draw();
}

function animateStars(ctx, canvas) {
  const stars = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    r: Math.random() * 1.5, phase: Math.random() * Math.PI * 2
  }));
  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      const alpha = 0.4 + 0.4 * Math.sin(s.phase + t * 0.02);
      ctx.fillStyle = `rgba(220,225,255,${alpha})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    });
    t++; currentAnimation = requestAnimationFrame(draw);
  }
  draw();
}

function animateMoonGlow(ctx, canvas) {
  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const x = canvas.width * 0.8, y = canvas.height * 0.2;
    const r = 60 + 8 * Math.sin(t * 0.02);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    g.addColorStop(0,   `rgba(240,240,200,${0.3 + 0.05 * Math.sin(t * 0.02)})`);
    g.addColorStop(0.4, 'rgba(200,210,180,0.08)');
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * 3, 0, Math.PI * 2); ctx.fill();
    t++; currentAnimation = requestAnimationFrame(draw);
  }
  draw();
}

function animateAurora(ctx, canvas) {
  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 3; i++) {
      const y    = canvas.height * (0.2 + i * 0.12) + 20 * Math.sin(t * 0.01 + i);
      const hue  = 140 + i * 40 + 20 * Math.sin(t * 0.008);
      const g    = ctx.createLinearGradient(0, y - 30, 0, y + 30);
      g.addColorStop(0,   'rgba(0,0,0,0)');
      g.addColorStop(0.5, `hsla(${hue},70%,60%,0.12)`);
      g.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, y - 30, canvas.width, 60);
    }
    t++; currentAnimation = requestAnimationFrame(draw);
  }
  draw();
}

/* ── Fallback ── */
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

/* Export current mood for lighting defaults */
window.getCurrentMood = () => currentMoodKey;
