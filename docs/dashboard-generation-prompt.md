# Build SG Grand Prix 2026 in one pass

Build and finish a responsive, interactive Formula 1 dashboard called **SG Grand Prix 2026**. It presents a miniature 3D Marina Bay circuit and replays the completed 11 October 2026 Singapore Grand Prix with recorded data. The header has the race date and Singapore clock, with no countdown. Deliver the working application, downloaded assets, data importer, source notes, verification, and Vercel deployment when the account is connected. Make routine implementation decisions and complete the work without stopping at a plan.

Use recorded race data, track-shaped building scans, green pedal gauges, and verified post-race news specified below.

## Match the visual direction

Study https://beastydesign.github.io/scifi/ for the visual direction and motion. Build an original implementation with its dark scientific dashboard character, fine technical typography, translucent panels, miniature city, holographic building details, and camera depth of field. Do not copy the reference site's proprietary source or assets.

Use a charcoal background `#080a0c`, pale text `#d6dade`, amber accent `#ffad66`, muted gray `#697179`, and saturated green `#22e875` for pedal gauges and the active DRS indicator. Use locally bundled IBM Plex Mono Light for the default typography and Medium for the instrument labels, with its SIL Open Font License. Use thin borders, short bracket corners, small uppercase captions, tabular numbers, subtle scanlines, and restrained glows. Cards are dark and slightly translucent. Keep text legible and controls sharp. Avoid rounded consumer-app cards, bright page backgrounds, large gradients, and decorative stock UI.

Use Vite, vanilla JavaScript modules, Three.js, Canvas 2D charts, and SVG gauges. Keep the application a static site that works without a runtime API key or server. Separate historical race state, scene rendering, car-camera transitions, building scans, lens blur, driver tracking cards, gauge animation, and chart calculations into clear modules.

## Build the final layout

The desktop dashboard fills the viewport with a masthead and three columns. Use roughly 264 px side columns, an expanding central column, 14 px gaps, and about 22 px page padding. At large desktop widths, use 300 px side columns and 18 px gaps. Allow vertical scrolling when needed rather than clipping controls.

The masthead contains:

- A white F1 logo and **SG GRAND PRIX 2026** name on the left, with the small race-date caption `11 OCT 2026 · 20:00 SGT`. Bundle the SVG logo locally, preserve its proportions, and display it without the old square SG badge or arrow. Use a semantic time element with `datetime="2026-10-11T12:00:00Z"`.
- An Asia/Singapore clock on the right, labeled `MARINA BAY · SGT`.

Remove the countdown markup, its timer calculations, and the extra mobile header row. The completed race needs only the F1 brand, race date and Singapore clock. Use an F1 favicon on a charcoal background and the descriptive app name throughout.

Arrange the columns as follows:

- Left: Session Control, a scrollable Timing Tower for all 22 drivers, and Weekend 2026.
- Center: a tall Marina Bay 3D circuit card, then the selected driver's profile and telemetry instruments.
- Right: Recorded Sectors, Paddock News, then a compact Data & Sources card.

The replay timeline is **inside the bottom of the circuit card**. It is not a separate card below telemetry. Give the map the vertical space reclaimed by that move. At 1920 × 1080, aim for a circuit card around 728 px tall. Use a minimum height of about 480 px on desktop, 520 px on tablet, and 540 px on mobile. Place scene navigation hints, the City Details toggle, scale, and axis higher so they sit above the integrated timeline. The timeline contains an amber progress slider, `2026 RACE REPLAY`, current lap or final-classification text, and start/midpoint/finish captions. Give it a subtle top border and translucent dark backing.

The footer card sits directly after Paddock News. Show the `DATA & SOURCES ↗` button, which opens a source notes dialog, and a `KARTEL.SH ↗` link to https://kartel.sh that opens in a new tab. Place the links beside one another on desktop and stack them when the card is narrow. There is no old full-width footer, Global Position/globe card, or Next Lights Out card.

On tablet, use two main columns and arrange the right-side cards below them. On mobile, place the circuit and telemetry first, followed by session/timing/weekend and the remaining cards. Keep the throttle and brake visible beside the speedometer. Put the speed chart across the full width below the gauges. Support 320 px widths without horizontal overflow. At widths of 360 px or less, put all four replay-rate buttons on their own row below play/pause and restart so the controls fit inside Session Control.

## Use recorded 2026 race data

Replay the **11 October 2026 Singapore Grand Prix**, OpenF1 session **11388**, with all 22 drivers and their 2026 teams. Fetch and bundle a compact historical archive during development. Use https://api.openf1.org/v1/ for driver metadata, laps, sectors, positions, intervals, stints, race-control messages, and car telemetry. Preserve recorded speed, gear, throttle, brake, and DRS. Keep roughly the first telemetry sample per elapsed second and record the sampling policy.

Use https://api.jolpi.ca/ergast/f1/2026/17/results.json for the authoritative final classification, including penalties and lapped finishes. Validate the archive against this source at the end of the replay.

Use the actual 2026 grid from OpenF1 session 11388, including Audi and Cadillac. The archive contains 22 drivers. Do not reuse the 2025 roster.

| Number | Code | Driver | Team | Team color |
| --- | --- | --- | --- | --- |
| 3 | VER | Max Verstappen | Red Bull Racing | `#4781D7` |
| 16 | LEC | Charles Leclerc | Ferrari | `#ED1131` |
| 12 | ANT | Kimi Antonelli | Mercedes | `#00D7B6` |
| 1 | NOR | Lando Norris | McLaren | `#F47600` |
| 81 | PIA | Oscar Piastri | McLaren | `#F47600` |
| 44 | HAM | Lewis Hamilton | Ferrari | `#ED1131` |
| 30 | LAW | Liam Lawson | Racing Bulls | `#6C98FF` |
| 27 | HUL | Nico Hulkenberg | Audi | `#F50537` |
| 63 | RUS | George Russell | Mercedes | `#00D7B6` |
| 6 | HAD | Isack Hadjar | Red Bull Racing | `#4781D7` |
| 10 | GAS | Pierre Gasly | Alpine | `#00A1E8` |
| 87 | BEA | Oliver Bearman | Haas F1 Team | `#9C9FA2` |
| 31 | OCO | Esteban Ocon | Haas F1 Team | `#9C9FA2` |
| 55 | SAI | Carlos Sainz | Williams | `#1868DB` |
| 41 | LIN | Arvid Lindblad | Racing Bulls | `#6C98FF` |
| 14 | ALO | Fernando Alonso | Aston Martin | `#229971` |
| 11 | PER | Sergio Perez | Cadillac | `#909090` |
| 23 | ALB | Alexander Albon | Williams | `#1868DB` |
| 77 | BOT | Valtteri Bottas | Cadillac | `#909090` |
| 18 | STR | Lance Stroll | Aston Martin | `#229971` |
| 43 | COL | Franco Colapinto | Alpine | `#00A1E8` |
| 5 | BOR | Gabriel Bortoleto | Audi | `#F50537` |

Start with Verstappen selected on lap 18, playing at 8×. Provide pause/play, restart, seek, and **1×/4×/8×/16×** rates. At 1×, one second of wall-clock playback advances the recorded race by one second. Advance the replay using the complete elapsed frame time; do not cap or discard long visible frames, because that slows playback on busy devices. Pause advancement while the page is hidden and reset the frame timestamp when visibility changes. Put the 1× button before the faster rates, highlight the active rate, and expose its pressed state. Keep all four rates usable on mobile. Timing tower rows show position, driver code, team, gap to leader, and current tyre compound. Selecting a driver updates the telemetry, sectors, tracked car, portrait card, and Car cam destination. Reconstruct standings and tyres from the records at the selected replay time. Retain race-control messages in the archive for reproducibility; show Paddock News in their former panel. Handle seeking backward as well as forward. Highlight the active recorded sector using elapsed lap time and recorded sector durations, independently of the car's distance fraction.

Display a dash for missing or stale telemetry. Treat samples older than about 2.5 seconds as unavailable. Hide the speed cursor across data gaps and after the selected car finishes. Preserve lapped gap strings such as `+1 LAP`. Display `LEADER` for P1. Freeze at the actual final classification when the replay ends. Preserve DNF classifications and all 22 published positions. Retired drivers stop at their last recorded moving telemetry sample and leave the circuit. Integrate an incomplete retirement lap without stretching its distance to a full lap; seeking backward restores the car. Clear the selected retired driver's telemetry. Never let a retired car continue driving to the end of the race. Do not generate random telemetry, predicted 2026 results, or fictional race-control events.

Drive every car's movement with its recorded speed profile. Linearly interpolate speed between adjacent valid samples, convert km/h to metres per second, and integrate speed over replay time. Build a cumulative distance profile for each lap. Normalize that profile to the official 4,927 m circuit length so cars cross the line at the next recorded lap start. Use the recorded duration for the final lap. This small per-lap distance correction keeps timing and estimated location synchronized; do not move cars at constant speed through each lap. Preserve recorded stops. Use lap timing for missing speed intervals rather than freezing a car because data is absent. At 1×, visible acceleration and braking must follow the telemetry. The speedometer's target and chart cursor use the same interpolation, with the accepted short gauge easing applied to presentation only.

Travel in Marina Bay's actual **anti-clockwise** direction. Preserve the source map's start/finish anchor, and reverse the coordinate order if necessary. Use an accurate arc-length mapping for the entire circuit. The uneven spacing of the source coordinates must not produce stalls, bursts, or abrupt state changes at corners. An adaptive distance lookup is suitable; Three.js's default coarse curve-length lookup is insufficient for this circuit. Orient cars along the distance-based tangent and spin wheels from traveled distance. Movement must stay deterministic when pausing, seeking, restarting, changing drivers, or switching between 1×/4×/8×/16×.

These car positions are telemetry-guided estimates on the mapped centerline, not recorded GPS trajectories. Explain the distance correction, sampling policy, missing-data fallback, and schematic geometry in Data & Sources.

Keep the separate 2026 weekend programme based on https://www.formula1.com/en/racing/2026/singapore. Show Singapore times: 9 October Practice 1 at 16:30 and Sprint qualifying at 20:30; 10 October Sprint at 17:00 and Qualifying at 21:00; 11 October Grand Prix at 20:00. Label that card `WEEKEND 2026`. Keep the 2026 replay labeled clearly in Session Control and the timeline.

## Build a detailed miniature circuit and city

Use Marina Bay circuit coordinates from https://github.com/bacinger/f1-circuits and bundle its MIT license. Use the modern route with the straight introduced in 2023. The circuit is 4.927 km with 19 turns and a 62-lap Grand Prix.

Render a recognizable, geographically shaped circuit with asphalt, road markings, curbs, barriers, a schematic pit lane, grandstands, floodlights, start/finish, sector divisions, corner labels, a scale, and an axis indicator. Keep the asphalt free of a colored centerline or glowing route tube. Show sector colors in the data panels, with subtle track-edge details on the circuit. Render detailed procedural buildings with floor bands, window grids, structural lines, and rooftop details. Include recognizable schematic Marina Bay Sands, Singapore Flyer, and Padang landmarks. Keep the result an elegant miniature city rather than a photorealistic street simulator.

Draw the actual surrounding non-track roads as **outlines only**. Import OpenStreetMap motor-vehicle road geometry around Marina Bay and bundle a static GeoJSON extract. Use the same geographic projection and origin as the circuit. Render two subtle cool-gray edge lines per road, with no filled asphalt, centerlines, markings, traffic, or traveling scan on these streets. Estimate edge widths from OSM width or lane tags, with road-class defaults where those tags are absent. Keep the amber circuit dominant, and mask street-outline sections that overlap its asphalt and barriers. Keep procedural building footprints clear of the mapped streets. The existing extract covers circuit bounds plus 0.009 degrees of longitude and 0.006 degrees of latitude, with 2,939 road polylines. Exclude underground roads and pedestrian paths. Use a spatial segment index for overlap and building-clearance queries.

Provide `scripts/import-streets.py` to reproduce `public/data/marina-bay-roads.geojson`. Cache the source, query Overpass during development, and use the OpenStreetMap map API as a fallback when Overpass is unavailable. Include download metadata, the source query or bounds, `© OpenStreetMap contributors`, and the ODbL 1.0 links. Explain that road centerlines are mapped data and their rendered edge widths are estimates. Do not call Overpass from the browser or substitute a fictional road grid.

Use a perspective orbit view, roughly a 38-degree field of view, with damping and slow auto-orbit when idle. Provide Orbit, Top Down, Car Cam, and Reset controls. Drag orbits and scroll zooms. Pause auto-orbit during manual interaction. Include a City Details checkbox that fades the skyline out and back in.

Give the Marina Bay title block 8 px vertical and 12 px horizontal padding. Give the bottom scene control strip 6 px vertical and 12 px horizontal padding. Keep labels clear of controls and the timeline. Remove visible debug readouts such as `Circuit / 19 turns`, `Car locations / lap interpolation`, and `points / WebGL`. Keep implementation notes in the sources dialog.

Use the detailed **F1 Generic 2022 by TheoDev**, CC BY 4.0, available in the pinned source archive at https://github.com/diazandez/threejs-F1-2022-models/tree/2f0c3e774c698b79095755093495f4b4a102d06e/f1_generic_2022. Preserve its sculpted body, halo, multi-element wings, suspension, cockpit, textured tyres and detailed rims. Include the original attribution in `public/models/F1-CAR-LICENSE.txt` and record source URLs, hashes and adaptations in `public/models/formula-car-source.json`. This is a generic 2022-era chassis with team colours, not an exact 2026 constructor car or sponsor livery. Reproduce the asset with `scripts/import-formula-car.js` through the pinned glTF Transform 4.4.0 tool. Split tyres, rims and brake geometry into four wheel pivots, prepare neutral body materials for team recolouring, embed WebP textures up to 1024px, and use Meshopt compression. The 1,532,608-byte GLB contains 101,506 triangles for close views and 20,807 for distant views. Switch to distant geometry beyond six scene units with hysteresis. Share geometry and textures across all 22 cars, cache team paint materials, orient the nose along the circuit tangent, and spin each wheel from traveled distance divided by its actual radius. Add a generated environment map for reflections without an external HDR request. Keep cars small, around 0.34 scene units long. Use a restrained selection ring. Load the shared model once from R2 at https://pub-451ea606e71242028630e5aadc8cd8aa.r2.dev/sg-grand-prix/models/f1-generic-2022-v1/formula-car.glb with a one-year immutable cache. Set `VITE_FORMULA_CAR_URL` to that URL in production and exclude `public/models/formula-car.glb` from Vercel uploads. An unset variable uses the bundled local asset. Do not represent cars as circles or oversized markers.

## Animate a track-shaped holographic scan

Buildings begin as fixed line silhouettes. Reveal the detailed building geometry with a shader-driven light wave that originates from the entire circuit and grows outward following the shape of the track.

Calculate distance to the nearest track segment or use a distance-field equivalent. Animate the reveal threshold outward. The leading warm wave reveals facade details, windows, floor bands, and roofs as it passes. A trailing clearing wave follows **0.5 seconds behind** along the same contours and removes those details. The detailed surface is visible between the two fronts, then returns to its fixed silhouette. Repeat the sequence on an approximately 16-second cycle.

Keep the light on the building surfaces. There must be **no visible colored expanding outline on the ground**. Building silhouette lines remain visible throughout. Do not use the abandoned top-down reveal, uniformly fade whole buildings, or animate a circular ground ring unrelated to the circuit shape. With reduced motion enabled, show a static detailed city and disable the traveling scan.

## Lock the lens effect and animate camera changes

Enable depth-based lens blur at all times with the aperture fixed at **f/7.1**. Autofocus follows the orbit target in overview and the selected car in Car cam. Ease focus distance changes. Apply the blur to the 3D scene, including the building details, while keeping DOM cards, Canvas labels, charts, and controls sharp. Do not expose an aperture, focus, or lens settings panel.

When Car cam is active and the driver changes, animate the viewport rather than cutting:

1. Keep looking at the outgoing moving car while pulling back and zooming out slightly.
2. Fly across the circuit toward the destination car with a smooth camera position and look target.
3. Zoom into the destination moving car and settle into its chase/orbit view.

Retarget from the current camera pose if another driver is selected mid-flight. Follow moving cars during departure and arrival. Restore drag and zoom controls when the flight settles. Cancel the flight when the user returns to Orbit or Top Down. Reduced-motion settings switch directly without the flight.

## Redesign the car-following driver card

Replace the tiny code/speed label beside the selected car with a translucent tracking panel matching the other cards. Show it in Orbit and Top Down, and hide it in Car cam.

The left side contains the driver's profile photograph. The right side is a vertical stack of full driver name, team, then position and gap on one row. Use a small team-color accent beside the team. Example: `GEORGE RUSSELL`, `MERCEDES`, `P01 | LEADER`. Another driver can show `P02 | +8.472s`. Preserve lapped gaps and missing values.

Use an approximately 252 × 82 px card on desktop and 228 × 74 px on mobile, with 10 px or 8 px padding. Use a roughly 52 × 60 px portrait on desktop, a dark background tint at exactly 10% opacity, 12 px backdrop blur, thin border, and bracket corners. Apply transparency only to the background, keeping the portrait, name, team, position, and gap at full opacity. Keep the name and team sharp and readable.

Project the selected car into screen coordinates every frame and move the card with a GPU transform. Prefer placing it above/right of the car, flip to the left near the right edge, and clamp it inside the circuit card. Reserve space for the title, view controls, lower navigation strip, and integrated timeline. In Orbit mode, when the selected car leaves the screen or passes behind the camera, smoothly collapse the card into a portrait-only badge. Keep the badge inside the map and follow the nearest edge toward the car's off-screen direction. Do not add an arrow. When the car returns, smoothly expand the full driver card and resume following it. Animate the width and fade the details without wrapping them during the transition; constrain the card throughout expansion as well as collapse. Respect reduced motion. Top Down retains the full card for visible cars; Car cam hides it. Let pointer events pass through so it does not block camera interaction. Update the portrait and text whenever the selected driver changes. Use initials when a photograph fails.

### Serve portraits from Cloudflare R2

Keep driver photograph binaries off Vercel. Load only the selected driver's photograph; do not preload the entire grid. Use long browser caching and a versioned prefix so selecting a previously viewed driver reuses its cached image.

The existing public R2 base is:

`https://pub-451ea606e71242028630e5aadc8cd8aa.r2.dev/sg-grand-prix/portraits/2026-v2`

Each file is `{CODE}.png`, for example `RUS.png`, `VER.png`, and `COL.png`. Set `VITE_DRIVER_PORTRAITS_URL` to that public base or to the replacement public R2 base. Never put Cloudflare credentials in client code.

For a fresh asset import, use the OpenF1 session 11388 roster and the official 2026 Formula 1 driver profile portrait URLs. Legacy OpenF1 headshot URLs can return old kits or generic silhouettes, so verify the current-season portrait. Convert the official profile portraits to PNG and keep them in R2. Download to a staging folder outside `public/`, record URLs and hashes, then upload to R2 with `Content-Type: image/png` and `Cache-Control: public, max-age=31536000, immutable`. Exclude staged photographs from Vercel uploads and the static build. Preserve portrait attribution separately from the CC BY car license. Use the existing `dev-assets-bucket` and the isolated prefix above when access is available, without changing unrelated bucket content or access settings.

## Build animated telemetry instruments

Study https://www.gauge-ui.dev/#install and adapt its gauge geometry and design to the dark dashboard. Include its MIT license if using its code. SVG is suitable for this vanilla JavaScript implementation.

Remove the telemetry card's old `DRIVER TELEMETRY` heading, section-letter badge, and driver-code/lap caption such as `VER / LAP 51`. Place a compact vertical driver profile card as a separate sibling card to the left of the telemetry card, with its own border and spacing. Do not nest it inside the telemetry card. Its first row is the R2-hosted driver's portrait, with the actual 2026 team logo inset over the lower-right corner. The second row shows the driver's full name. The third row shows current position and gap to the leader, preserving `LEADER`, numeric gaps, lapped gaps, and missing values. Stretch this separate card to the full height of the neighboring telemetry card, aligning both top and bottom edges at every breakpoint. Add an age and a brief factual biography below the identity and race position. Calculate age from the driver birth date at the replay race date, 11 October 2026, rather than the current date. Make the age reference date clear in a tooltip and accessible text, and explain it in Data & Sources. Bundle birth dates and concise biographies for all 22 drivers, using Jolpi driver metadata and official Formula 1 biographies as development-time sources. Use only career facts already true by the replay date. Selection updates this information without runtime biography API calls. Give the extra text readable padding and allow it to wrap without clipping. Use the official Formula 1 media CDN's white 2026 team logos, including Audi and Cadillac. Update the profile whenever selection or race timing changes. Keep the same selected portrait URLs as the floating map card so the browser reuses cached images. On mobile keep the separate profile card on the left and the telemetry card on the right. Inside telemetry, keep the speedometer beside the stacked pedal gauges and put the speed chart below. Use roughly 156 px for the profile on desktop, 124 px on tablet, 108 px on mobile, and 84 px at 320 px. Scale the profile and gauges to fit 320 px without horizontal overflow, keeping the biography readable and both cards equal in height.

The speedometer uses a 0–360 km/h scale, segmented amber arc, subtle red high-speed zone, ticks, needle, and central numeric readout. Put an eight-segment gear indicator below it. Illuminate segments progressively up to the selected gear and highlight the current gear. Show neutral correctly. Replace the literal `GEAR` caption beside the gear number with a small thin-line gearshift icon showing a manual transmission H pattern from Tabler Icons, https://tabler.io/icons/icon/manual-gearbox. Use a 14 px SVG, about 1.5 px stroke, muted pale gray, and an accessible Gearshift label. Preserve the numeric readout and segments. Bundle Tabler Icons' MIT license.

Place two smaller pedal gauges directly to the **right of the speedometer**, stacked vertically with **Throttle above Brake**. Each has segmented arcs, ticks, needle, percentage, and its label. The segments progress from white at 0% to saturated green `#22e875` at 100%. Use bright green, not muted green, and do not use the earlier red pedal gradient. Show zero correctly and clear missing data.

Make the `SPEED`, `THROTTLE`, and `BRAKE` labels pure white `#fff`, slightly larger, and medium weight `500`. Use a 7 px HTML speed label and 8 px pedal labels in the SVG viewBox coordinates. Bundle the actual IBM Plex Mono Medium font so the labels render at the correct weight with font synthesis disabled. Keep numeric values, ticks, units, and other captions in their existing styles.

Animate speed, throttle, and brake on every frame. Needles sweep, numbers count toward the recorded value, and segment illumination fades progressively. Use exponential response times around 0.11 seconds for speed and 0.075 seconds for pedals. Retarget from the currently displayed value, with no jumps or overshoot. Continue settling while the replay is paused. Missing samples clear immediately. Reduced motion shows the target directly. Give gear segment colors a short fade around 0.12 seconds. Smooth the presentation without changing the archive or chart samples.

Make DRS a small **bordered indicator** beside the gear readout, styled like a compact button but implemented as a status indicator. Keep only the text `DRS`, with no circle or status dot. When the recorded rear wing is open, light the text and border green with a restrained glow. When it is closed, mute them and remove the glow. Missing data uses a dim dashed border. Add a tooltip and accessible label describing on, off, or unavailable. The 2026 source provides no DRS samples, so keep that status unavailable rather than implying a closed rear wing or inventing overtaking data. Do not render `DRS OPEN`/`DRS OFF` as unstyled text or let the indicator imply a clickable toggle.

## Align the speed chart and gear markers

Plot recorded speed against elapsed time through the selected lap. Use the same time axis and linear interpolation for the line and its moving cursor. The cursor dot must sit on the plotted line, including between archived samples. Do not interpolate across missing gaps, lap boundaries, or the finish.

Give the moving amber dot a soft glow and a gentle throbbing halo during playback. Keep a steady glow while paused or when reduced motion is enabled. Keep its center aligned while the halo changes size.

Add subtle numbered boxes at observed gear-change samples. The box contains the new gear. Hover, keyboard focus, or tap opens a tooltip with the previous and new gear, elapsed lap time, and recorded speed. Use the archive's observed samples without inventing intermediate shifts between 1 Hz records. Avoid overlapping boxes, use subtle connector lines when needed, and clamp tooltips inside the plot. Keep all markers aligned after resizing and clip their layer to the chart bounds during layout changes.

## Add verified post-race news

Replace Race Control in the right column with a Paddock News panel. Use official Formula 1 post-race articles for the 11 October 2026 event, including the race report, team reactions, highlights, and driver interviews. Display linked headlines, source, and publication times in Singapore time. Preserve article URLs and timestamps. Use the same translucent panel, thin borders, small technical captions, and scrollable layout as the rest of the dashboard. The Data & Sources and kartel.sh footer remains directly below it.

Bundle a verified news snapshot during development with `scripts/import-news.py` and import it into the client bundle. Display it as post-race headlines, without a Live claim. Do not add runtime polling, a news API, fabricated social chatter, a chat backend, or embedded third-party widgets. Link each item to the original article. Include the snapshot retrieval time and source in the metadata.

## Show a real loading state

Show a full-screen loading screen before the dashboard is usable. Match the site with its white F1 logo, app name, Marina Bay and 11 October 2026 caption, dark grid, and compact status text. Use a thin glowing progress bar with a red fill, replacing the car silhouette loader. The red gradient runs from deep red through Formula 1 red `#e10600` to scarlet. Use real initialization progress for the width, preserve accessible progress values, stop transitions on failure, and respect reduced motion. Keep the dashboard hidden and inert during initialization.

Advance through actual initialization stages: loading historical data, preparing timing and telemetry, reconstructing Marina Bay, preparing cars and the holographic city, then focusing/rendering the circuit. Wait for fonts and the first usable render before fading the screen away. Do not use an arbitrary timer to pretend assets are ready. Respect reduced motion.

If the historical archive fails, stop the progress animation, show a readable error, and provide a focused Retry Loading button. If WebGL alone fails, allow the historical timing and telemetry to become usable and show an error within the circuit area. A failed portrait uses initials and does not block startup. Add a JavaScript-disabled message.

## Finish and verify the application

Provide a source notes dialog with historical data links, official classification, official 2026 schedule, circuit mapping/license, OpenStreetMap attribution and ODbL links, the bundled road extract, font/license, TheoDev car attribution and CC BY license, Gauge UI/license, Tabler gearshift icon/license, portrait source records, and the distinction between recorded telemetry and estimated car positions. Explain the per-lap distance correction and estimated street-edge widths. Identify buildings and track details as schematic. Include a brief independent fan-prototype notice.

Use semantic controls, visible keyboard focus, pressed states for view/rate/driver selection, accessible gauge values, a labeled seek slider, focusable gear tooltips, and a modal dialog with Escape/close support. Respect reduced motion across the scan, orbit, camera transitions, gauges, glow, and loader. Keep clocks and rapid telemetry updates from flooding screen-reader announcements.

Use one animation loop, reuse geometry/materials, cap device pixel ratio, and handle resizing. Pause replay advancement while the document is hidden. Dispose of scene resources and observers when appropriate. Keep the page free of console errors and broken asset requests.

Verify the actual browser behavior at desktop, tablet, and 320/390 px mobile widths. Check all 22 driver selections, portraits from R2, names, teams, positions, leader/numeric/lapped gaps, camera modes, mid-flight retargeting, pause/seek/restart, all four replay rates including real-time advancement at 1×, DRS on/off/unavailable, gauge easing, chart alignment, gear tooltips, countdown removal, verified news links, DNF handling, loader success/error/retry, and the timeline's placement inside the map. Confirm that portrait PNGs are absent from the Vercel build. Run focused tests for historical replay, camera flights, chart interpolation/gear events, and frame-rate-independent gauge easing, then run the production build.

Verify a full historical lap at 1× against the integrated speed profile. Check that the rendered car's speed follows the telemetry within the documented per-lap correction, and that the motion is continuous across sample and lap boundaries. Traverse the real circuit at a fixed speed to detect artificial pauses at corners independently of telemetry. Check the anti-clockwise racing direction, genuine recorded stops, missing-data fallback, and identical positions after seeking or advancing by different replay rates. Inspect the surrounding roads in Orbit and Top Down; they must follow the imported geometry, remain unfilled, and stay clear of the track and procedural buildings.

Document local setup, data and news import, portrait download/upload, environment configuration, and deployment. Publish the source to a public GitHub repository. Exclude credentials, environment files, cloud-provider state, cached downloads, node_modules, dist, and portrait binaries from Git. Include a safe .env.example and retain third-party attribution. Deploy the tested static application to the connected Vercel account and return its live URL. If an external account connection is missing, finish all independent work and identify the exact remaining connection step. Deliver the implementation rather than a mock screenshot or an outline.
