import { Router, RequestHandler } from 'express';
import { HealthController } from '../controllers/health.controller';
import { authenticateToken } from '../middleware/auth';

const router: Router = Router();

router.get('/health', HealthController.healthCheck);
router.get('/success', authenticateToken as RequestHandler, HealthController.successMessage);

export default router; 