# Gathera Church Atlas (Vue)

An editorial-style web atlas of the **Gathera SDA District** in Murang'a County, Kenya: churches, sabbath schools, and the road distances that connect them. Side-by-side schematic + satellite views, distance pills sourced from OSRM (with great-circle fallback), and a one-click PNG export of the whole plate.

This is a Vue 3 port of an original [Claude Design](https://claude.ai/design) HTML/CSS/JS prototype.

## Stack

- **Vue 3** (Composition API, `<script setup>` SFCs)
- **Vite** for dev server + build
- **Leaflet** for the geographic map; raw SVG for the schematic
- **html-to-image** for PNG export
- **Vitest** + **@vue/test-utils** + **jsdom** for unit tests
- **ESLint** (flat config) + **Prettier**

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
```

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server with HMR. |
| `npm run build` | Production build → `dist/`. |
| `npm run preview` | Preview the production build locally. |
| `npm test` | Run the test suite once. |
| `npm run test:watch` | Watch mode. |
| `npm run test:coverage` | Run with v8 coverage report. |
| `npm run lint` / `lint:fix` | ESLint. |
| `npm run format` / `format:check` | Prettier. |

## Project structure

```
src/
├── App.vue                  # composes header, two maps, footer, card
├── main.js                  # mounts the app, imports global CSS
├── assets/styles.css        # editorial / cartographic styles (unscoped)
├── data/
│   ├── church-data.js       # district, wards, churches, edges, summary
│   └── road-distances.js    # OSRM resolver with localStorage cache
└── components/
    ├── AppHeader.vue        # masthead + Fit/Details/Export controls
    ├── AppFooter.vue        # colophon with stats + license
    ├── ChurchCard.vue       # slide-in detail panel
    ├── SchematicMap.vue     # node-link SVG diagram
    ├── GeographicMap.vue    # Leaflet map with custom markers/edges
    ├── MorePanel.vue        # base layer + display toggles + paper tone
    ├── MapLegend.vue        # icon key
    ├── ChurchGlyph.vue      # SVG glyph reused in the schematic
    └── tile-layers.js       # shared base-layer config
tests/                       # Vitest suites (mirror src/ layout)
```

## Deployment (GitHub Pages)

The repo includes a workflow at `.github/workflows/deploy.yml` that builds and publishes to GitHub Pages on every push to `main`.

To enable it:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Push to `main`. The workflow installs deps, runs tests, builds with `VITE_BASE_PATH=/<repo-name>/`, and deploys.
3. The page will appear at `https://<your-org>.github.io/<repo-name>/`.

For local previews of the production build, set the env var:

```bash
VITE_BASE_PATH=/gathera-church-vue/ npm run build
npm run preview
```

## Editing the data

Church coordinates, membership figures, ward populations, and the district leader all live in [`src/data/church-data.js`](src/data/church-data.js). The OSRM road-distance lookup runs on app mount and caches results in `localStorage` keyed by rounded coordinates, so editing a coordinate invalidates only that pair's cache.

## Tweaks panel

The original prototype shipped a separate "Tweaks" floating panel that talked to the Claude Design host via `postMessage`. In this port, that protocol is removed — the in-page **More** dropdown (next to the Export button) exposes the same controls.

## License

MIT for the code (see `LICENSE`). The bundled data is derived from CMS records and the KNBS Kenya Population & Housing Census Vol. 1 (2019), which retain their own licenses — see the colophon in the UI for details. Map tiles are © their respective providers (Esri, OpenStreetMap, OpenTopoMap, CARTO).
