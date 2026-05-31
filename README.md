# Hungarian Climbing Map

Interactive map of climbing locations in Hungary. Built with Leaflet.js.

## Location Types

| Type | Color | Count |
|------|-------|-------|
| Via Ferrata | Red | 6 |
| Climbing Gyms | Blue | 15 |
| Outdoor Boulders | Green | 2 |
| Outdoor Walls | Orange | 21 |

## How to Run

Start a local HTTP server in this directory:

```bash
python -m http.server 8080
```

Then open http://localhost:8080 in your browser.

## Features

- Colored circle markers by location type
- Click markers for details (description, address, website)
- Filter by type using checkboxes
- Search by location name
