# SG Grand Prix 2026

An interactive Marina Bay dashboard that replays the 11 October 2026 Singapore Grand Prix using recorded OpenF1 data. Built with Vite, JavaScript, Three.js and Canvas 2D. The weekend programme and bundled Formula 1 news cover the completed 2026 event.

Live dashboard: https://singapore-gp-dashboard.vercel.app/

## Run

```sh
npm install
cp .env.example .env.local
# Set VITE_DRIVER_PORTRAITS_URL to the public R2 base documented below.
npm run dev -- --port 5173
```

`npm run build` creates a static site in `dist/`. `npm test` checks historical classification, telemetry, tyre changes, standings, replay controls and camera flights. The relative Vite base supports deployment under a subdirectory.

## Use

- The race date, 11 October 2026 at 20:00 SGT, appears below the app name. The completed event has no countdown; the header retains the Singapore clock.
- The Data & Sources card sits directly below Paddock News and opens the source notes.
- Drag the circuit to orbit and use the wheel to zoom. Choose top down or reset the camera with the view buttons.
- The selected car has a tracking card with a 10% background tint and 12 px backdrop blur in Orbit and Top down. It shows a driver portrait on the left and the name, 2026 team, position and gap to the leader on the right. In Orbit, an off-screen car collapses the card into a portrait-only badge that follows the map edge. It expands when the car returns, stays clear of scene controls, and hides in Car cam. A failed photo uses the driver's initials.
- A separate vertical driver profile card sits to the left of the telemetry card, showing the R2 portrait, an inset 2026 team logo from Formula 1's media CDN, full name, current position, and gap. It fills the telemetry card's height and adds the driver's age at the 11 October 2026 race plus a short biography. Birth dates and biographies are bundled locally, with no runtime profile API requests. The footer card includes Data & Sources and a link to kartel.sh.
- Lens blur is always enabled at a fixed aperture of f/7.1. Focus follows the camera's orbit target or the selected driver in Car cam, with a smooth focus pull when the distance changes. Labels, charts and controls stay sharp. The effect samples the scene's depth buffer, so the holographic building scan remains aligned with the blur.
- Scroll the timing tower and select any of the 22 drivers to inspect their telemetry and 3D car. Choose Car cam for a close view that follows the selected driver. Switching drivers pulls back from the current car, flies across the circuit and zooms in on the destination car. The flight follows moving cars and can be redirected by selecting another driver. Drag to orbit the car and scroll to zoom after the flight settles. Reduced-motion settings switch directly without the camera flight.
- Pause, resume, restart, choose 1×/4×/8×/16× playback or seek through the historical race with the timeline inside the bottom of the taller circuit card. At 1×, replay time advances one second per real second, including after long visible frames. Hidden tabs pause advancement. Scene navigation hints, the axis and scale sit above the timeline. The initial view starts on Verstappen's lap 18 at 8× speed.
- The 2026 archive has no DRS samples, so the DRS status remains unavailable. The legacy DRS control is a bordered indicator beside the gear readout. Its text and border light up green when the recorded rear wing is open, and become muted when it is closed. It has no circle indicator. Missing samples use a dim dashed border. A tooltip and accessible label describe each state. A thin-line Tabler gearshift icon replaces the GEAR caption; its MIT license is included in `public/licenses/tabler-icons.txt`.
- Driver telemetry uses a segmented speed dial with a 0–360 km/h scale and a red high-speed zone, eight illuminated gear segments, and two small pedal gauges stacked to the right of the speedometer, with throttle above brake. Pedal colors run from white at 0% to bright green at 100%. The zero segment lights at 0%; missing samples leave the meter unlit. Pedals remain visible on mobile. The speed chart cursor follows the same elapsed-time axis and interpolation as the plotted line and hides its dot across missing samples. Its amber dot glows and pulses during playback, with a steady glow when paused or reduced motion is enabled. Small gear badges mark observed gear changes; hover, focus or tap one to see the previous and new gear, elapsed lap time and recorded speed. Markers use the archived samples and do not infer intermediate shifts between samples.
- The speed dial adapts the SVG geometry and composable instrument design from [Gauge UI](https://www.gauge-ui.dev/) to vanilla JavaScript and the dashboard theme. Its MIT license is included in `public/licenses/gauge-ui.txt`.
- Speed, throttle and brake needles, segment illumination and displayed numbers ease toward each recorded sample on every animation frame. Gear changes have a short color fade. Gauges continue settling when playback is paused, clear immediately for missing samples, and show values directly when reduced motion is enabled. This smooths the display without changing the archived telemetry or speed chart.
- Buildings start as fixed line silhouettes. A holographic scan grows outward from the entire circuit, following contours of distance from the track. The warm leading wave reveals facade bands, windows and rooftop details as it passes. A cool trailing wave follows the same path 0.5 seconds later and removes those details, leaving the line silhouettes. Details remain visible between the waves. The scan is visible only on the buildings; it has no colored outline on the ground. The cycle repeats every 16 seconds. Toggle City details to fade the skyline out or bring it back. Reduced-motion settings show fully revealed buildings with the light scan disabled. Open Data & sources for the data notes.

## Recorded race data

`public/data/singapore-2026.json` contains [OpenF1](https://openf1.org/) session **11388**, the race on **11 October 2026**. It includes all 22 drivers with their 2026 teams, lap starts and durations, sectors, standings, gaps to the leader, tyre stints, race-control messages, and recorded speed, gear, throttle and brake. The 2026 source has no DRS samples; the legacy indicator displays an unavailable state. The archive retains the first telemetry sample in each elapsed second. No API key or runtime API connection is required.

Cars follow each driver's recorded speed profile. The replay linearly interpolates valid speed samples and integrates metres traveled, then normalizes each lap to 4,927 m so the car crosses the line at the next recorded lap start. Missing speed intervals use lap timing; recorded stops remain stops. Speedometer targets and the speed-chart cursor use the same speed interpolation, while the gauges retain their short display easing. Cars follow the actual anti-clockwise racing direction.

An adaptive arc-length lookup keeps movement uniform on the unevenly spaced circuit coordinates. The previous coarse curve lookup caused artificial slowdowns at corners, and constant lap progress did not follow telemetry. Tests traverse the full circuit at constant speed and replay Russell's full initial lap at 1× against its speed profile.

These are estimated locations along the mapped centerline, not recorded GPS trajectories. Speed-chart horizontal positions represent time through the selected lap. Missing or stale telemetry displays a dash. Race-control timestamps show elapsed replay time. At the end, the timing tower uses official final classification, including penalties and lapped finishes.

Rebuild the archive with Python 3 and network access:

```sh
python scripts/import-history.py
```

The importer caches source responses in `.cache/openf1/`. Remove that directory before importing if you need fresh responses. The static archive is about 3.8 MB before HTTP compression.

## Schedule and visual model

Event dates and session times use the [official 2026 Singapore page](https://www.formula1.com/en/racing/2026/singapore), checked on 9 October 2026. Race start is 11 October at 20:00 Singapore time, or 12:00 UTC. Circuit length is 4.927 km and the Grand Prix has 62 laps. The clock displays Asia/Singapore time.

Circuit mapping comes from [Tomislav Bacinger's f1-circuits](https://github.com/bacinger/f1-circuits), licensed under MIT. Its license is included in `public/data/CIRCUIT-LICENSE.md`. This community mapping is not a surveyed or official circuit model. The filename `sg-2008` identifies the circuit; the coordinates include the straight introduced in 2023.

The surrounding road outlines use actual [OpenStreetMap](https://www.openstreetmap.org/copyright) centerlines, with estimated widths based on width, lane and road-class tags. The bundled extract has 2,939 road polylines and excludes underground roads and pedestrian paths. Two subtle edge lines show each street without a fill. Circuit overlaps are masked, and procedural buildings avoid the road corridors. The road data is licensed under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/), © OpenStreetMap contributors. Source metadata and bounds are included in `public/data/marina-bay-roads.geojson`.

Run `python3 scripts/import-streets.py` to regenerate the road extract. The importer caches source data in `.cache/osm/`, queries Overpass, and falls back to the OpenStreetMap map API if needed. The application loads only the bundled GeoJSON, with no runtime mapping-service requests.

The circuit shows asphalt, curbs, barriers and edge markings, with no colored centerline or glowing route tube. Driver birth dates come from [Jolpi driver metadata](https://api.jolpi.ca/ergast/f1/2026/drivers.json?limit=100), and brief career notes use [official Formula 1 driver biographies](https://www.formula1.com/en/drivers). Ages and career facts refer to the 11 October 2026 replay date.

The procedural city, landmark placement, road width, pit lane, barriers, lights, grandstands, sector divisions and corner labels are schematic. The display replays the recorded 2026 race and does not connect to live timing.

IBM Plex Mono uses the SIL Open Font License, included in `public/fonts/OFL.txt`. The design and implementation are original; the reference site was used for visual direction only.

## Car asset

The detailed car is **F1 Generic 2022 by TheoDev**, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The source archive is available in [diazandez/threejs-F1-2022-models](https://github.com/diazandez/threejs-F1-2022-models/tree/2f0c3e774c698b79095755093495f4b4a102d06e/f1_generic_2022). The original model's Sketchfab page is no longer available; its embedded attribution and archived license are preserved in `public/models/F1-CAR-LICENSE.txt` and `public/models/formula-car-source.json`.

The adapted model has a sculpted body, multi-element wings, halo, cockpit, suspension, textured tyres, brake parts, and detailed rims. The importer separates the four wheel pivots, prepares body paint for team colours, reduces geometry for two viewing distances, converts embedded textures to WebP, and compresses geometry with Meshopt. The 1,532,608-byte GLB contains 101,506 triangles for close views and 20,807 for the overview. Cars switch to the distant geometry beyond six scene units, with hysteresis to prevent flickering near the transition.

Rebuild the asset from its pinned source with:

```sh
npx --yes --package @gltf-transform/cli@4.4.0 -c 'node scripts/import-formula-car.js'
```

All 22 cars share geometry and textures. Team paint materials are cached, and tyre rotation uses each wheel's actual radius. A generated environment map adds reflections without an external HDR download. Car cam follows the selected driver and retains its smooth camera flights. This is a generic 2022-era F1 chassis with team colours. It does not reproduce each constructor's 2026 chassis or sponsor livery. Cars retain the small 0.34-scene-unit length.

Production loads the GLB once from Cloudflare R2's `dev-assets-bucket`, at `sg-grand-prix/models/f1-generic-2022-v1/formula-car.glb`, with a one-year immutable browser cache. Set `VITE_FORMULA_CAR_URL` to the public URL in `.env.example`. The binary is excluded from Vercel uploads. A local build without this variable loads `public/models/formula-car.glb`.

## Driver portraits

Portraits come from the official 2026 Formula 1 driver profile pages, matched to the OpenF1 roster. The download script records the source URL, dimensions and SHA-256 for each image in `public/data/driver-portrait-sources.json`. Photographs belong to their respective rights holders. The car model's CC BY license does not apply to them.

Refresh portraits with `python3 scripts/import-driver-portraits.py`. Each photograph is 192 × 208 pixels. Downloaded files are staged in `assets/driver-portraits/`, outside the static build, and excluded from Vercel uploads.

The 22 photographs are hosted in Cloudflare R2's existing `dev-assets-bucket`, under `sg-grand-prix/portraits/2026-v2/`. The public base is `https://pub-451ea606e71242028630e5aadc8cd8aa.r2.dev/sg-grand-prix/portraits/2026-v2`. Set `VITE_DRIVER_PORTRAITS_URL` to this value in `.env.local` for local builds and in Vercel's Production environment. Portraits use the current 2026 Formula 1 profile images, including Lindblad, Perez and Bottas. Only the selected driver's photograph loads, with a one-year immutable browser cache. Failed images fall back to initials.

Wrangler is installed as a dev dependency. Use `npx wrangler login --device` to connect Cloudflare from a remote workspace. Upload staged images with:

```sh
node scripts/upload-driver-portraits.js dev-assets-bucket sg-grand-prix/portraits/2026-v2 https://pub-451ea606e71242028630e5aadc8cd8aa.r2.dev
```

Use a new versioned prefix when refreshing image content to avoid stale immutable caches. Keep R2 credentials out of browser code and deployment source.

## Post-race news

Paddock News replaces Race Control with nine verified official Formula 1 articles published after the 2026 race. Each item links to its source and shows the publication time in Singapore time. The snapshot is compiled into the client bundle, with no runtime news API or polling. Refresh it with `python3 scripts/import-news.py` and rebuild.

Retired drivers stop at their last recorded moving telemetry sample and leave the circuit. Incomplete retirement laps retain integrated distance without scaling to a full lap. Seeking backward restores the car. Final standings include all 22 classified positions, DNF status and lapped gaps from [Jolpi's 2026 round 17 classification](https://api.jolpi.ca/ergast/f1/2026/17/results.json).

## Startup and reproduction

The loading screen uses a thin progress bar with a glowing red fill. Its width follows actual initialization stages. The screen fades away after fonts and the first rendered frames are ready. The dashboard remains inert until startup completes. Archive errors show Retry Loading; WebGL errors leave historical timing and telemetry usable.

The complete reproduction prompt is in [docs/dashboard-generation-prompt.md](docs/dashboard-generation-prompt.md).

## Hosting and replay traffic

Vercel serves static HTML, JavaScript, fonts, map geometry, and the bundled race archive. The compressed 2026 race archive is about 1.20 MB. The browser downloads the archive once at startup and calculates playback, seeking, car movement, and telemetry locally, without polling OpenF1 or invoking server functions. The shared car model and driver portraits load from Cloudflare R2. Team logos load from Formula 1's media CDN.

A fresh visit transfers the archive and static app assets once. Repeat-load transfer depends on browser caching. Vercel Hobby includes 100 GB of Fast Data Transfer and one million CDN requests; exceeding those allowances can interrupt availability without automatic usage overages. Review the current plan and [official Vercel limits](https://vercel.com/docs/plans/hobby) before upgrading. R2 and CDN pricing have separate allowances.
