const TYPE_CONFIG = {
  'via-ferrata': { color: '#e74c3c', label: 'Via Ferrata' },
  'gym':          { color: '#3498db', label: 'Climbing Gym' },
  'boulder':      { color: '#2ecc71', label: 'Outdoor Boulder' },
  'wall':         { color: '#e67e22', label: 'Outdoor Wall' },
};

const FILTER_LABELS = {
  'via-ferrata': 'Via Ferrata',
  'gym':          'Climbing Gyms',
  'boulder':      'Outdoor Boulders',
  'wall':         'Outdoor Walls',
};

const map = L.map('map', { zoomControl: true }).setView([47.16, 19.50], 8);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 18,
}).addTo(map);

const markers = [];
const layerGroups = {};
for (const type of Object.keys(TYPE_CONFIG)) {
  layerGroups[type] = L.layerGroup().addTo(map);
}

function buildFilterUI() {
  const container = document.querySelector('.filter-group');
  for (const [type, cfg] of Object.entries(TYPE_CONFIG)) {
    const label = document.createElement('label');
    label.innerHTML = `
      <input type="checkbox" class="filter-cb" data-type="${type}" checked />
      <span class="color-dot" style="background:${cfg.color}"></span>
      ${FILTER_LABELS[type]}
    `;
    container.appendChild(label);
  }

  document.querySelectorAll('.filter-cb').forEach((cb) => {
    cb.addEventListener('change', () => {
      const type = cb.dataset.type;
      if (cb.checked) {
        map.addLayer(layerGroups[type]);
      } else {
        map.removeLayer(layerGroups[type]);
      }
      applySearch();
    });
  });

  document.getElementById('search').addEventListener('input', applySearch);
}

async function init() {
  try {
    const res = await fetch('locations.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const locations = await res.json();

    locations.forEach((loc) => {
      const cfg = TYPE_CONFIG[loc.type];
      const marker = L.circleMarker([loc.lat, loc.lng], {
        radius: 8,
        fillColor: cfg.color,
        color: '#fff',
        weight: 2,
        fillOpacity: 0.85,
      });

      const badge = `<span class="type-badge" style="background:${cfg.color}">${cfg.label}</span>`;
      const webLink = loc.website
        ? `<br/><a href="${loc.website}" target="_blank" rel="noopener">Website →</a>`
        : '';

      const basePopup = `
        <h3>${loc.name}</h3>
        ${badge}
        <p>${loc.description}</p>
        <small>${loc.address}${webLink}</small>
      `;

      marker.bindPopup(basePopup);

      marker.on('click', async () => {
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          const c = data.current;
          const emoji = weatherEmoji(c.weather_code);
          const desc = WMO_CODES[c.weather_code] || 'Unknown';
          marker.setPopupContent(basePopup + `
            <hr style="margin:8px 0;border:none;border-top:1px solid #eee"/>
            <small>${emoji} ${Math.round(c.temperature_2m)}°C (feels ${Math.round(c.apparent_temperature)}°C) &middot; ${desc}<br/>Wind: ${Math.round(c.wind_speed_10m)} km/h</small>
          `);
        } catch (err) {
          console.error('Failed to fetch weather for', loc.name, err);
        }
      });

      marker.locData = loc;
      marker.type = loc.type;
      layerGroups[loc.type].addLayer(marker);
      markers.push(marker);
    });

    updateCount();
  } catch (err) {
    document.getElementById('total-count').textContent = 'Failed to load locations';
    console.error('Failed to load locations:', err);
  }
}

function applySearch() {
  const q = document.getElementById('search').value.trim().toLowerCase();

  markers.forEach((m) => {
    const typeGroup = layerGroups[m.type];
    const onMap = map.hasLayer(typeGroup);
    const matches = !q || m.locData.name.toLowerCase().includes(q);

    if (onMap && matches) {
      if (!map.hasLayer(m)) typeGroup.addLayer(m);
    } else {
      typeGroup.removeLayer(m);
    }
  });

  updateCount();
}

function updateCount() {
  let visible = 0;
  markers.forEach((m) => {
    const tg = layerGroups[m.type];
    if (map.hasLayer(tg) && tg.hasLayer(m)) visible++;
  });
  document.getElementById('total-count').textContent = `${visible} locations shown`;
}

function weatherEmoji(code) {
  if (code === 0) return '☀️';
  if (code === 1) return '🌤️';
  if (code === 2) return '⛅';
  if (code === 3) return '☁️';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 57) return '🌦️';
  if (code >= 61 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌧️';
  if (code >= 85 && code <= 86) return '🌨️';
  if (code >= 95) return '⛈️';
  return '';
}

const WMO_CODES = {
  0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Depositing rime fog',
  51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
  56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
  61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  66: 'Light freezing rain', 67: 'Heavy freezing rain',
  71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
  85: 'Slight snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
};

async function fetchWeather(lat, lng) {
  const el = document.getElementById('weather-info');
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const c = data.current;
    const emoji = weatherEmoji(c.weather_code);
    const desc = WMO_CODES[c.weather_code] || 'Unknown';
    el.innerHTML = `${emoji} ${Math.round(c.temperature_2m)}&deg;C (feels ${Math.round(c.apparent_temperature)}&deg;C) &mdash; ${desc}<br/>Humidity: ${c.relative_humidity_2m}% &middot; Wind: ${Math.round(c.wind_speed_10m)} km/h`;
  } catch (err) {
    el.textContent = 'Weather unavailable';
    console.error('Failed to fetch weather:', err);
  }
}

let weatherTimer;
map.on('moveend', () => {
  clearTimeout(weatherTimer);
  weatherTimer = setTimeout(() => {
    const c = map.getCenter();
    fetchWeather(c.lat, c.lng);
  }, 1500);
});

fetchWeather(47.16, 19.50);
buildFilterUI();
init();
