/* ============================================================
   Art@Work — atmosphere.js
   Loads: data/themes.csv, data/modifiers.csv, data/events.csv
   Base palette: time of day or moon phase (themes.csv)
   Modifier layer: weather + space events (modifiers.csv)
   Events: meteor showers, eclipses, comets (events.csv)
   Alert: 🚨 when dated events table expires within 6 months
   Sky zone only — never images, colour pickers, search results
   ============================================================ */

const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API   = 'https://api.open-meteo.com/v1/forecast';
const ALERT_MONTHS  = 6; // warn this many months before table expires

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
  8:'Harvest Moon', 9:"Hunter\'s Moon", 10:'Beaver Moon', 11:'Cold Moon'
};

/* ── State ── */
let weatherActive  = false;
let cityCoords     = null;
let cityLabel      = '';
let typeaheadTimer = null;
let currentMoodKey = 'deep_night';

let basePalettes   = {};  // from themes.csv
let modifiers      = {};  // from modifiers.csv
let events         = [];  // from events.csv

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => {
  loadAllData();
  initToggle();
  initCityTypeahead();
});

/* ── Load all three CSVs ── */
function loadAllData() {
  let loaded = 0;
  const done = () => { if (++loaded === 3) { checkEventsAlert(); applySpaceMood(); } };

  Papa.parse('data/themes.csv', {
    download: true, header: true, skipEmptyLines: true,
    complete: ({ data }) => {
      data.forEach(row => { if (row.mood) basePalettes[row.mood] = row; });
      done();
    },
    error: () => done()
  });

  Papa.parse('data/modifiers.csv', {
    download: true, header: true, skipEmptyLines: true,
    complete: ({ data }) => {
      data.forEach(row => { if (row.modifier) modifiers[row.modifier] = row; });
      done();
    },
    error: () => done()
  });

  Papa.parse('data/events.csv', {
    download: true, header: true, skipEmptyLines: true,
    complete: ({ data }) => {
      events = data.filter(r => r.name);
      done();
    },
    error: () => done()
  });
}

/* ── Events table expiry alert ── */
function checkEventsAlert() {
  const now      = new Date();
  const alert6   = new Date(now);
  alert6.setMonth(alert6.getMonth() + ALERT_MONTHS);

  // Find latest dated event (has a year)
  const dated = events
    .filter(e => e.year)
    .map(e => new Date(+e.year, +e.month_end - 1, +e.day_end));

  if (!dated.length) return;
  const latest = new Date(Math.max(...dated));

  if (latest <= alert6) {
    const alertEl = document.getElementById('events-alert');
    if (alertEl) {
      alertEl.style.display = 'inline-flex';
      alertEl.title = `Events table expires ${latest.toLocaleDateString('fi-FI')} — data/events.csv needs updating`;
    }
  }
}

/* ── Check active events for today ── */
function getActiveEvents() {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const day   = now.getDate();
  const year  = now.getFullYear();

  return events.filter(e => {
    const ms = +e.month_start, ds = +e.day_start;
    const me = +e.month_end,   de = +e.day_end;
    const yr = e.year ? +e.year : null;

    if (yr && yr !== year) return false;

    // Handle events that don't cross month boundaries
    if (ms === me) return month === ms && day >= ds && day <= de;

    // Multi-month span
    if (month === ms) return day >= ds;
    if (month === me) return day <= de;
    return month > ms && month < me;
  });
}

/* ── Toggle ── */
function initToggle() {
  const toggle    = document.getElementById('atmosphere-toggle');
  const toggleMob = document.getElementById('atmosphere-toggle-mob');
  const cityR2    = document.getElementById('city-input-section-r2');

  function onToggleChange(checked) {
    weatherActive = checked;
    // Sync both toggles
    if (toggle)    toggle.checked    = checked;
    if (toggleMob) toggleMob.checked = checked;
    // Show/hide city inputs
    const cityDesktop = document.getElementById('city-input-section');
    const cityMob     = document.getElementById('city-input-section-mob');
    if (cityDesktop) cityDesktop.style.display = checked ? 'flex' : 'none';
    if (cityMob)     cityMob.style.display     = checked ? 'flex' : 'none';
    if (!checked) {
      applySpaceMood();
    } else if (cityCoords) {
      fetchAndApplyWeather(cityCoords.lat, cityCoords.lon);
    }
  }

  if (toggle)    toggle.addEventListener('change',    () => onToggleChange(toggle.checked));
  if (toggleMob) toggleMob.addEventListener('change', () => onToggleChange(toggleMob.checked));
}

/* ── City typeahead ── */
function initCityTypeahead() {
  // Wire up both desktop and mobile city inputs to the same handler
  wireTypeahead('city-input', 'city-dropdown');
  wireTypeahead('city-input-mob', 'city-dropdown-mob');
}

function wireTypeahead(inputId, dropdownId) {
  const input    = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
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

  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const first = dropdown.querySelector('.city-option');
      if (first) { first.setAttribute('tabindex', '0'); first.focus(); }
    }
    if (e.key === 'Escape') { dropdown.style.display = 'none'; input.focus(); }
  });

  dropdown.addEventListener('keydown', e => {
    const options = [...dropdown.querySelectorAll('.city-option')];
    const idx     = options.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); options[idx + 1]?.focus(); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); idx === 0 ? input.focus() : options[idx - 1]?.focus(); }
    if (e.key === 'Enter')     { e.preventDefault(); document.activeElement.click(); }
    if (e.key === 'Escape')    { dropdown.style.display = 'none'; input.focus(); }
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) dropdown.style.display = 'none';
  });
}

function renderCityDropdown(results, dropdown, input) {
  if (!results.length) { dropdown.style.display = 'none'; return; }
  dropdown.innerHTML = results.map(r => `
    <div class="city-option" tabindex="-1" role="option"
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
      // Sync both inputs
      ['city-input','city-input-mob'].forEach(id => {
        const el2 = document.getElementById(id);
        if (el2) el2.value = cityLabel;
      });
      dropdown.style.display = 'none';
      fetchAndApplyWeather(cityCoords.lat, cityCoords.lon);
    });
  });
}

/* ── Weather fetch ── */
async function fetchAndApplyWeather(lat, lon) {
  try {
    const url  = `${WEATHER_API}?latitude=${lat}&longitude=${lon}&current=weather_code,temperature_2m,cloud_cover,wind_speed_10m,precipitation&daily=sunrise,sunset&timezone=auto`;
    const res  = await fetch(url);
    const data = await res.json();
    const c  = data.current;
    const sr = data.daily?.sunrise?.[0] || null;
    const ss = data.daily?.sunset?.[0]  || null;
    applyWeatherMood(c.weather_code, c.cloud_cover, c.temperature_2m, c.wind_speed_10m, c.precipitation, sr, ss);
  } catch { applySpaceMood(); }
}

function applyWeatherMood(code, cloud, temp, wind, precip, sunriseISO, sunsetISO) {
  const hour     = new Date().getHours();
  const baseMood = (sunriseISO && sunsetISO)
    ? getSolarTod(sunriseISO, sunsetISO)
    : (hour < 6 || hour >= 20 ? getNightTod(hour) : getDayTod(hour));
  const isNight  = ['deep_night','evening','blue_hour','dusk','dawn'].includes(baseMood);

  // Determine weather modifier key
  let modKey = 'clear';
  if (temp > 28)          modKey = 'hot';
  else if (temp < -5)     modKey = 'cold';
  else if (code >= 95)    modKey = 'storm';
  else if (code >= 85)    modKey = 'snow';
  else if (code >= 80)    modKey = precip > 5 ? 'heavy_rain' : 'rain';
  else if (code >= 71)    modKey = 'snow';
  else if (code >= 51)    modKey = 'rain';
  else if (code >= 45)    modKey = 'fog';
  else if (code === 3)    modKey = 'overcast';
  else if (cloud > 60)    modKey = isNight ? 'cloudy_night' : 'overcast';
  else if (isNight)       modKey = 'clear_night';

  // Check active space/celestial events
  const activeEvents  = getActiveEvents();
  const spaceModKeys  = activeEvents.map(e => e.animation).filter(Boolean);

  const moon      = getMoonPhase(new Date());
  const moonEmoji = MOON_EMOJIS[moon];
  const condition = modifiers[modKey]?.label_en || modKey;
  const label     = `${condition} · ${Math.round(temp)}° ${moonEmoji}`;

  applyMoodWithModifiers(baseMood, modKey, spaceModKeys, label);
}

/* ── Space mood — always night ── */
function applySpaceMood() {
  const now    = new Date();
  const hour   = now.getHours();
  const month  = now.getMonth();
  const moon   = getMoonPhase(now);

  // Special moon variants
  const isStrawberry = month === 5 && moon === 'full';
  const isBlue       = isSecondFullMoon(now);
  const isSuper      = isSupermoon(now);
  const isBlack      = isSecondNewMoon(now);

  let moonKey = moon;
  if (isStrawberry) moonKey = 'strawberry_moon';
  else if (isBlue)  moonKey = 'blue_moon';
  else if (isSuper) moonKey = 'supermoon';
  else if (isBlack) moonKey = 'black_moon';

  const moonEmoji = MOON_EMOJIS[moon];
  const moonName  = isStrawberry ? 'Strawberry Moon'
                  : isBlue       ? 'Blue Moon'
                  : isSuper      ? 'Supermoon'
                  : isBlack      ? 'Black Moon'
                  : NAMED_MOONS[month];

  // Base from time of day (always night range in space mode)
  const baseMood = getNightTod(hour);

  // Active space events as additional modifier animations
  const activeEvents = getActiveEvents();
  const spaceModKeys = activeEvents.map(e => e.animation).filter(Boolean);

  // Event label if active
  const eventLabel = activeEvents.length
    ? activeEvents.map(e => e.label_en).join(' · ')
    : null;

  const label = eventLabel
    ? `${moonEmoji} ${moonName} · ${eventLabel}`
    : `${moonEmoji} ${moonName}`;

  applyMoodWithModifiers(baseMood, null, spaceModKeys, label);
}

/* ── Apply base + modifiers ── */
function applyMoodWithModifiers(baseMoodKey, weatherModKey, spaceAnimKeys, label) {
  const palette = basePalettes[baseMoodKey] || basePalettes['deep_night'];
  if (!palette) { applyFallback(); return; }

  currentMoodKey = baseMoodKey;

  const bg  = palette.bg;
  const lum = luminance(bg);
  const dark = lum < 0.35;

  // Set base palette tokens — column names match data/themes.csv headers
  // Anchors: bg, bg_surface, line_primary, line_secondary, accent
  // Derived (overridable): line_mid_primary, line_subtle, line_mid_secondary
  const root = document.documentElement;

  const midPrimary   = palette.line_mid_primary   || interpolateHex(palette.bg,         palette.line_primary,   0.35);
  const subtle       = palette.line_subtle        || interpolateHex(palette.bg,         palette.line_primary,   0.15);
  const midSecondary = palette.line_mid_secondary || interpolateHex(palette.bg_surface,  palette.line_secondary, 0.35);

  root.style.setProperty('--theme-bg',                '#' + palette.bg);
  root.style.setProperty('--theme-bg-surface',         '#' + (palette.bg_surface       || palette.bg));
  root.style.setProperty('--theme-line-primary',       '#' + (palette.line_primary      || 'D0D0E8'));
  root.style.setProperty('--theme-line-secondary',     '#' + (palette.line_secondary    || 'C0C0D8'));
  root.style.setProperty('--theme-line-mid-primary',   '#' + midPrimary);
  root.style.setProperty('--theme-line-subtle',        '#' + subtle);
  root.style.setProperty('--theme-line-mid-secondary', '#' + midSecondary);
  root.style.setProperty('--theme-accent',             '#' + (palette.accent            || '8B6F4E'));
  root.style.setProperty('--theme-border',             '#' + (palette.line_subtle       || '2A2A3A'));

  // Apply gradient to hero if specified in CSV
  const hero = document.getElementById('hero');
  if (hero) {
    if (palette.bg_gradient) {
      hero.style.backgroundImage = palette.bg_gradient;
      hero.style.backgroundColor = '';
    } else {
      hero.style.backgroundImage = '';
      hero.style.backgroundColor = '#' + palette.bg;
    }
  }
   
  document.body.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.body.setAttribute('data-mood',  baseMoodKey);

  // Apply weather modifier as CSS filter on hero
  applyWeatherModifier(weatherModKey);

  // Determine animation — space events take priority, then weather
  const animKey = spaceAnimKeys[0] || modifiers[weatherModKey]?.animation || palette.animation || 'none';
  triggerAnimation(animKey);

  // Run secondary space animations (e.g. comet + meteor simultaneously)
  spaceAnimKeys.slice(1).forEach(key => triggerSecondaryAnimation(key));

  updateAtmosphereLabel(label || baseMoodKey);
}

/* ── Weather modifier as hero filter overlay ── */
function applyWeatherModifier(modKey) {
  const hero = document.getElementById('hero');
  if (!hero) return;

  // Remove existing modifier overlay
  document.getElementById('weather-overlay')?.remove();

  if (!modKey || !modifiers[modKey]) return;
  const mod = modifiers[modKey];

  // Apply CSS filter to hero content (not the canvas)
  const content = hero.querySelector('.container');
  if (content) {
    const br  = mod.brightness || 1;
    const sat = mod.saturation || 1;
    const hue = mod.hue_shift  || 0;
    content.style.filter = `brightness(${br}) saturate(${sat}) hue-rotate(${hue}deg)`;
  }

  // Colour tint overlay if specified
  if (mod.bg_tint && mod.bg_tint_opacity) {
    const overlay = document.createElement('div');
    overlay.id    = 'weather-overlay';
    overlay.style.cssText = `
      position:absolute;inset:0;pointer-events:none;z-index:1;
      background:#${mod.bg_tint};opacity:${mod.bg_tint_opacity};
    `;
    hero.style.position = 'relative';
    hero.appendChild(overlay);
  }
}

/* ── Moon calculations ── */
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

function isSecondFullMoon(date) {
  // Check if this is a second full moon in the calendar month
  const phase = getMoonPhase(date);
  if (phase !== 'full') return false;
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  let count = 0;
  for (let d = new Date(start); d <= date; d.setDate(d.getDate() + 1)) {
    if (getMoonPhase(new Date(d)) === 'full') count++;
  }
  return count >= 2;
}

function isSecondNewMoon(date) {
  const phase = getMoonPhase(date);
  if (phase !== 'new') return false;
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  let count = 0;
  for (let d = new Date(start); d <= date; d.setDate(d.getDate() + 1)) {
    if (getMoonPhase(new Date(d)) === 'new') count++;
  }
  return count >= 2;
}

function isSupermoon(date) {
  // Full moon within ~10% of perigee — approximate using known supermoon dates
  const phase = getMoonPhase(date);
  if (phase !== 'full') return false;
  // Rough check: supermoons cluster in certain months; use known cycle
  const knownNew  = new Date(2000, 0, 6);
  const diff      = (date - knownNew) / (1000 * 60 * 60 * 24);
  const anomaly   = ((diff % 27.55) + 27.55) % 27.55; // anomalistic month
  return anomaly < 3 || anomaly > 24.5; // near perigee
}

/* ── Solar-proportional time of day ── */
function getSolarTod(sunriseISO, sunsetISO) {
  const now     = new Date();
  const sunrise = new Date(sunriseISO);
  const sunset  = new Date(sunsetISO);
  const noon    = new Date((sunrise.getTime() + sunset.getTime()) / 2);

  const t  = now.getTime();
  const ri = sunrise.getTime();
  const si = sunset.getTime();
  const ni = noon.getTime();

  // Polar night
  if (si <= ri) return 'deep_night';

  if (t < ri - 60 * 60 * 1000)                        return 'deep_night';
  if (t < ri + 60 * 60 * 1000)                        return 'dawn';
  if (t < ri + (ni - ri) * 0.4)                       return 'morning';
  if (t < ri + (ni - ri) * 0.6 + (si - ni) * 0.6)    return 'midday';
  if (t < si - 90  * 60 * 1000)                       return 'afternoon';
  if (t < si + 120 * 60 * 1000)                       return 'dusk';
  if (t < si + 180 * 60 * 1000)                       return 'blue_hour';
  if (t < si + 300 * 60 * 1000)                       return 'evening';
  return 'deep_night';
}

/* ── Time of day ── */
function getNightTod(hour) {
  if (hour >= 4  && hour < 6)  return 'dawn';
  if (hour >= 19 && hour < 21) return 'dusk';
  if (hour >= 21 && hour < 23) return 'evening';
  return 'deep_night';
}

function getDayTod(hour) {
  if (hour >= 6  && hour < 10) return 'morning';
  if (hour >= 10 && hour < 13) return 'midday';
  if (hour >= 13 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 19) return 'dusk';
  return 'deep_night';
}

/* ── Colour interpolation ── */
function interpolateHex(hex1, hex2, t) {
  const parse = h => [0,2,4].map(i => parseInt((h||'888888').slice(i,i+2), 16));
  const [r1,g1,b1] = parse(hex1);
  const [r2,g2,b2] = parse(hex2);
  return [
    Math.round(r1 + (r2-r1)*t),
    Math.round(g1 + (g2-g1)*t),
    Math.round(b1 + (b2-b1)*t)
  ].map(v => v.toString(16).padStart(2,'0')).join('');
}

/* ── Luminance ── */
function luminance(hex) {
  const h = hex.replace('#', '');
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

/* ── Animations ── */
let currentAnimation = null;

function triggerAnimation(name) {
  document.getElementById('sky-animation')?.remove();
  if (currentAnimation) { cancelAnimationFrame(currentAnimation); currentAnimation = null; }
  if (!name || name === 'none') return;
  runAnimation(name, 'sky-animation');
}

function triggerSecondaryAnimation(name) {
  if (!name || name === 'none') return;
  runAnimation(name, `sky-anim-${name}`);
}

function runAnimation(name, canvasId) {
  const sky = document.getElementById('hero');
  if (!sky) return;

  const canvas = document.createElement('canvas');
  canvas.id    = canvasId;
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;opacity:0.38;';
  sky.style.position   = 'relative';
  sky.prepend(canvas);

  const ctx    = canvas.getContext('2d');
  const resize = () => { canvas.width = sky.offsetWidth; canvas.height = sky.offsetHeight; };
  resize();
  window.addEventListener('resize', resize);

  if (name === 'rain')         animateRain(ctx, canvas, false);
  else if (name === 'storm')   animateRain(ctx, canvas, true);
  else if (name === 'snow')    animateSnow(ctx, canvas);
  else if (name === 'stars')   animateStars(ctx, canvas);
  else if (name === 'moon_glow')    animateMoonGlow(ctx, canvas);
  else if (name === 'aurora_hint')  animateAurora(ctx, canvas);
  else if (name === 'meteor')       animateMeteors(ctx, canvas);
  else if (name === 'comet')        animateComet(ctx, canvas);
  else if (name === 'planet_bright') animatePlanet(ctx, canvas);
  else if (name === 'conjunction')  animateConjunction(ctx, canvas);
  else if (name === 'blood_moon')   animateMoonGlow(ctx, canvas, true);
  else if (name === 'solar_eclipse') animateSolarEclipse(ctx, canvas);
  else if (name === 'wind')         animateWind(ctx, canvas);
}

/* Rain */
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

/* Snow */
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

/* Stars */
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

/* Moon glow */
function animateMoonGlow(ctx, canvas, blood = false) {
  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const x = canvas.width * 0.8, y = canvas.height * 0.22;
    const r = 55 + 8 * Math.sin(t * 0.018);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    const col = blood ? `rgba(200,60,20,` : `rgba(240,240,200,`;
    g.addColorStop(0,   `${col}${0.35 + 0.06 * Math.sin(t * 0.018)})`);
    g.addColorStop(0.4, `${col}0.08)`);
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * 3, 0, Math.PI * 2); ctx.fill();
    t++; currentAnimation = requestAnimationFrame(draw);
  }
  draw();
}

/* Aurora */
function animateAurora(ctx, canvas) {
  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 3; i++) {
      const y   = canvas.height * (0.2 + i * 0.12) + 20 * Math.sin(t * 0.01 + i);
      const hue = 140 + i * 40 + 20 * Math.sin(t * 0.008);
      const g   = ctx.createLinearGradient(0, y - 30, 0, y + 30);
      g.addColorStop(0,   'rgba(0,0,0,0)');
      g.addColorStop(0.5, `hsla(${hue},70%,60%,0.14)`);
      g.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, y - 30, canvas.width, 60);
    }
    t++; currentAnimation = requestAnimationFrame(draw);
  }
  draw();
}

/* Meteors */
function animateMeteors(ctx, canvas) {
  const meteors = [];
  function spawnMeteor() {
    meteors.push({
      x: Math.random() * canvas.width, y: 0,
      len: 80 + Math.random() * 120,
      speed: 6 + Math.random() * 8,
      angle: Math.PI / 4 + (Math.random() - 0.5) * 0.4,
      alpha: 1, life: 0, maxLife: 30 + Math.random() * 20
    });
  }
  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (t % 40 === 0) spawnMeteor();
    meteors.forEach((m, i) => {
      m.life++;
      m.x += Math.cos(m.angle) * m.speed;
      m.y += Math.sin(m.angle) * m.speed;
      m.alpha = 1 - m.life / m.maxLife;
      const tailX = m.x - Math.cos(m.angle) * m.len;
      const tailY = m.y - Math.sin(m.angle) * m.len;
      const g = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, `rgba(255,255,240,${m.alpha})`);
      ctx.strokeStyle = g; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(m.x, m.y); ctx.stroke();
      if (m.life >= m.maxLife) meteors.splice(i, 1);
    });
    t++; currentAnimation = requestAnimationFrame(draw);
  }
  draw();
}

/* Comet */
function animateComet(ctx, canvas) {
  let x = -100, y = canvas.height * 0.2;
  const speed = 1.2, angle = Math.PI / 8;
  const tailLen = 200;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    x += Math.cos(angle) * speed;
    y += Math.sin(angle) * speed;
    const tailX = x - Math.cos(angle) * tailLen;
    const tailY = y - Math.sin(angle) * tailLen;
    const g = ctx.createLinearGradient(tailX, tailY, x, y);
    g.addColorStop(0,    'rgba(180,220,255,0)');
    g.addColorStop(0.7,  'rgba(200,230,255,0.3)');
    g.addColorStop(1,    'rgba(255,255,255,0.9)');
    ctx.strokeStyle = g; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(x, y); ctx.stroke();
    // Nucleus glow
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 8);
    glow.addColorStop(0, 'rgba(255,255,255,0.9)');
    glow.addColorStop(1, 'rgba(180,220,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
    if (x > canvas.width + 200) { x = -100; y = canvas.height * (0.1 + Math.random() * 0.4); }
    currentAnimation = requestAnimationFrame(draw);
  }
  draw();
}

/* Planet visible */
function animatePlanet(ctx, canvas) {
  const px = canvas.width * 0.75, py = canvas.height * 0.15;
  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pulse = 3 + Math.sin(t * 0.04);
    const g     = ctx.createRadialGradient(px, py, 0, px, py, pulse * 4);
    g.addColorStop(0, 'rgba(255,220,120,0.9)');
    g.addColorStop(0.5, 'rgba(255,200,80,0.3)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(px, py, pulse * 4, 0, Math.PI * 2); ctx.fill();
    t++; currentAnimation = requestAnimationFrame(draw);
  }
  draw();
}

/* Planetary conjunction — multiple bright points */
function animateConjunction(ctx, canvas) {
  const planets = [
    { x: canvas.width * 0.65, y: canvas.height * 0.15, col: '255,220,120' },
    { x: canvas.width * 0.72, y: canvas.height * 0.12, col: '200,220,255' },
    { x: canvas.width * 0.78, y: canvas.height * 0.18, col: '255,180,100' },
  ];
  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    planets.forEach((p, i) => {
      const pulse = 3 + Math.sin(t * 0.03 + i);
      const g     = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pulse * 4);
      g.addColorStop(0, `rgba(${p.col},0.9)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, pulse * 4, 0, Math.PI * 2); ctx.fill();
    });
    t++; currentAnimation = requestAnimationFrame(draw);
  }
  draw();
}

/* Solar eclipse */
function animateSolarEclipse(ctx, canvas) {
  const cx = canvas.width * 0.5, cy = canvas.height * 0.3, r = 40;
  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Corona
    const corona = ctx.createRadialGradient(cx, cy, r, cx, cy, r * 4);
    corona.addColorStop(0,   `rgba(255,220,100,${0.5 + 0.05 * Math.sin(t * 0.02)})`);
    corona.addColorStop(0.4, 'rgba(255,180,50,0.15)');
    corona.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = corona;
    ctx.beginPath(); ctx.arc(cx, cy, r * 4, 0, Math.PI * 2); ctx.fill();
    // Moon disc
    ctx.fillStyle = '#060608';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    t++; currentAnimation = requestAnimationFrame(draw);
  }
  draw();
}

/* Wind */
function animateWind(ctx, canvas) {
  const lines = Array.from({ length: 12 }, () => ({
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    len: 40 + Math.random() * 80, speed: 4 + Math.random() * 6, alpha: Math.random()
  }));
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lines.forEach(l => {
      ctx.strokeStyle = `rgba(200,210,230,${l.alpha * 0.4})`;
      ctx.lineWidth   = 0.8;
      ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x + l.len, l.y + l.len * 0.1); ctx.stroke();
      l.x += l.speed;
      if (l.x > canvas.width + 100) { l.x = -l.len; l.y = Math.random() * canvas.height; }
    });
    currentAnimation = requestAnimationFrame(draw);
  }
  draw();
}

/* ── Fallback ── */
function applyFallback() {
  const root = document.documentElement;
  root.style.setProperty('--theme-bg',      '#080810');
  root.style.setProperty('--theme-bg-surface',  '#0C0C18');
  root.style.setProperty('--theme-border',   '#1A1A3A');
  root.style.setProperty('--theme-accent',   '#3A3A6A');
  root.style.setProperty('--theme-line-primary',     '#D0D0E8');
  root.style.setProperty('--theme-line-mid-primary',      '#6868A0');
  root.style.setProperty('--theme-line-subtle',      '#404068');
  root.style.setProperty('--theme-line-secondary',     '#C0C0D8');
  root.style.setProperty('--theme-line-mid-secondary',      '#484870');
  document.body.setAttribute('data-theme', 'dark');
}

/* ── Exports ── */
window.getCurrentMood = () => currentMoodKey;
