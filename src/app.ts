import express, { Application } from 'express';
import { config } from './config';
import { securityMiddleware } from './middleware/security';
import { errorHandler, notFoundHandler } from './middleware/error';
import authRoutes from './routes/auth.routes';
import healthRoutes from './routes/health.routes';
import { projectRoutes } from './routes/project.routes';
import { collaborationRoutes } from './routes/collaboration.routes';
import { conversationRoutes } from './routes/conversation.routes';
import { renderRoutes } from './routes/render.routes';

const app: Application = express();

// Apply security middleware
app.use(securityMiddleware);

// Static hosting for rendered media (MVP). In production, use S3/CDN instead.
app.use('/media', express.static(process.env['RENDER_OUTPUT_DIR'] || '/tmp'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/collaboration', collaborationRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/render', renderRoutes);
app.use('/api', healthRoutes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'PlotMix API Server',
    version: '1.0.0',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app; 