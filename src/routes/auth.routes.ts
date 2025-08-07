import { Router, RequestHandler } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRegister, validateLogin } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router: Router = Router();

router.post('/register', validateRegister, AuthController.register);
router.post('/login', validateLogin, AuthController.login);
router.get('/profile', authenticateToken as RequestHandler, AuthController.getProfile);
router.post('/logout', authenticateToken as RequestHandler, AuthController.logout);
router.get('/validate-session', authenticateToken as RequestHandler, AuthController.validateSession);

export default router; 