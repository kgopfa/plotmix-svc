import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import { spawn } from 'node:child_process';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import { prisma } from '../clients/database.client';

export const renderRoutes: ExpressRouter = Router();

// POST /api/render
// Body: { projectId: string, fps?: number, width?: number, height?: number }
renderRoutes.post('/', async (req, res) => {
  const { projectId, fps = 30, width = 1280, height = 720 } = req.body || {};
  if (!projectId) return res.status(400).json({ error: 'projectId required' });

  try {
    // Mint short-lived render token for UI middleware
    const token = jwt.sign(
      { projectId },
      process.env['RENDER_TOKEN_SECRET'] as string,
      { expiresIn: '2m', issuer: 'plotmix-svc', audience: 'plotmix-ui' }
    );

    // Lazy import puppeteer to avoid startup cost
    const puppeteer = (await import('puppeteer')).default;

    const browser = await puppeteer.launch({
      headless: true,
      dumpio: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    // Bubble up logs and network issues from the page for better diagnostics
    page.on('console', (msg) => {
      try {
        console.log('[render-ui][console]', msg.type(), msg.text());
      } catch {}
    });
    page.on('pageerror', (err) => {
      console.error('[render-ui][pageerror]', err);
    });
    page.on('requestfailed', (request) => {
      console.error('[render-ui][requestfailed]', request.url(), request.failure()?.errorText);
    });
    page.on('response', (response) => {
      if (!response.ok()) {
        console.error('[render-ui][response]', response.status(), response.url());
      }
    });
    await page.setExtraHTTPHeaders({ 'x-render-auth': token });
    await page.setViewport({ width, height, deviceScaleFactor: 1 });

    const uiBase = process.env['UI_BASE_URL'] || 'http://localhost:3000';
    const url = `${uiBase}/render/${projectId}?fps=${fps}&width=${width}&height=${height}&token=${encodeURIComponent(token)}`;
    console.log('[render] Navigating to', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });

    console.log('[render] Waiting for __renderReady__');
    await page.waitForFunction('globalThis.__renderReady__ === true || !!globalThis.__renderError__', { timeout: 60000 });
    const initError = await page.evaluate(() => (globalThis as any).__renderError__);
    if (initError) throw new Error(`Render page error: ${initError}`);
    const info = await page.evaluate(() => (globalThis as any).__renderInfo__);
    const totalFrames = Math.floor((info?.duration || 5) * (info?.fps || fps));
    console.log('[render] Ready. Info:', info, 'totalFrames:', totalFrames);

    const outPath = path.join(process.env['RENDER_OUTPUT_DIR'] || '/tmp', `${projectId}-${Date.now()}.mp4`);

    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-f', 'image2pipe',
      '-r', String(fps),
      '-i', 'pipe:0',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-preset', 'veryfast',
      outPath,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });

    // If page exposes a crop rectangle, use it to clip screenshots to the design canvas
    let cropRect = await page.evaluate(() => {
      const g: any = globalThis as any;
      const fn = g.__computeCropRect__ || g.__getDesignClip__;
      try {
        return typeof fn === 'function' ? fn() : null;
      } catch {
        return null;
      }
    });
    // Retry a few times to allow layout/zoom to settle
    if (!cropRect || !cropRect.width || !cropRect.height) {
      for (let tries = 0; tries < 5; tries++) {
        await new Promise(resolve => setTimeout(resolve, 50));
        cropRect = await page.evaluate(() => {
          const g: any = globalThis as any;
          const fn = g.__computeCropRect__ || g.__getDesignClip__;
          try { return typeof fn === 'function' ? fn() : null; } catch { return null; }
        });
        if (cropRect && cropRect.width > 0 && cropRect.height > 0) break;
      }
    }

    for (let i = 0; i < totalFrames; i++) {
      const t = i / fps;
      await page.evaluate((t) => {
        const g: any = globalThis as any;
        const fn = g.__seekAndRender__ || g.__seekAndRender;
        if (typeof fn !== 'function') {
          throw new TypeError('globalThis.__seekAndRender__ (or __seekAndRender) is not a function');
        }
        fn(t);
      }, t);
      // Recompute crop occasionally in case viewport changes, but avoid per-frame thrash
      if (i === 0 || i % 30 === 0) {
        try {
          const cr = await page.evaluate(() => {
            const g: any = globalThis as any;
            const fn = g.__computeCropRect__ || g.__getDesignClip__;
            return typeof fn === 'function' ? fn() : null;
          });
          if (cr && cr.width > 0 && cr.height > 0) cropRect = cr;
        } catch {}
      }
      const buf = await page.screenshot({ type: 'png', omitBackground: false, clip: cropRect || undefined });
      ffmpeg.stdin.write(buf as unknown as Buffer);
    }

    ffmpeg.stdin.end();
    await new Promise<void>((resolve, reject) => {
      ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))));
      ffmpeg.on('error', reject);
    });

    await browser.close();

    // TODO: upload outPath to object storage and return URL
    const publicBase = process.env['RENDER_PUBLIC_BASE'] || 'http://localhost:8000';
    const urlPath = `/media/${path.basename(outPath)}`; // replace with uploaded key path
    const finalUrl = `${publicBase}${urlPath}`;
    console.log('[render] Completed. URL:', finalUrl);
    return res.json({ url: finalUrl });
  } catch (err) {
    console.error('Render failed', err);
    return res.status(500).json({ error: 'Render failed' });
  }
});

// POST /api/renderx
// Same as /api/render but targets the UI page /renderx/[projectId]
// (now protected by the same middleware) and uses faster ffmpeg settings for quickest output
renderRoutes.post('/x', async (req, res) => {
  const { projectId, fps = 30, width = 1280, height = 720 } = req.body || {};
  if (!projectId) return res.status(400).json({ error: 'projectId required' });

  try {
    // Mint short-lived render token for UI data fetch (page itself is unprotected)
    const token = jwt.sign(
      { projectId },
      process.env['RENDER_TOKEN_SECRET'] as string,
      { expiresIn: '2m', issuer: 'plotmix-svc', audience: 'plotmix-ui' }
    );

    const puppeteer = (await import('puppeteer')).default;
    const browser = await puppeteer.launch({
      headless: true,
      dumpio: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    page.on('console', (msg) => {
      try { console.log('[renderx-ui][console]', msg.type(), msg.text()); } catch {}
    });
    page.on('pageerror', (err) => console.error('[renderx-ui][pageerror]', err));
    page.on('requestfailed', (request) => console.error('[renderx-ui][requestfailed]', request.url(), request.failure()?.errorText));
    page.on('response', (response) => { if (!response.ok()) console.error('[renderx-ui][response]', response.status(), response.url()); });
    await page.setExtraHTTPHeaders({ 'x-render-auth': token });
    await page.setViewport({ width, height, deviceScaleFactor: 1 });

    const uiBase = process.env['UI_BASE_URL'] || 'http://localhost:3000';
    const url = `${uiBase}/renderx/${projectId}?fps=${fps}&width=${width}&height=${height}&token=${encodeURIComponent(token)}`;
    console.log('[renderx] Navigating to', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });

    console.log('[renderx] Waiting for __renderReady__');
    await page.waitForFunction('globalThis.__renderReady__ === true || !!globalThis.__renderError__', { timeout: 60000 });
    const initError = await page.evaluate(() => (globalThis as any).__renderError__);
    if (initError) throw new Error(`RenderX page error: ${initError}`);
    const info = await page.evaluate(() => (globalThis as any).__renderInfo__);
    const totalFrames = Math.floor((info?.duration || 5) * (info?.fps || fps));
    console.log('[renderx] Ready. Info:', info, 'totalFrames:', totalFrames);

    const outPath = path.join(process.env['RENDER_OUTPUT_DIR'] || '/tmp', `${projectId}-${Date.now()}-fast.mp4`);
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-f', 'image2pipe',
      '-r', String(fps),
      '-i', 'pipe:0',
      // Fastest reasonable H.264 for MP4 delivery
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-crf', '23',
      outPath,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });

    for (let i = 0; i < totalFrames; i++) {
      const t = i / fps;
      await page.evaluate((t) => {
        const g: any = globalThis as any;
        const fn = g.__seekAndRender__ || g.__seekAndRender;
        if (typeof fn !== 'function') {
          throw new TypeError('globalThis.__seekAndRender__ (or __seekAndRender) is not a function');
        }
        fn(t);
      }, t);
      const buf = await page.screenshot({ type: 'png', omitBackground: false });
      ffmpeg.stdin.write(buf as unknown as Buffer);
    }

    ffmpeg.stdin.end();
    await new Promise<void>((resolve, reject) => {
      ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))));
      ffmpeg.on('error', reject);
    });

    await browser.close();

    const publicBase = process.env['RENDER_PUBLIC_BASE'] || 'http://localhost:8000';
    const urlPath = `/media/${path.basename(outPath)}`;
    const finalUrl = `${publicBase}${urlPath}`;
    console.log('[renderx] Completed. URL:', finalUrl);
    return res.json({ url: finalUrl });
  } catch (err) {
    console.error('RenderX failed', err);
    return res.status(500).json({ error: 'RenderX failed' });
  }
});

// GET /api/render/project-data/:projectId
// Token-protected endpoint to fetch minimal project data for the render page
renderRoutes.get('/project-data/:projectId', async (req: Request, res: Response) => {
  try {
    const token = req.headers['x-render-auth'];
    const secret = process.env['RENDER_TOKEN_SECRET'];

    // Fail closed if token/secret missing
    if (!token || !secret) {
      return res.status(404).end();
    }

    // Verify token and ensure projectId matches path
    const payload = jwt.verify(String(token), secret) as { projectId?: string };
    const projectIdFromToken = payload?.projectId;
    const projectIdFromPath = req.params['projectId'];
    if (!projectIdFromToken || projectIdFromToken !== projectIdFromPath) {
      return res.status(404).end();
    }

    // Fetch minimal project payload needed for rendering
    const project = await prisma.project.findUnique({
      where: { id: projectIdFromPath },
      select: {
        id: true,
        name: true,
        title: true,
        version: true,
        mainState: true,
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.json({ project });
  } catch {
    // Hide validation details to avoid information leaks
    return res.status(404).end();
  }
});

// GET /api/render/debug-session?projectId=...&fps=30&width=1280&height=720
// Creates a short-lived cookie for browser debugging and redirects to the UI render page
renderRoutes.get('/debug-session', async (req: Request, res: Response) => {
  const { projectId, fps = '30', width = '1280', height = '720' } = req.query as Record<string, string>;

  if (!projectId) return res.status(400).json({ error: 'projectId required' });

  try {
    const token = jwt.sign(
      { projectId },
      process.env['RENDER_TOKEN_SECRET'] as string,
      { expiresIn: '2m', issuer: 'plotmix-svc', audience: 'plotmix-ui' }
    );

    // Set cookie scoped to the render path for this projectId
    res.cookie('x-render-auth', token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      maxAge: 120 * 1000, // 2 min
      path: `/render/${projectId}`,
      domain: undefined, // default to current host; cross-origin allowed by browser when navigating
    });

    const uiBase = process.env['UI_BASE_URL'] || 'http://localhost:3000';
    const redirectUrl = `${uiBase}/render/${projectId}?fps=${encodeURIComponent(fps)}&width=${encodeURIComponent(width)}&height=${encodeURIComponent(height)}`;
    return res.redirect(302, redirectUrl);
  } catch (err) {
    console.error('Debug session init failed', err);
    return res.status(500).json({ error: 'Failed to start debug session' });
  }
});

// GET /api/render/x/debug-session?projectId=...&fps=30&width=1280&height=720
// Same as the render debug session but targets the /renderx page
renderRoutes.get('/x/debug-session', async (req: Request, res: Response) => {
  const { projectId, fps = '30', width = '1280', height = '720' } = req.query as Record<string, string>;

  if (!projectId) return res.status(400).json({ error: 'projectId required' });

  try {
    const token = jwt.sign(
      { projectId },
      process.env['RENDER_TOKEN_SECRET'] as string,
      { expiresIn: '2m', issuer: 'plotmix-svc', audience: 'plotmix-ui' }
    );

    // Set cookie scoped to the renderx path for this projectId
    res.cookie('x-render-auth', token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      maxAge: 120 * 1000, // 2 min
      path: `/renderx/${projectId}`,
      domain: undefined,
    });

    const uiBase = process.env['UI_BASE_URL'] || 'http://localhost:3000';
    const redirectUrl = `${uiBase}/renderx/${projectId}?fps=${encodeURIComponent(fps)}&width=${encodeURIComponent(width)}&height=${encodeURIComponent(height)}`;
    return res.redirect(302, redirectUrl);
  } catch (err) {
    console.error('RenderX debug session init failed', err);
    return res.status(500).json({ error: 'Failed to start renderX debug session' });
  }
});


