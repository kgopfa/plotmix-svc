import { Queue, Worker, JobsOptions } from 'bullmq';
import { getRedis } from '../clients/redis.client';
import { logger } from '../utils/logger';
import { RenderController } from '../controllers/render.controller';
import type { Request, Response } from 'express';

export type RenderJobData = {
  projectId: string;
  fps: number;
  width: number;
  height: number;
  key?: string;
};

const connection = getRedis();
export const RENDER_QUEUE_NAME = 'render-video';

export const renderQueue = new Queue<RenderJobData>(RENDER_QUEUE_NAME, { connection });
// Note: BullMQ v5 runs without a separate scheduler by default

// Worker that reuses the controller logic by adapting a minimal req/res shim
export const renderWorker = new Worker<RenderJobData>(
  RENDER_QUEUE_NAME,
  async (job) => {
    const data = job.data;
    logger.info('Render worker started', { jobId: job.id, data });

    // Shim Express req/res for the controller
    const req = {
      body: {
        projectId: data.projectId,
        fps: data.fps,
        width: data.width,
        height: data.height,
        key: data.key,
      },
    } as unknown as Request;

    let url: string | undefined;
    const res = {
      status: (_code: number) => res,
      json: (obj: any) => { url = obj?.url as string | undefined; return undefined as any; },
    } as unknown as Response;

    await RenderController.renderX(req, res);
    logger.info('Render worker completed', { jobId: job.id, url });
    return { url };
  },
  { connection, concurrency: 2 }
);

renderWorker.on('failed', (job, err) => {
  logger.error('Render job failed', { jobId: job?.id, err });
});

export async function enqueueRenderJob(data: RenderJobData, opts?: JobsOptions) {
  return renderQueue.add(RENDER_QUEUE_NAME, data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false,
    ...opts,
  });
}


