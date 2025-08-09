# Rendering Pipeline (Pixi + GSAP → MP4)

This document describes how the backend generates a video from the Pixi + GSAP canvas in the Next.js frontend and returns a URL to the user.

## Overview

- A dedicated, headless render page in the frontend (`/render/[projectId]`) renders the scene without editor chrome.
- The backend spins up a headless browser (Puppeteer), opens the render page, advances time deterministically, captures frames, and pipes them into ffmpeg to produce an MP4.
- The produced MP4 is uploaded (or served) and a URL is returned.

## Security

The render page is protected via a short‑lived JWT passed in an `X-Render-Auth` header. Frontend middleware validates:
- Token is signed with `RENDER_TOKEN_SECRET`
- `projectId` in token matches the path
- Token expiration (2 minutes by default)

Invalid or missing tokens return 404 to avoid endpoint discovery.

## Frontend (Next.js)

- Route: `src/app/render/[projectId]/page.tsx`
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

- `POST /api/render`
- Body: `{ projectId: string, fps?: number, width?: number, height?: number }`
- Response: `{ url: string }`

### Flow

1. Mint a short‑lived JWT using `RENDER_TOKEN_SECRET` with claim `{ projectId }`.
2. Launch Puppeteer and set `X-Render-Auth` header with the token.
3. Open the render page: `${UI_BASE_URL}/render/${projectId}?fps=...&width=...&height=...`.
4. Wait for `window.__renderReady__`.
5. Read `window.__renderInfo__` and compute total frames: `duration * fps`.
6. For each frame:
   - Call `window.__seekAndRender(t)` on the page
   - Capture a PNG screenshot
   - Write to ffmpeg stdin
7. Close ffmpeg, upload the MP4, return URL.

### Configuration

Environment variables used by the render service:

- `RENDER_TOKEN_SECRET` (required): HMAC secret for render tokens. Must match the frontend.
- `UI_BASE_URL` (default `http://localhost:3000`): Frontend base URL.
- `RENDER_OUTPUT_DIR` (default `/tmp`): Local output directory (for MVP).
- `RENDER_PUBLIC_BASE` (default `http://localhost:8000`): Base URL to build response links (replace with CDN/S3 public base).

### Dependencies

- `puppeteer` (add to backend dependencies)
- `ffmpeg` installed on the host/runner

### Deployment & Scaling

- Run rendering as a background job using a queue (e.g., BullMQ). Store job status in DB.
- Limit resolution/duration to control resource usage.
- Consider a browser pool and workers to increase throughput.
- Prefer object storage (S3/GCS) over local filesystem and return signed or public URLs.

### Example Request

```bash
curl -X POST "$API_BASE/api/render" \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"proj_123","fps":30,"width":1280,"height":720}'
```

```json
{ "url": "https://cdn.example.com/renders/proj_123/1720548123.mp4" }
```

### Debugging in the browser (dev/staging)

- Start a short‑lived debug session that sets an HTTP‑only cookie and redirects you to the render page:

```bash
open "http://localhost:8000/api/render/debug-session?projectId=YOUR_PROJECT_ID&fps=30&width=1280&height=720"
```

- Ports are different by design: the backend sets the cookie for host `localhost`, which your browser will also send to `http://localhost:3000/render/...` after the redirect. The Next.js middleware accepts the cookie and allows access.

- In production with real domains, set `UI_BASE_URL` to your UI domain, and ensure both UI and API share the same eTLD+1 (e.g., `app.example.com` and `api.example.com`). If needed, adjust cookie `domain` to `.example.com`.

## Notes

- The render page is SSR-disabled (`ssr: false`) and uses the same store hydration flow as the editor.
- Timeline duration comes from the timeline store (`playback.totalDuration`). Ensure it’s populated with the correct value when building the GSAP timeline.
- Replace the local file handoff with an S3 upload step before returning the URL.


