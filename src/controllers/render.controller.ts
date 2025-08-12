import type { Request, Response } from 'express';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import jwt from 'jsonwebtoken';
import { prisma } from '../clients/database.client';
import { createR2Client } from '../clients/r2.client';
import { buildRenderObjectKey, uploadFileToR2 } from '../services/render-storage.service';
import { logger } from '../utils/logger';

export class RenderController {
  static async renderX(req: Request, res: Response): Promise<void> {
    const { projectId, fps = 30, width = 1280, height = 720 } = req.body || {};
    if (!projectId) {
      res.status(400).json({ error: 'projectId required' });
      return;
    }

    try {
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
        try {
          const text = msg.text();
          if (text.includes('[renderx] seek')) return;
          // eslint-disable-next-line no-console
          console.log('[renderx-ui][console]', msg.type(), text);
        } catch {}
      });
      page.on('pageerror', (err) => logger.error('[renderx-ui][pageerror]', err));
      page.on('requestfailed', (request) => logger.error('[renderx-ui][requestfailed]', request.url(), request.failure()?.errorText));
      page.on('response', (response) => { if (!response.ok()) logger.error('[renderx-ui][response]', response.status(), response.url()); });
      await page.setExtraHTTPHeaders({ 'x-render-auth': token });
      await page.setViewport({ width, height, deviceScaleFactor: 1 });

      const uiBase = process.env['UI_BASE_URL'] || 'http://localhost:3000';
      const url = `${uiBase}/renderx/${projectId}?fps=${fps}&width=${width}&height=${height}&token=${encodeURIComponent(token)}`;
      logger.info('[renderx] Navigating to', url);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });

      logger.info('[renderx] Waiting for __renderReady__');
      await page.waitForFunction('globalThis.__renderReady__ === true || !!globalThis.__renderError__', { timeout: 60000 });
      const initError = await page.evaluate(() => (globalThis as any).__renderError__);
      if (initError) throw new Error(`RenderX page error: ${initError}`);
      const info = await page.evaluate(() => (globalThis as any).__renderInfo__);
      const totalFrames = Math.floor((info?.duration || 5) * (info?.fps || fps));
      logger.info('[renderx] Ready. Info:', info, 'totalFrames:', totalFrames);

      const outPath = path.join(process.env['RENDER_OUTPUT_DIR'] || '/tmp', `${projectId}-${Date.now()}-fast.mp4`);
      const selectedEncoder = (process.env['RENDER_ENCODER'] || 'libx264').toLowerCase();
      const gop = String((Number(fps) || 30) * 2);
      const inputArgs = ['-y', '-f', 'image2pipe', '-r', String(fps), '-vcodec', 'mjpeg', '-i', 'pipe:0'];
      let outputArgs: string[];
      if (selectedEncoder === 'h264_nvenc') {
        outputArgs = ['-c:v', 'h264_nvenc', '-preset', 'p1', '-tune', 'll', '-rc', 'constqp', '-qp', '23', '-g', gop, '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
      } else if (selectedEncoder === 'h264_vaapi') {
        const vaapiDevice = process.env['RENDER_VAAPI_DEVICE'] || '/dev/dri/renderD128';
        outputArgs = ['-vaapi_device', vaapiDevice, '-vf', 'format=nv12,hwupload', '-c:v', 'h264_vaapi', '-b:v', '8000k', '-maxrate', '8000k', '-bufsize', '16000k', '-g', gop, '-movflags', '+faststart'];
      } else if (selectedEncoder === 'h264_qsv') {
        outputArgs = ['-c:v', 'h264_qsv', '-global_quality', '23', '-look_ahead', '0', '-g', gop, '-movflags', '+faststart'];
      } else {
        outputArgs = ['-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', '-crf', '23', '-g', gop, '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
      }
      const ffmpeg = spawn('ffmpeg', [...inputArgs, ...outputArgs, outPath], { stdio: ['pipe', 'inherit', 'inherit'] });

      for (let i = 0; i < totalFrames; i++) {
        const t = i / fps;
        await page.evaluate((t) => {
          const g: any = globalThis as any;
          const fn = g.__seekAndRender__ || g.__seekAndRender;
          if (typeof fn !== 'function') throw new TypeError('globalThis.__seekAndRender__ (or __seekAndRender) is not a function');
          fn(t);
        }, t);
        const buf = await page.screenshot({ type: 'jpeg', quality: 80, omitBackground: false });
        ffmpeg.stdin.write(buf as unknown as Buffer);
      }

      ffmpeg.stdin.end();
      await new Promise<void>((resolve, reject) => {
        ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))));
        ffmpeg.on('error', reject);
      });

      await browser.close();

      let finalUrl: string;
      const useR2 = !!(process.env['R2_BUCKET'] && (process.env['R2_ENDPOINT'] || process.env['R2_ACCOUNT_ID']))
        && !!process.env['R2_ACCESS_KEY_ID'] && !!process.env['R2_SECRET_ACCESS_KEY'];
      if (useR2) {
        try {
          const client = createR2Client();
          const bucket = process.env['R2_BUCKET'] as string;
          const key = buildRenderObjectKey(projectId);
          const cfg: { bucket: string; publicBase?: string; prefix?: string } = { bucket };
          if (process.env['R2_PUBLIC_BASE']) cfg.publicBase = process.env['R2_PUBLIC_BASE'] as string;
          if (process.env['R2_PREFIX']) cfg.prefix = process.env['R2_PREFIX'] as string;
          finalUrl = await uploadFileToR2(client, outPath, key, cfg);
          try { fs.unlinkSync(outPath); } catch {}
        } catch (e) {
          logger.error('[renderx] R2 upload failed, falling back to local URL', e);
          const publicBase = process.env['RENDER_PUBLIC_BASE'] || 'http://localhost:8000';
          const urlPath = `/media/${path.basename(outPath)}`;
          finalUrl = `${publicBase}${urlPath}`;
        }
      } else {
        const publicBase = process.env['RENDER_PUBLIC_BASE'] || 'http://localhost:8000';
        const urlPath = `/media/${path.basename(outPath)}`;
        finalUrl = `${publicBase}${urlPath}`;
      }
      logger.info('[renderx] Completed. URL:', finalUrl);
      res.json({ url: finalUrl });
    } catch (err) {
      logger.error('RenderX failed', err);
      res.status(500).json({ error: 'RenderX failed' });
    }
  }

  static async getProjectData(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers['x-render-auth'];
      const secret = process.env['RENDER_TOKEN_SECRET'];
      if (!token || !secret) {
        res.status(404).end();
        return;
      }
      const payload = jwt.verify(String(token), secret) as { projectId?: string };
      const projectIdFromToken = payload?.projectId;
      const projectIdFromPath = req.params['projectId'];
      if (!projectIdFromToken || projectIdFromToken !== projectIdFromPath) {
        res.status(404).end();
        return;
      }
      const project = await prisma.project.findUnique({
        where: { id: projectIdFromPath },
        select: { id: true, name: true, title: true, version: true, mainState: true },
      });
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      res.json({ project });
    } catch {
      res.status(404).end();
    }
  }

  static async startRenderDebugSession(req: Request, res: Response): Promise<void> {
    const { projectId, fps = '30', width = '1280', height = '720' } = req.query as Record<string, string>;
    if (!projectId) {
      res.status(400).json({ error: 'projectId required' });
      return;
    }
    try {
      const token = jwt.sign(
        { projectId },
        process.env['RENDER_TOKEN_SECRET'] as string,
        { expiresIn: '2m', issuer: 'plotmix-svc', audience: 'plotmix-ui' }
      );
      res.cookie('x-render-auth', token, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'lax',
        maxAge: 120 * 1000,
        path: `/render/${projectId}`,
        domain: undefined,
      });
      const uiBase = process.env['UI_BASE_URL'] || 'http://localhost:3000';
      const redirectUrl = `${uiBase}/render/${projectId}?fps=${encodeURIComponent(fps)}&width=${encodeURIComponent(width)}&height=${encodeURIComponent(height)}`;
      res.redirect(302, redirectUrl);
    } catch (err) {
      logger.error('Debug session init failed', err);
      res.status(500).json({ error: 'Failed to start debug session' });
    }
  }

  static async startRenderXDebugSession(req: Request, res: Response): Promise<void> {
    const { projectId, fps = '30', width = '1280', height = '720' } = req.query as Record<string, string>;
    if (!projectId) {
      res.status(400).json({ error: 'projectId required' });
      return;
    }
    try {
      const token = jwt.sign(
        { projectId },
        process.env['RENDER_TOKEN_SECRET'] as string,
        { expiresIn: '2m', issuer: 'plotmix-svc', audience: 'plotmix-ui' }
      );
      res.cookie('x-render-auth', token, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'lax',
        maxAge: 120 * 1000,
        path: `/renderx/${projectId}`,
        domain: undefined,
      });
      const uiBase = process.env['UI_BASE_URL'] || 'http://localhost:3000';
      const redirectUrl = `${uiBase}/renderx/${projectId}?fps=${encodeURIComponent(fps)}&width=${encodeURIComponent(width)}&height=${encodeURIComponent(height)}`;
      res.redirect(302, redirectUrl);
    } catch (err) {
      logger.error('RenderX debug session init failed', err);
      res.status(500).json({ error: 'Failed to start renderX debug session' });
    }
  }
}


