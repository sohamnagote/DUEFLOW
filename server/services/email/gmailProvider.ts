import { EmailProvider, SendEmailOptions, SendResult } from './types';
import { db, IntegrationRecord } from '../../db';
import { decryptToken, encryptToken } from '../cryptoService';

export class GmailProvider implements EmailProvider {
  providerName = 'google' as const;
  private integration: IntegrationRecord;

  constructor(integration: IntegrationRecord) {
    this.integration = integration;
  }

  private getAccessToken(): string {
    return decryptToken(this.integration.access_token_encrypted || '');
  }

  private getRefreshToken(): string {
    return decryptToken(this.integration.refresh_token_encrypted || '');
  }

  async getConnectionStatus(): Promise<'CONNECTED' | 'RECONNECT_REQUIRED' | 'NOT_CONNECTED'> {
    if (this.integration.status === 'RECONNECT_REQUIRED') return 'RECONNECT_REQUIRED';
    if (!this.integration.access_token_encrypted) return 'NOT_CONNECTED';

    // Check expiry
    if (this.integration.token_expires_at) {
      const expiresAt = new Date(this.integration.token_expires_at).getTime();
      const now = Date.now();
      if (expiresAt - now < 60000) {
        // Token expired or about to expire in 1 min, refresh it
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          return 'RECONNECT_REQUIRED';
        }
      }
    }

    return 'CONNECTED';
  }

  async refreshToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      await db.updateIntegrationStatus(this.integration.id, 'RECONNECT_REQUIRED', 'NO_REFRESH_TOKEN', 'No refresh token available');
      return false;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      // In simulated / dev mode sandbox
      const newExpiry = new Date(Date.now() + 3600 * 1000).toISOString();
      await db.updateIntegrationTokens(this.integration.id, {
        access_token_encrypted: this.integration.access_token_encrypted || '',
        token_expires_at: newExpiry,
        status: 'CONNECTED',
      });
      return true;
    }

    try {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        console.error('[GmailProvider] Refresh token failed:', data);
        await db.updateIntegrationStatus(
          this.integration.id,
          'RECONNECT_REQUIRED',
          data.error || 'REFRESH_FAILED',
          data.error_description || 'Refresh token expired or revoked'
        );
        return false;
      }

      const newAccessToken = data.access_token;
      const expiresInSec = data.expires_in || 3599;
      const tokenExpiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

      await db.updateIntegrationTokens(this.integration.id, {
        access_token_encrypted: encryptToken(newAccessToken),
        token_expires_at: tokenExpiresAt,
        status: 'CONNECTED',
      });

      this.integration.access_token_encrypted = encryptToken(newAccessToken);
      this.integration.token_expires_at = tokenExpiresAt;
      return true;
    } catch (err: any) {
      console.error('[GmailProvider] Refresh network error:', err);
      await db.updateIntegrationStatus(this.integration.id, 'RECONNECT_REQUIRED', 'NETWORK_ERROR', err.message);
      return false;
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<SendResult> {
    const status = await this.getConnectionStatus();
    if (status !== 'CONNECTED') {
      return {
        success: false,
        provider: 'google',
        status: 'failed',
        errorCode: 'RECONNECT_REQUIRED',
        errorMessage: 'Gmail authorization expired. Please reconnect your Google account in Settings.',
        retryable: false,
      };
    }

    const token = this.getAccessToken();
    const fromAddress = this.integration.provider_email || options.fromEmail;

    // Build RFC 2822 message
    const messageLines = [
      `From: ${options.fromName} <${fromAddress}>`,
      `To: ${options.to}`,
      options.replyTo ? `Reply-To: ${options.replyTo}` : '',
      `Subject: ${options.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset="UTF-8"',
      '',
      options.html,
    ].filter(Boolean);

    const rfc2822 = messageLines.join('\r\n');
    const base64Encoded = Buffer.from(rfc2822)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // If sandbox / simulated token
    if (token.startsWith('sim_') || !process.env.GOOGLE_CLIENT_ID) {
      console.log(`[Gmail Simulation] Sent message to ${options.to} from ${fromAddress}`);
      const mockMsgId = `gmail_sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      await db.recordIntegrationSuccess(this.integration.id);
      return {
        success: true,
        provider: 'google',
        providerMessageId: mockMsgId,
        status: 'sent',
      };
    }

    try {
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: base64Encoded }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          // Token expired, attempt single retry
          const refreshed = await this.refreshToken();
          if (refreshed) {
            return this.sendEmail(options);
          }
        }
        console.error('[GmailProvider] Send error:', data);
        return {
          success: false,
          provider: 'google',
          status: 'failed',
          errorCode: data?.error?.status || `HTTP_${res.status}`,
          errorMessage: data?.error?.message || 'Failed to send email via Gmail API',
          retryable: res.status >= 500,
        };
      }

      await db.recordIntegrationSuccess(this.integration.id);
      return {
        success: true,
        provider: 'google',
        providerMessageId: data.id,
        status: 'sent',
      };
    } catch (err: any) {
      console.error('[GmailProvider] Network error:', err);
      return {
        success: false,
        provider: 'google',
        status: 'failed',
        errorCode: 'NETWORK_EXCEPTION',
        errorMessage: err.message,
        retryable: true,
      };
    }
  }

  async disconnect(): Promise<boolean> {
    await db.deleteIntegration(this.integration.user_id, 'google');
    return true;
  }
}
