import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

export type FeedbackCategory = 'feedback' | 'feature' | 'bug';

export interface FeedbackPayload {
  type: FeedbackCategory;
  message: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

let mailTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (mailTransporter) {
    return mailTransporter;
  }

  mailTransporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.port === 465,
    auth: {
      user: config.mail.user,
      pass: config.mail.password,
    },
  });

  return mailTransporter;
}

export class FeedbackService {
  static async sendFeedbackEmail(payload: FeedbackPayload): Promise<void> {
    const transporter = getTransporter();
    const { type, message, email, firstName, lastName } = payload;

    const normalizedType = type.charAt(0).toUpperCase() + type.slice(1);
    const submitterName = [firstName, lastName]
      .map((value) => value?.trim())
      .filter((value) => value && value.length > 0)
      .join(' ');

    const emailBody = [
      `New ${normalizedType} submission received via Plotmix contact form.`,
      '',
      'Message:',
      message,
      '',
      `Submitted by: ${submitterName || 'Anonymous user'}`,
      `Email: ${email || 'Not provided'}`,
      `Submitted at: ${new Date().toISOString()}`,
    ].join('\n');

    try {
      await transporter.sendMail({
        from: `"Plotmix Feedback" <${config.mail.fromEmail}>`,
        to: config.mail.toEmail,
        replyTo: email || config.mail.fromEmail,
        subject: `[Plotmix ${normalizedType}] Feedback Submission`,
        text: emailBody,
      });
    } catch (error) {
      logger.error('Failed to send feedback email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        type,
      });
      throw error;
    }
  }
}

