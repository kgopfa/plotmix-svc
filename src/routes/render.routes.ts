import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import { spawn } from 'node:child_process';
import path from 'node:path';
import jwt from 'jsonwebtoken';

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
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'x-render-auth': token });
    await page.setViewport({ width, height, deviceScaleFactor: 1 });

    const uiBase = process.env['UI_BASE_URL'] || 'http://localhost:3000';
    const url = `${uiBase}/render/${projectId}?fps=${fps}&width=${width}&height=${height}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });

    await page.waitForFunction('globalThis.__renderReady__ === true', { timeout: 60000 });
    const info = await page.evaluate(() => (globalThis as any).__renderInfo__);
    const totalFrames = Math.floor((info?.duration || 5) * (info?.fps || fps));

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

    for (let i = 0; i < totalFrames; i++) {
      const t = i / fps;
      await page.evaluate((t) => (globalThis as any).__seekAndRender(t), t);
      const buf = await page.screenshot({ type: 'png', omitBackground: false });
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
    return res.json({ url: `${publicBase}${urlPath}` });
  } catch (err) {
    console.error('Render failed', err);
    return res.status(500).json({ error: 'Render failed' });
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


