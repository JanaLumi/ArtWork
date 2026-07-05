/* ============================================================
   Art@Work — atmosphere.js
   Space/weather toggle · clock · moon phase
   City typeahead (Open-Meteo geocoding) · weather mood
   Theme affects background and borders only —
   never images, colour pickers, or search results
   ============================================================ */

const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API   = 'https://api.open-meteo.com/v1/forecast';

let weatherActive = false;
let cityCoords    = null;
let typeaheadTimer = null;

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => {
  applySpaceMood(); // default: space mode from clock + moon
  initToggle();
  initCityTypeahead();
});

/* ── Toggle ── */
function initToggle() {
  const toggle = document.getElementById('atmosphere-toggle');
  if (!toggle) return;

  toggle.addEventListener('change', () => {
    weatherActive = toggle.checked;
    const citySection = document.getElementById('city-input-section');
    if (citySection) citySection.style.display = weatherActive ? 'flex' : 'none';

    if (!weatherActive) {
      cityCoords = null;
      applySpaceMood();
    } else if (cityCoords) {
      fetchAndApplyWeather(cityCoords.lat, cityCoords.lon);
    }
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

  dropdown.innerHTML = results.map(r => {
    const country = r.country || '';
    return `
      <div class="city-option" data-lat="${r.latitude}" data-lon="${r.longitude}"
           data-name="${r.name}" data-country="${country}">
        <span class="city-name">${r.name}</span>
        <span class="city-country">${country}</span>
      </div>
    `;
  }).join('');

  dropdown.style.display = 'block';

  dropdown.querySelectorAll('.city-option').forEach(el => {
    el.addEventListener('click', () => {
      const lat     = +el.dataset.lat;
      const lon     = +el.dataset.lon;
      const name    = el.dataset.name;
      const country = el.dataset.country;
      input.value         = `${name}, ${country}`;
      dropdown.style.display = 'none';
      cityCoords = { lat, lon };
      fetchAndApplyWeather(lat, lon);
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
  } catch {
    applySpaceMood(); // fall back gracefully
  }
}

/* ── Moon phase (no API — pure maths) ── */
function getMoonPhase(date) {
  // Days since known new moon (Jan 6 2000)
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
  if (phase < 29.53) return 'waning_crescent';
  return 'new';
}

// Named moons by approximate month (Northern Hemisphere folk names)
const NAMED_MOONS = {
  0:  'Wolf Moon',
  1:  'Snow Moon',
  2:  'Worm Moon',
  3:  'Pink Moon',
  4:  'Flower Moon',
  5:  'Strawberry Moon',
  6:  'Buck Moon',
  7:  'Sturgeon Moon',
  8:  'Harvest Moon',
  9:  'Hunter\'s Moon',
  10: 'Beaver Moon',
  11: 'Cold Moon'
};

/* ── Time of day ── */
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

/* ── Season (rough, Northern Hemisphere default) ── */
function getSeason(month) {
  if (month >= 2 && month <= 4)  return 'spring';
  if (month >= 5 && month <= 7)  return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

/* ── Mood palettes ── */
// Each mood maps to 3–5 hex colours applied to CSS variables
// These affect background tones and border accents only
const MOOD_PALETTES = {
  // Time of day
  dawn:       { bg: '1A1220', border: '6B3F5E', accent: 'E8A080' },
  morning:    { bg: 'F5ECD7', border: 'D4956A', accent: '4A7B8C' },
  midday:     { bg: 'EEE8DA', border: 'B8A882', accent: '3A6B5C' },
  afternoon:  { bg: 'F0E6CC', border: 'C49A5A', accent: '5C7A4A' },
  dusk:       { bg: '1C1018', border: '7A3F5A', accent: 'E89060' },
  blue_hour:  { bg: '0E1425', border: '2A4A7A', accent: '7AAACE' },
  evening:    { bg: '12101A', border: '3A2A5A', accent: '8A7AAE' },
  deep_night: { bg: '080810', border: '1A1A3A', accent: '3A3A6A' },

  // Season overlays (blended with time of day)
  winter:  { bg: 'E8EEF2', border: 'A8B8C8', accent: '4A6A8A' },
  spring:  { bg: 'EEF2E8', border: 'A8C8A0', accent: '4A7A4A' },
  summer:  { bg: 'F2EEE0', border: 'C8B870', accent: '7A6A2A' },
  autumn:  { bg: 'F0E8DC', border: 'C89860', accent: '8A4A1A' },

  // Moon phases
  new:             { bg: '060608', border: '1A1A20', accent: '3A3A50' },
  waxing_crescent: { bg: '0A0C14', border: '202840', accent: '506080' },
  first_quarter:   { bg: '0E1220', border: '283050', accent: '607090' },
  waxing_gibbous:  { bg: '101828', border: '304060', accent: '7090B0' },
  full:            { bg: 'E8ECF0', border: 'A0B0C0', accent: 'D0E0F0' },
  waning_gibbous:  { bg: '101820', border: '283850', accent: '6080A0' },
  last_quarter:    { bg: '0C1018', border: '202840', accent: '506070' },
  waning_crescent: { bg: '080C12', border: '181E30', accent: '404860' },

  // Strawberry moon special
  strawberry_moon: { bg: '1A0810', border: '6A2030', accent: 'E87080' },

  // Weather moods
  clear:     { bg: 'EEF4F8', border: '90B8D0', accent: '2A6A9A' },
  overcast:  { bg: 'E0E2E4', border: '9098A0', accent: '506070' },
  rain:      { bg: '1C2430', border: '384858', accent: '6898B8' },
  snow:      { bg: 'F0F4F8', border: 'C0D0E0', accent: '8AAAC0' },
  fog:       { bg: 'DCDEE0', border: 'A0A8B0', accent: '708090' },
  storm:     { bg: '0E1018', border: '282030', accent: '5A5880' },
  hot:       { bg: 'F4E8D8', border: 'C8905A', accent: 'A04020' },
  cold:      { bg: 'E4EEF4', border: '8AAAC0', accent: '2A5A7A' }
};

/* ── Apply space mood (default) ── */
function applySpaceMood() {
  const now    = new Date();
  const hour   = now.getHours();
  const month  = now.getMonth();
  const tod    = getTimeOfDay(hour);
  const season = getSeason(month);
  const moon   = getMoonPhase(now);

  // Check for strawberry moon (June full moon)
  const isStrawberry = month === 5 && moon === 'full';
  const moonKey      = isStrawberry ? 'strawberry_moon' : moon;
  const moonName     = isStrawberry ? 'Strawberry Moon' : NAMED_MOONS[month];

  // Blend: time of day is primary, season and moon add accent
  const palette = MOOD_PALETTES[tod];

  applyTheme(palette, tod);
  updateAtmosphereLabel(`${formatTimeLabel(tod)} · ${moonName} · ${capitalise(season)}`);
}

/* ── Apply weather mood ── */
function applyWeatherMood(code, cloudCover, temp) {
  // WMO weather codes → mood
  let mood = 'clear';
  if (code === 0)                      mood = 'clear';
  else if (code <= 2)                  mood = cloudCover > 60 ? 'overcast' : 'clear';
  else if (code === 3)                 mood = 'overcast';
  else if (code >= 45 && code <= 48)   mood = 'fog';
  else if (code >= 51 && code <= 67)   mood = 'rain';
  else if (code >= 71 && code <= 77)   mood = 'snow';
  else if (code >= 80 && code <= 82)   mood = 'rain';
  else if (code >= 85 && code <= 86)   mood = 'snow';
  else if (code >= 95)                 mood = 'storm';

  // Temperature override for extreme heat/cold
  if (temp > 28)  mood = 'hot';
  if (temp < -5)  mood = 'cold';

  const palette = MOOD_PALETTES[mood];
  applyTheme(palette, mood);
  updateAtmosphereLabel(`${capitalise(mood.replace('_', ' '))} · ${Math.round(temp)}°`);
}

/* ── Apply theme to CSS variables ── */
// Only touches background and border tokens — never images, colour pickers, or search results
function applyTheme(palette, tod) {
  if (!palette) return;
  const root  = document.documentElement;
  const dark  = isDarkMood(tod);

  root.style.setProperty('--theme-bg',      '#' + palette.bg);
  root.style.setProperty('--theme-surface',  '#' + adjustBrightness(palette.bg, dark ? 8 : -5));
  root.style.setProperty('--theme-border',   '#' + palette.border);
  root.style.setProperty('--theme-accent',   '#' + palette.accent);
  root.style.setProperty('--theme-text',     dark ? '#E8E4DC' : '#1C1C1A');
  root.style.setProperty('--theme-mid',      dark ? '#7A7468' : '#9A9080');

  document.body.setAttribute('data-theme', dark ? 'dark' : 'light');
}

function adjustBrightness(hex, amount) {
  return hex.match(/.{2}/g)
    .map(c => Math.max(0, Math.min(255, parseInt(c, 16) + amount))
      .toString(16).padStart(2, '0'))
    .join('');
}

function isDarkMood(tod) {
  return ['dusk', 'blue_hour', 'evening', 'deep_night', 'dawn',
          'new', 'waxing_crescent', 'full', 'rain', 'storm',
          'strawberry_moon'].includes(tod);
}

/* ── Atmosphere label ── */
function updateAtmosphereLabel(text) {
  const el = document.getElementById('atmosphere-label');
  if (el) el.textContent = text;
}

/* ── Helpers ── */
function formatTimeLabel(tod) {
  return {
    dawn:       'Dawn',
    morning:    'Morning',
    midday:     'Midday',
    afternoon:  'Afternoon',
    dusk:       'Dusk',
    blue_hour:  'Blue hour',
    evening:    'Evening',
    deep_night: 'Deep night'
  }[tod] || tod;
}

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
