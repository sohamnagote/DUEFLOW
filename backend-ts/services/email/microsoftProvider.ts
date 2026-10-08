import { EmailProvider, SendEmailOptions, SendResult } from './types';
import { db, IntegrationRecord } from '../../db';
import { decryptToken, encryptToken } from '../cryptoService';

export class MicrosoftGraphProvider implements EmailProvider {
  providerName = 'microsoft' as const;
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

    if (this.integration.token_expires_at) {
      const expiresAt = new Date(this.integration.token_expires_at).getTime();
      const now = Date.now();
      if (expiresAt - now < 60000) {
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

    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

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
      const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          scope: 'offline_access Mail.Send User.Read',
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        console.error('[MicrosoftGraphProvider] Refresh token failed:', data);
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
      const newRefreshToken = data.refresh_token ? encryptToken(data.refresh_token) : this.integration.refresh_token_encrypted;

      await db.updateIntegrationTokens(this.integration.id, {
        access_token_encrypted: encryptToken(newAccessToken),
        refresh_token_encrypted: newRefreshToken,
        token_expires_at: tokenExpiresAt,
        status: 'CONNECTED',
      });

      this.integration.access_token_encrypted = encryptToken(newAccessToken);
      this.integration.token_expires_at = tokenExpiresAt;
      return true;
    } catch (err: any) {
      console.error('[MicrosoftGraphProvider] Refresh network error:', err);
      await db.updateIntegrationStatus(this.integration.id, 'RECONNECT_REQUIRED', 'NETWORK_ERROR', err.message);
      return false;
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<SendResult> {
    const status = await this.getConnectionStatus();
    if (status !== 'CONNECTED') {
      return {
        success: false,
        provider: 'microsoft',
        status: 'failed',
        errorCode: 'RECONNECT_REQUIRED',
        errorMessage: 'Microsoft Outlook authorization expired. Please reconnect your Microsoft account in Settings.',
        retryable: false,
      };
    }

    const token = this.getAccessToken();

    if (!token || token.startsWith('sim_')) {
      return {
        success: false,
        provider: 'microsoft',
        status: 'failed',
        errorCode: 'INVALID_TOKEN',
        errorMessage: 'Microsoft Outlook connection is not authenticated. Please connect your Microsoft account in Settings.',
        retryable: false,
      };
    }

    const payload: any = {
      message: {
        subject: options.subject,
        body: {
          contentType: 'HTML',
          content: options.html,
        },
        toRecipients: [
          {
            emailAddress: {
              address: options.to,
            },
          },
        ],
      },
      saveToSentItems: true,
    };

    if (options.replyTo) {
      payload.message.replyTo = [
        {
          emailAddress: {
            address: options.replyTo,
          },
        },
      ];
    }

    try {
      const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 401) {
          const refreshed = await this.refreshToken();
          if (refreshed) {
            return this.sendEmail(options);
          }
        }
        const errText = await res.text();
        console.error('[MicrosoftGraphProvider] sendMail failed:', res.status, errText);
        return {
          success: false,
          provider: 'microsoft',
          status: 'failed',
          errorCode: `HTTP_${res.status}`,
          errorMessage: errText || 'Failed to dispatch email via Microsoft Graph',
          retryable: res.status >= 500,
        };
      }

      const generatedId = `graph_msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      await db.recordIntegrationSuccess(this.integration.id);
      return {
        success: true,
        provider: 'microsoft',
        providerMessageId: generatedId,
        status: 'sent',
      };
    } catch (err: any) {
      console.error('[MicrosoftGraphProvider] Network error:', err);
      return {
        success: false,
        provider: 'microsoft',
        status: 'failed',
        errorCode: 'NETWORK_EXCEPTION',
        errorMessage: err.message,
        retryable: true,
      };
    }
  }

  async disconnect(): Promise<boolean> {
    await db.deleteIntegration(this.integration.user_id, 'microsoft');
    return true;
  }
}
