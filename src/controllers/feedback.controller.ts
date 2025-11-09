import { Request, Response } from 'express';
import {
  FeedbackService,
  FeedbackCategory,
  FeedbackPayload,
} from '../services/feedback.service';
import { logger } from '../utils/logger';

const MAX_MESSAGE_LENGTH = 5000;
const allowedFeedbackTypes: FeedbackCategory[] = ['feedback', 'feature', 'bug'];

function normalizeFeedbackType(value: unknown): FeedbackCategory | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return allowedFeedbackTypes.includes(normalized as FeedbackCategory)
    ? (normalized as FeedbackCategory)
    : null;
}

function sanitizeOptionalString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length === 0) {
    return undefined;
  }

  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed);
}

export class FeedbackController {
  static async submitFeedback(req: Request, res: Response): Promise<void> {
    const errors: string[] = [];

    const messageRaw = (req.body as Record<string, unknown>)?.['message'];
    const emailRaw = (req.body as Record<string, unknown>)?.['email'];
    const typeRaw = (req.body as Record<string, unknown>)?.['type'];
    const firstNameRaw = (req.body as Record<string, unknown>)?.['firstName'];
    const lastNameRaw = (req.body as Record<string, unknown>)?.['lastName'];

    if (typeof messageRaw !== 'string' || messageRaw.trim().length === 0) {
      errors.push('Message is required.');
    } else if (messageRaw.trim().length > MAX_MESSAGE_LENGTH) {
      errors.push(`Message must be ${MAX_MESSAGE_LENGTH} characters or less.`);
    }

    if (!isValidEmail(emailRaw)) {
      errors.push('A valid email address is required.');
    }

    const feedbackType = normalizeFeedbackType(typeRaw);
    if (!feedbackType) {
      errors.push(`Feedback type must be one of: ${allowedFeedbackTypes.join(', ')}`);
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Feedback submission failed validation.',
        errors,
      });
      return;
    }

    const message = (messageRaw as string).trim();
    const email = (emailRaw as string).trim();
    const firstName = sanitizeOptionalString(firstNameRaw, 120);
    const lastName = sanitizeOptionalString(lastNameRaw, 120);
    const type = feedbackType as FeedbackCategory;

    const payload: FeedbackPayload = {
      type,
      message,
      email,
    };

    if (typeof firstName === 'string') {
      payload.firstName = firstName;
    }

    if (typeof lastName === 'string') {
      payload.lastName = lastName;
    }

    try {
      await FeedbackService.sendFeedbackEmail(payload);

      res.status(200).json({
        success: true,
        message: 'Feedback submitted successfully.',
      });
    } catch (error) {
      logger.error('Feedback submission failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        type: feedbackType,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to deliver feedback. Please try again later.',
      });
    }
  }
}

