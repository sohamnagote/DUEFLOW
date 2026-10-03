export interface SendEmailOptions {
  to: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendResult {
  success: boolean;
  provider: 'google' | 'microsoft' | 'resend';
  providerMessageId?: string;
  status: 'sent' | 'delivered' | 'failed';
  errorCode?: string;
  errorMessage?: string;
  retryable?: boolean;
}

export interface EmailProvider {
  providerName: 'google' | 'microsoft' | 'resend';
  sendEmail(options: SendEmailOptions): Promise<SendResult>;
  getConnectionStatus(): Promise<'CONNECTED' | 'RECONNECT_REQUIRED' | 'NOT_CONNECTED'>;
  refreshToken(): Promise<boolean>;
  disconnect(): Promise<boolean>;
}
