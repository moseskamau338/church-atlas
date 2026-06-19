# Gathera Church Atlas (Vue)

An editorial-style web atlas of the **Gathera SDA District** in Murang'a County, Kenya: churches, sabbath schools, and the road distances that connect them. Side-by-side schematic + satellite views, distance pills sourced from OSRM (with great-circle fallback), and a one-click PNG export of the whole plate.

This is a Vue 3 port of an original [Claude Design](https://claude.ai/design) HTML/CSS/JS prototype.

The app now ships **two pages**, switched via the nav pill at the top:

- **`/` — Church Atlas:** the original Gathera SDA District plate (unchanged).
- **`/traverse` — Traverse:** a general-purpose distance & route workbench. Search or click to add any set of locations, then read off the distance (and travel time) between *every* pair of points in a colour-keyed matrix. Choose the travel mode — **Direct** (straight-line), **Driving**, **Walking** or **Cycling** — and the connections redraw as real routed geometry on the map and a normalized schematic. See [Traverse & the Mapbox token](#traverse--the-mapbox-token).

## Stack

- **Vue 3** (Composition API, `<script setup>` SFCs)
- **Vue Router** (hash history) — two routes, lazy-loaded
- **Vite** for dev server + build
- **Leaflet** for the atlas map; **Mapbox GL JS** for the Traverse map; raw SVG for both schematics
- **Mapbox APIs** (Geocoding, Directions, Matrix) power Traverse search & routed distances
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
├── App.vue                       # thin RouterView shell + global nav
├── main.js                       # mounts the app, registers the router
├── router/index.js               # two lazy routes: / (atlas), /traverse (tool)
├── assets/styles.css             # editorial / cartographic styles (unscoped)
├── views/
│   ├── ChurchAtlasView.vue       # the original atlas page
│   └── DistanceToolView.vue      # the Traverse page
├── data/
│   ├── church-data.js            # district, wards, churches, edges, summary
│   └── road-distances.js         # OSRM resolver with localStorage cache
├── services/
│   ├── geo.js                    # haversine, geodesic arcs, schematic projector
│   └── mapbox.js                 # Geocoding / Directions / Matrix wrappers
├── composables/
│   ├── useDistanceSession.js     # Traverse session store (points, mode, matrix)
│   └── useRouteGeometry.js       # resolves connection geometry (shared by maps)
└── components/
    ├── AppHeader.vue             # atlas masthead + controls
    ├── AppFooter.vue             # colophon with stats + license
    ├── ChurchCard.vue            # slide-in detail panel
    ├── SchematicMap.vue          # atlas node-link SVG diagram
    ├── GeographicMap.vue         # atlas Leaflet map
    ├── MorePanel.vue             # base layer + display toggles
    ├── MapLegend.vue             # icon key
    ├── ChurchGlyph.vue           # SVG glyph reused in the schematic
    ├── tile-layers.js            # shared base-layer config
    └── tool/                     # Traverse-only components
        ├── ToolHeader.vue        # Traverse masthead + export
        ├── ModeSwitcher.vue      # Direct / Driving / Walking / Cycling
        ├── LocationSearch.vue    # Mapbox geocoder search box
        ├── LocationList.vue      # added locations (rename / remove / origin)
        ├── DistanceMatrix.vue    # N×N colour-keyed distance/time grid
        ├── ToolSchematicMap.vue  # editorial SVG of the session
        └── ToolGeographicMap.vue # Mapbox GL map with markers + route layers
tests/                            # Vitest suites (mirror src/ layout)
```

## Deployment (GitHub Pages)

The repo includes a workflow at `.github/workflows/deploy.yml` that builds and publishes to GitHub Pages on every push to `main`.

To enable it:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Push to `main`. The workflow installs deps, runs tests, builds with `VITE_BASE_PATH=/<repo-name>/`, and deploys.
3. The page will appear at `https://<your-org>.github.io/<repo-name>/`.
4. *(Optional)* To enable the Traverse map/search/routing in production, add a **`VITE_MAPBOX_TOKEN`** repository secret (Settings → Secrets and variables → Actions). The deploy workflow passes it into the build. Without it, Traverse ships in Direct mode.

For local previews of the production build, set the env var:

```bash
VITE_BASE_PATH=/gathera-church-vue/ npm run build
npm run preview
```

## Versioning & releases

Versions follow [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`). The current version is shown in the footer colophon and comes from `package.json` via Vite's `__APP_VERSION__` define — no manual sync needed.

Releases are cut by [**release-please**](https://github.com/googleapis/release-please). The bot watches `main` and, when there are unreleased changes, opens a `chore(main): release X.Y.Z` PR that:

- Bumps the version in `package.json` (and `.release-please-manifest.json`)
- Updates `CHANGELOG.md`
- Tags `vX.Y.Z` and creates a GitHub Release once you merge it

So a release is one click — review the PR, merge it, done. The deploy workflow then ships the new version to GitHub Pages.

**To make this work, commits to `main` must follow [Conventional Commits](https://www.conventionalcommits.org/):**

```
feat: add membership heatmap toggle           → minor bump
fix: correct great-circle fallback for OSRM   → patch bump
docs: clarify deployment steps                → patch bump
feat!: drop Vue 2 support                     → major bump (breaking)
refactor: extract tile-layer config           → patch bump
```

Pre-1.0 (current state), `feat` bumps the patch — breaking changes don't trip a major. Set `"bump-minor-pre-major": false` in `release-please-config.json` to change that behavior when you're ready for 1.0.

If you need a one-off manual bump (rare), `npm version <patch|minor|major>` works — release-please will pick up from wherever the version lands.

## Traverse & the Mapbox token

The Traverse tool (`/traverse`) uses Mapbox for place search, the basemap, and routed (driving / walking / cycling) distances. Provide a token to unlock those:

```bash
cp .env.example .env.local
# edit .env.local and set VITE_MAPBOX_TOKEN=pk.your_token_here
npm run dev
```

Get a free token at <https://account.mapbox.com/access-tokens/>. `.env.local` is git-ignored.

**Without a token**, Traverse still works in **Direct** mode: the schematic and the great-circle (straight-line) distance matrix render fully. The Mapbox map, search box, and routed modes show a prompt to add a token.

A few notes:

- **Train mode** is intentionally not included — no free routing API models rail networks. The modes are Direct, Driving, Walking, Cycling.
- The **Matrix API** computes the full pairwise grid in one request and is capped at **25 points** per Mapbox's limit; beyond that, switch to Direct mode.
- The session (your locations, mode, and connection settings) is persisted to `localStorage`, so it survives a reload.
- **Shareable links:** the **Share** button copies a URL that encodes the whole session into the hash (`#/traverse?s=…`) — no backend needed. Opening it rebuilds the exact points, travel mode, connection setting, travel-time toggle and basemap style, then cleans the URL. Links are immutable snapshots; a recipient editing locally doesn't affect your link. Very large sessions make long URLs.
- **Mobile:** the controls (mode, connections, travel time) and the places panel tuck into a slide-in drawer behind the **Configure & places** button.
- Rename the tool in one place: the `TOOL_NAME` constant in `src/views/DistanceToolView.vue`.

## Editing the data

Church coordinates, membership figures, ward populations, and the district leader all live in [`src/data/church-data.js`](src/data/church-data.js). The OSRM road-distance lookup runs on app mount and caches results in `localStorage` keyed by rounded coordinates, so editing a coordinate invalidates only that pair's cache.

## Tweaks panel

The original prototype shipped a separate "Tweaks" floating panel that talked to the Claude Design host via `postMessage`. In this port, that protocol is removed — the in-page **More** dropdown (next to the Export button) exposes the same controls.

## License

MIT for the code (see `LICENSE`). The bundled data is derived from CMS records and the KNBS Kenya Population & Housing Census Vol. 1 (2019), which retain their own licenses — see the colophon in the UI for details. Map tiles are © their respective providers (Esri, OpenStreetMap, OpenTopoMap, CARTO).
