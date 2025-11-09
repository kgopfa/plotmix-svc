import { Router } from 'express';
import { FeedbackController } from '../controllers/feedback.controller';

const router: Router = Router();

router.post('/', FeedbackController.submitFeedback);

export default router;

