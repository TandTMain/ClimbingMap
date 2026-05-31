const TYPE_CONFIG = {
  'via-ferrata': { color: '#e74c3c', label: 'Via Ferrata' },
  'gym':          { color: '#3498db', label: 'Climbing Gym' },
  'boulder':      { color: '#2ecc71', label: 'Outdoor Boulder' },
  'wall':         { color: '#e67e22', label: 'Outdoor Wall' },
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

async function init() {
  const res = await fetch('locations.json');
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

    marker.bindPopup(`
      <h3>${loc.name}</h3>
      ${badge}
      <p>${loc.description}</p>
      <small>${loc.address}${webLink}</small>
    `);

    marker._locData = loc;
    marker._type = loc.type;
    layerGroups[loc.type].addLayer(marker);
    markers.push(marker);
  });

  updateCount();

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

function applySearch() {
  const q = document.getElementById('search').value.trim().toLowerCase();

  markers.forEach((m) => {
    const typeGroup = layerGroups[m._type];
    const onMap = map.hasLayer(typeGroup);
    const matches = !q || m._locData.name.toLowerCase().includes(q);

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
    const tg = layerGroups[m._type];
    if (map.hasLayer(tg) && tg.hasLayer(m)) visible++;
  });
  document.getElementById('total-count').textContent = visible;
}

init();
