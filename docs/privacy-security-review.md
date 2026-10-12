# Privacy and security review

Reviewed on 12 October 2026 for the public Singapore Grand Prix dashboard. The starting revision was `0f5e0f0`. This review covers the application and its published source; it does not inspect Cloudflare or Vercel account audit logs, billing configuration, or the security of their infrastructure.

## Result

No credentials or unintended personal data were found by the secret scans and manual checks described below. One low-severity disclosure was found: the Vite configuration contained a private development hostname. The current configuration now reads that value from an ignored local environment file. The hostname remains in earlier public Git commits; it is infrastructure metadata, not an authentication credential. Git history was not rewritten.

The project intentionally publishes public sporting information: driver names, photographs, birth dates, biographies, and race records. Public project handles and third-party asset credits also remain visible. These are personal or identifying information, so this project should not be described as containing no PII whatsoever.

## Evidence and scope

| Check | Result |
| --- | --- |
| Gitleaks 8.30.1, all reachable Git history, fully redacted output | No detected secrets |
| Gitleaks, working directory and production build | No detected secrets |
| Tracked files and filenames across Git history | No real environment files, private keys, authentication stores, or cloud-provider state committed |
| Git author and committer identities | GitHub noreply addresses; no personal email addresses found |
| Tracked text, dataset schemas, source records, model metadata, and media metadata | No personal contact data, visitor records, private local paths, or credentials found; public driver data and asset attribution are intentional |
| PNG metadata | Dashboard image has no embedded metadata; car image contains resolution metadata only |
| Browser request code | Static app/data requests, R2 model and selected portraits, and Formula 1 team-logo images; no analytics, error-reporting SDK, runtime race/news polling, beacon, or data-submission endpoint found |
| Fresh production browser session | App initialized with all 22 drivers and no scene error; car downloaded once; resource origins were limited to Vercel, the configured R2 host, and `media.formula1.com`; no app cookies or local/session storage entries |
| Visitor state | No app cookies, browser storage, account forms, location collection, or visitor database found |
| DOM rendering | Downloaded text is assigned with `textContent`; `innerHTML` uses fixed application templates |
| External links | Source and news links use `rel="noreferrer"` |
| Production private-file probes | `/.env`, `/.env.local`, `/.git/config`, `/.vercel/project.json`, and `/wrangler.toml` return 404 |
| Production asset exclusions | The car GLB is served from R2; `/models/formula-car.glb` returns 404 on Vercel; portrait binaries are excluded from the deployment |
| `npm audit` and `npm audit --omit=dev` | Zero reported vulnerabilities, including development dependencies |
| `npm test` and `npm run build` | 43 tests pass; production build passes |

Raw scan reports are kept outside the repository. The scanner binary was downloaded from the official Gitleaks release and checked against its published SHA-256 checksum.

## Changes made

- Removed the private hostname from tracked Vite configuration. `DASHBOARD_PREVIEW_HOST` in the ignored `.env.local` enables the existing local development and preview hosts. The variable is excluded from Vite's browser environment and host checks remain restricted.
- Added explicit `.env*`, `.git/`, and `.vercel/` exclusions to `.vercelignore`, alongside the existing Cloudflare state and heavy-asset exclusions.
- Added `Referrer-Policy: no-referrer` so asset and navigation requests do not send the dashboard URL as a referrer.
- Added `X-Content-Type-Options: nosniff` and disabled camera, microphone, and geolocation through `Permissions-Policy`.
- Added the privacy checks and hosting requirements to the comprehensive reproduction prompt.

Production response headers and exclusions are checked again after deployment. The app has no authentication or user submission flow, and these changes do not introduce one.

## Remaining limits

Vercel, Cloudflare R2, and Formula 1's media CDN receive ordinary request metadata such as IP addresses and user agents when a browser downloads their assets. Their infrastructure may log that metadata. The application does not add visitor analytics or send a visitor profile, but this review cannot establish a zero-logging policy for those providers.

The earlier development hostname is still discoverable in public Git history. Removing it from the current code prevents new copies in configuration, but does not erase existing commits or copies already downloaded.

Public R2 URLs, bucket names, hashes, source URLs, driver information, and license credits are intentionally public. There are no signed asset URLs or embedded cloud credentials in the reviewed bundle. Public image and car URLs grant access to those intended assets, not administrative access to the account.

A clean secret scan and dependency audit establish what those checks detected at this revision. They do not prove the absence of every possible security issue, future dependency vulnerability, account compromise, or leak in an external service. No credentials were found that require rotation as a result of this review.
