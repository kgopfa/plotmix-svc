# Rendering Pipeline (Pixi + GSAP → MP4)

This document describes how the backend generates a video from the Pixi + GSAP canvas in the Next.js frontend and returns a URL to the user.

## Overview

- A dedicated, headless render page in the frontend (`/renderx/[projectId]`) renders the scene without editor chrome.
- The backend spins up a headless browser (Puppeteer), opens the render page, advances time deterministically, captures frames, and pipes them into ffmpeg to produce an MP4.
- The produced MP4 is uploaded (or served) and a URL is returned.

## Security

The render page is protected via a short‑lived JWT passed in an `X-Render-Auth` header. Frontend middleware validates:
- Token is signed with `RENDER_TOKEN_SECRET`
- `projectId` in token matches the path
- Token expiration (2 minutes by default)

Invalid or missing tokens return 404 to avoid endpoint discovery.

## Frontend (Next.js)

- Route: `src/app/renderx/[projectId]/page.tsx`
- Exposes the following globals for Puppeteer:
  - `window.__renderReady__`: boolean when scene is initialized
  - `window.__renderInfo__`: `{ width, height, fps, duration }`
  - `window.__seekAndRender(t: number)`: seeks GSAP timeline to time `t` (seconds) and forces a Pixi render

The page:
- Hydrates canvas and timeline stores with the project `mainState`
- Builds GSAP timeline
- Stops GSAP and Pixi tickers so rendering is on-demand and deterministic

Middleware gate (UI): `src/middleware.ts`

## Backend (Express)

### Endpoint

- `POST /api/render/x`
- Body: `{ projectId: string, fps?: number, width?: number, height?: number }`
- Response: `{ url: string }`

### Flow

1. Mint a short‑lived JWT using `RENDER_TOKEN_SECRET` with claim `{ projectId }`.
2. Launch Puppeteer and set `X-Render-Auth` header with the token.
3. Open the render page: `${UI_BASE_URL}/renderx/${projectId}?fps=...&width=...&height=...`.
4. Wait for `window.__renderReady__`.
5. Read `window.__renderInfo__` and compute total frames: `duration * fps`.
6. For each frame:
   - Call `window.__seekAndRender(t)` on the page
   - Capture a JPEG screenshot
   - Write to ffmpeg stdin
7. Close ffmpeg, upload the MP4, return URL.

### Configuration

Environment variables used by the render service:

- `RENDER_TOKEN_SECRET` (required): HMAC secret for render tokens. Must match the frontend.
- `UI_BASE_URL` (default `http://localhost:3000`): Frontend base URL.
- `RENDER_OUTPUT_DIR` (default `/tmp`): Local output directory (for MVP).
- `RENDER_PUBLIC_BASE` (default `http://localhost:8000`): Base URL to build response links (replace with CDN/S3 public base).

### Cloudflare R2 storage (optional)

If Cloudflare R2 is configured, the backend uploads the final MP4 to your R2 bucket and returns a public URL. If not configured, it falls back to a local file URL using `RENDER_PUBLIC_BASE`.

Required env variables (R2):

- `R2_ACCOUNT_ID` or `R2_ENDPOINT` (e.g., `https://<account>.r2.cloudflarestorage.com`)
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`

Optional:

- `R2_PREFIX` (default `renders/`): Key prefix inside the bucket
- `R2_PUBLIC_BASE`: Public base/CDN URL to build returned links; if omitted, the URL falls back to `<R2_ENDPOINT>/<bucket>/<key>`

Key pattern:

- Default: `renders/{projectId}/{projectId}-{timestamp}.mp4`
- You can customize the top-level folder via `R2_PREFIX`

Example `.env` snippet:

```bash
R2_ACCOUNT_ID=1234567890abcdef
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET=plotmix-renders
R2_PREFIX=renders/
# Use your CDN in front of R2 (recommended)
R2_PUBLIC_BASE=https://cdn.example.com
```

### Generate and set the render token secret

The same secret must be available to both the backend and the UI (middleware) so they can mint and validate the short‑lived render JWT.

1) Generate a strong random secret (choose one):

```bash
# OpenSSL (hex)
openssl rand -hex 48

# OpenSSL (base64)
openssl rand -base64 48 | tr -d '\n'

# Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

2) Set it in your environment:

- Backend (`plotmix-svc/.env`):

```
RENDER_TOKEN_SECRET=YOUR_LONG_RANDOM_VALUE
```

- UI (`plotmix-ui/.env.local`):

```
RENDER_TOKEN_SECRET=YOUR_LONG_RANDOM_VALUE
```

3) Restart both apps.

Notes:
- Use at least 32 bytes of entropy; 48–64 bytes is recommended.
- Do not reuse NextAuth or other app secrets; keep this dedicated to rendering.
- In production, set the variable in your hosting provider for both services (e.g., Vercel Project Env for UI, server/container env for API). If using multiple environments, generate a different secret per environment.

### Dependencies

- `puppeteer` (add to backend dependencies)
- `ffmpeg` installed on the host/runner

### Deployment & Scaling

- Run rendering as a background job using a queue (e.g., BullMQ). Store job status in DB.
- Limit resolution/duration to control resource usage.
- Consider a browser pool and workers to increase throughput.
- Prefer object storage (S3/GCS) over local filesystem and return signed or public URLs.

### Example Request

API_BASE refers to your backend origin (the API server). In local development, this is typically `http://localhost:8000`.

```bash
curl -X POST "$API_BASE/api/render/x" \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"proj_123","fps":30,"width":1280,"height":720}'
```

```json
{ "url": "https://cdn.example.com/renders/proj_123/1720548123.mp4" }
```

#### Local examples

- Start a render job (POST with JSON body):

```bash
curl -X POST 'http://localhost:8000/api/render/x' \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"YOUR_PROJECT_ID","fps":30,"width":1280,"height":720}'
```

- Open a browser debug session (GET with query params):

```bash
open "http://localhost:8000/api/render/x/debug-session?projectId=YOUR_PROJECT_ID&fps=30&width=1280&height=720"
```

Note: The RenderX debug session is at `/api/render/x/debug-session`. There is no route at `/api/render/x/:projectId`; POST to `/api/render/x` with a JSON body instead.

### Debugging in the browser (dev/staging)

- Start a short‑lived debug session that sets an HTTP‑only cookie and redirects you to the render page:

```bash
open "http://localhost:8000/api/render/x/debug-session?projectId=YOUR_PROJECT_ID&fps=30&width=1280&height=720"
```

- Ports are different by design: the backend sets the cookie for host `localhost`, which your browser will also send to `http://localhost:3000/renderx/...` after the redirect. The Next.js middleware accepts the cookie and allows access.

- In production with real domains, set `UI_BASE_URL` to your UI domain, and ensure both UI and API share the same eTLD+1 (e.g., `app.example.com` and `api.example.com`). If needed, adjust cookie `domain` to `.example.com`.

## Notes

- The render page is SSR-disabled (`ssr: false`) and uses the same store hydration flow as the editor.
- Timeline duration comes from the timeline store (`playback.totalDuration`). Ensure it’s populated with the correct value when building the GSAP timeline.
- Replace the local file handoff with an S3 upload step before returning the URL.


