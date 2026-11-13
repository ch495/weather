/* Weather Dashboard
   Data: Open-Meteo (free, no API key needed). https://open-meteo.com/ */
(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
  const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
  const DEFAULT_PLACE = { name: 'Kochi', region: 'Kerala', country: 'India', lat: 9.9312, lon: 76.2673 };

  /* ---------- Weather codes: [label, day icon, night icon] ---------- */
  const CODES = {
    0: ['Clear sky', '☀️', '🌙'], 1: ['Mainly clear', '🌤️', '🌙'],
    2: ['Partly cloudy', '⛅', '☁️'], 3: ['Overcast', '☁️', '☁️'],
    45: ['Fog', '🌫️', '🌫️'], 48: ['Freezing fog', '🌫️', '🌫️'],
    51: ['Light drizzle', '🌦️', '🌧️'], 53: ['Drizzle', '🌦️', '🌧️'], 55: ['Heavy drizzle', '🌧️', '🌧️'],
    56: ['Freezing drizzle', '🌧️', '🌧️'], 57: ['Freezing drizzle', '🌧️', '🌧️'],
    61: ['Light rain', '🌦️', '🌧️'], 63: ['Rain', '🌧️', '🌧️'], 65: ['Heavy rain', '🌧️', '🌧️'],
    66: ['Freezing rain', '🌧️', '🌧️'], 67: ['Freezing rain', '🌧️', '🌧️'],
    71: ['Light snow', '🌨️', '🌨️'], 73: ['Snow', '🌨️', '🌨️'], 75: ['Heavy snow', '❄️', '❄️'],
    77: ['Snow grains', '🌨️', '🌨️'],
    80: ['Light showers', '🌦️', '🌧️'], 81: ['Showers', '🌧️', '🌧️'], 82: ['Violent showers', '⛈️', '⛈️'],
    85: ['Snow showers', '🌨️', '🌨️'], 86: ['Heavy snow showers', '❄️', '❄️'],
    95: ['Thunderstorm', '⛈️', '⛈️'], 96: ['Thunderstorm with hail', '⛈️', '⛈️'],
    99: ['Severe thunderstorm with hail', '⛈️', '⛈️']
  };

  function describe(code, isDay = 1) {
    const c = CODES[code] || ['Unknown', '🌡️', '🌡️'];
    return { label: c[0], icon: isDay ? c[1] : c[2] };
  }

  function skyFor(code, isDay) {
    if (code <= 1) return isDay ? 'clear-day' : 'clear-night';
    if (code <= 3) return 'cloudy';
    if (code <= 48) return 'fog';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if (code >= 95) return 'storm';
    return 'rain';
  }

  /* ---------- Helpers ---------- */
  const state = { place: null, data: null, unit: read('wd-unit') === 'f' ? 'f' : 'c' };
  let suggestions = [];

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
  }

  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  const temp = (c) => `${Math.round(state.unit === 'f' ? (c * 9) / 5 + 32 : c)}°`;
  const speed = (kmh) => (state.unit === 'f' ? `${Math.round(kmh * 0.621371)} mph` : `${Math.round(kmh)} km/h`);
  const compass = (deg) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];
  const hourLabel = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric' });
  const clockLabel = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const uvLabel = (v) => (v < 3 ? 'Low' : v < 6 ? 'Moderate' : v < 8 ? 'High' : v < 11 ? 'Very high' : 'Extreme');
  const placeLine = (p) => [p.region, p.country].filter(Boolean).join(', ');

  function setStatus(message, withRetry = false) {
    $('#status').innerHTML = esc(message) +
      (withRetry ? ' <button type="button" id="retry" class="link">try again</button>.' : '');
  }

  /* ---------- Data ---------- */
  async function loadPlace(place) {
    state.place = place;
    setStatus('Loading forecast…');
    const params = new URLSearchParams({
      latitude: place.lat,
      longitude: place.lon,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m',
      hourly: 'temperature_2m,weather_code,precipitation_probability,is_day',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max',
      timezone: 'auto',
      forecast_days: 7
    });
    try {
      const res = await fetch(`${FORECAST_URL}?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state.data = await res.json();
      write('wd-last', place);
      remember(place);
      setStatus('');
      render();
    } catch (err) {
      state.data = null;
      $('#app').hidden = true;
      setStatus('We couldn’t load the forecast. Check your connection, then', true);
    }
  }

  async function geocode(query, count) {
    const params = new URLSearchParams({ name: query, count, language: 'en', format: 'json' });
    const res = await fetch(`${GEOCODE_URL}?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return (json.results || []).map((r) => ({
      name: r.name, region: r.admin1 || '', country: r.country || '', lat: r.latitude, lon: r.longitude
    }));
  }

  /* ---------- Render ---------- */
  function render() {
    const { current: c, hourly: h, daily: d } = state.data;
    const isDay = c.is_day === 1;
    const now = describe(c.weather_code, isDay);

    document.body.dataset.sky = skyFor(c.weather_code, isDay);
    document.body.dataset.night = isDay ? '0' : '1';
    $('#app').hidden = false;

    // Current conditions
    const when = new Date(c.time).toLocaleString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
    $('#now').innerHTML = `
      <p class="when">${esc(when)}</p>
      <h2 id="placeName">${esc(state.place.name)}</h2>
      <p class="where">${esc(placeLine(state.place))}</p>
      <div class="temp-row">
        <span class="temp">${temp(c.temperature_2m)}</span>
        <span class="cond"><span class="cond-icon" aria-hidden="true">${now.icon}</span>${esc(now.label)}</span>
      </div>
      <p class="range">
        <span>High <strong>${temp(d.temperature_2m_max[0])}</strong></span>
        <span>Low <strong>${temp(d.temperature_2m_min[0])}</strong></span>
      </p>`;

    // Next 24 hours, starting from the current hour at the city's local time
    const start = Math.max(0, h.time.findIndex((t) => t >= `${c.time.slice(0, 13)}:00`));
    $('#hourly').innerHTML = h.time.slice(start, start + 24).map((time, k) => {
      const i = start + k;
      const w = describe(h.weather_code[i], h.is_day[i]);
      return `<li>
        <span class="h-time">${k === 0 ? 'Now' : hourLabel(time)}</span>
        <span class="h-icon" role="img" aria-label="${esc(w.label)}">${w.icon}</span>
        <span class="h-temp">${temp(h.temperature_2m[i])}</span>
        <span class="h-rain">${h.precipitation_probability[i] ?? 0}%</span>
      </li>`;
    }).join('');

    // 7-day forecast with a range bar scaled across the whole week
    const lo = Math.min(...d.temperature_2m_min);
    const hi = Math.max(...d.temperature_2m_max);
    const span = hi - lo || 1;
    $('#daily').innerHTML = d.time.map((date, i) => {
      const width = Math.max(((d.temperature_2m_max[i] - d.temperature_2m_min[i]) / span) * 100, 8);
      const left = Math.min(((d.temperature_2m_min[i] - lo) / span) * 100, 100 - width);
      const name = i === 0 ? 'Today' : new Date(`${date}T00:00`).toLocaleDateString('en-US', { weekday: 'short' });
      const w = describe(d.weather_code[i]);
      return `<li>
        <span class="d-day">${name}</span>
        <span class="d-icon" role="img" aria-label="${esc(w.label)}">${w.icon}</span>
        <span class="d-rain">${d.precipitation_probability_max[i] ?? 0}%</span>
        <span class="d-lo">${temp(d.temperature_2m_min[i])}</span>
        <span class="bar" aria-hidden="true"><i style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%"></i></span>
        <span class="d-hi">${temp(d.temperature_2m_max[i])}</span>
      </li>`;
    }).join('');

    // Conditions right now
    const uv = d.uv_index_max[0];
    const stats = [
      ['Feels like', temp(c.apparent_temperature)],
      ['Humidity', `${Math.round(c.relative_humidity_2m)}%`],
      ['Wind', `${speed(c.wind_speed_10m)} <small>${compass(c.wind_direction_10m)}</small>`],
      ['Pressure', `${Math.round(c.pressure_msl)} <small>hPa</small>`],
      ['UV index today', `${Math.round(uv)} <small>${uvLabel(uv)}</small>`],
      ['Chance of rain', `${d.precipitation_probability_max[0] ?? 0}%`],
      ['Sunrise', clockLabel(d.sunrise[0])],
      ['Sunset', clockLabel(d.sunset[0])]
    ];
    $('#stats').innerHTML = stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

    document.title = `${temp(c.temperature_2m)} ${state.place.name} | Weather Dashboard`;
  }

  /* ---------- Recent cities ---------- */
  function remember(place) {
    const list = (read('wd-recent') || []).filter((p) => !(p.lat === place.lat && p.lon === place.lon));
    list.unshift(place);
    write('wd-recent', list.slice(0, 5));
    renderRecent();
  }

  function renderRecent() {
    const list = read('wd-recent') || [];
    $('#recent').innerHTML = list.map((p, i) => `<button type="button" data-i="${i}">${esc(p.name)}</button>`).join('');
  }

  /* ---------- Search ---------- */
  function hideSuggest() {
    const ul = $('#suggest');
    ul.hidden = true;
    ul.innerHTML = '';
    $('#q').setAttribute('aria-expanded', 'false');
  }

  async function showSuggest(query) {
    try {
      const list = await geocode(query, 5);
      if ($('#q').value.trim() !== query) return; // a newer search replaced this one
      suggestions = list;
      const ul = $('#suggest');
      ul.innerHTML = list.length
        ? list.map((p, i) => `<li role="option"><button type="button" data-i="${i}">${esc(p.name)}<small>${esc(placeLine(p))}</small></button></li>`).join('')
        : '<li class="none">No cities found. Check the spelling.</li>';
      ul.hidden = false;
      $('#q').setAttribute('aria-expanded', 'true');
    } catch {
      hideSuggest();
    }
  }

  function pick(place) {
    hideSuggest();
    $('#q').value = '';
    loadPlace(place);
  }

  let timer;
  $('#q').addEventListener('input', (e) => {
    clearTimeout(timer);
    const query = e.target.value.trim();
    if (query.length < 2) return hideSuggest();
    timer = setTimeout(() => showSuggest(query), 300);
  });

  $('#searchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearTimeout(timer);
    const query = $('#q').value.trim();
    if (!query) return;
    try {
      const [first] = await geocode(query, 1);
      if (first) pick(first);
      else { hideSuggest(); setStatus(`No city found for “${query}”. Check the spelling or try a nearby city.`); }
    } catch {
      setStatus('We couldn’t search right now. Check your connection and try again.');
    }
  });

  $('#suggest').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-i]');
    if (btn) pick(suggestions[Number(btn.dataset.i)]);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#searchForm')) hideSuggest();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideSuggest();
  });

  $('#recent').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-i]');
    const place = btn && (read('wd-recent') || [])[Number(btn.dataset.i)];
    if (place) loadPlace(place);
  });

  $('#status').addEventListener('click', (e) => {
    if (e.target.id === 'retry') loadPlace(state.place || DEFAULT_PLACE);
  });

  /* ---------- Location and units ---------- */
  $('#locate').addEventListener('click', () => {
    if (!navigator.geolocation) {
      setStatus('Your browser doesn’t support location. Search for a city instead.');
      return;
    }
    setStatus('Finding your location…');
    navigator.geolocation.getCurrentPosition(
      (pos) => loadPlace({
        name: 'Your location', region: '', country: '',
        lat: Number(pos.coords.latitude.toFixed(4)), lon: Number(pos.coords.longitude.toFixed(4))
      }),
      () => setStatus('Location access was blocked. Allow it in your browser settings, or search for a city.'),
      { timeout: 10000 }
    );
  });

  function setUnit(unit) {
    state.unit = unit;
    write('wd-unit', unit);
    document.querySelectorAll('.units button').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.unit === unit)));
    if (state.data) render();
  }
  document.querySelectorAll('.units button').forEach((b) =>
    b.addEventListener('click', () => setUnit(b.dataset.unit)));

  /* ---------- Start ---------- */
  setUnit(state.unit);
  renderRecent();
  loadPlace(read('wd-last') || DEFAULT_PLACE);
})();
