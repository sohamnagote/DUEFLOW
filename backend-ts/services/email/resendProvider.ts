import { EmailProvider, SendEmailOptions, SendResult } from './types';
import { Resend } from 'resend';
import { config } from '../../config';

let resendInstance: Resend | null = null;
if (config.RESEND_API_KEY) {
  resendInstance = new Resend(config.RESEND_API_KEY);
}

export class ResendProvider implements EmailProvider {
  providerName = 'resend' as const;

  async getConnectionStatus(): Promise<'CONNECTED' | 'RECONNECT_REQUIRED' | 'NOT_CONNECTED'> {
    return 'CONNECTED';
  }

  async refreshToken(): Promise<boolean> {
    return true;
  }

  async sendEmail(options: SendEmailOptions): Promise<SendResult> {
    if (!resendInstance) {
      console.log(`[Resend Sandbox] Sent reminder to ${options.to} - ${options.subject}`);
      return {
        success: true,
        provider: 'resend',
        providerMessageId: `resend_sandbox_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        status: 'sent',
      };
    }

    try {
      const res = await resendInstance.emails.send({
        from: config.RESEND_FROM_EMAIL,
        to: options.to,
        replyTo: options.replyTo,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (res.error) {
        console.error('[Resend Error]', res.error);
        return {
          success: false,
          provider: 'resend',
          status: 'failed',
          errorCode: 'RESEND_ERROR',
          errorMessage: res.error.message,
          retryable: true,
        };
      }

      return {
        success: true,
        provider: 'resend',
        providerMessageId: res.data?.id,
        status: 'sent',
      };
    } catch (err: any) {
      console.error('[Resend Exception]', err);
      return {
        success: false,
        provider: 'resend',
        status: 'failed',
        errorCode: 'NETWORK_EXCEPTION',
        errorMessage: err.message,
        retryable: true,
      };
    }
  }

  async disconnect(): Promise<boolean> {
    return true;
  }
}
