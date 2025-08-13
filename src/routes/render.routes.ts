import { Router, type Router as ExpressRouter } from 'express';
import { RenderController } from '../controllers/render.controller';

export const renderRoutes: ExpressRouter = Router();
renderRoutes.post('/x', RenderController.renderX);

// GET /api/render/project-data/:projectId
// Token-protected endpoint to fetch minimal project data for the render page
renderRoutes.get('/project-data/:projectId', RenderController.getProjectData);

// GET /api/render/debug-session?projectId=...&fps=30&width=1920&height=1080
// Creates a short-lived cookie for browser debugging and redirects to the UI render page
renderRoutes.get('/debug-session', RenderController.startRenderDebugSession);

// GET /api/render/x/debug-session?projectId=...&fps=30&width=1920&height=1080
// Same as the render debug session but targets the /renderx page
renderRoutes.get('/x/debug-session', RenderController.startRenderXDebugSession);


