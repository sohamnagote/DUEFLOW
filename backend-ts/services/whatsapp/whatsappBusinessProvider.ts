import { WhatsAppProvider, SendWhatsAppTemplateOptions, WhatsAppSendResult } from './types';
import { db, IntegrationRecord } from '../../db';
import { decryptToken } from '../cryptoService';

export class WhatsAppBusinessProvider implements WhatsAppProvider {
  providerName = 'whatsapp_business' as const;
  private integration: IntegrationRecord;

  constructor(integration: IntegrationRecord) {
    this.integration = integration;
  }

  private getAccessToken(): string {
    return decryptToken(this.integration.access_token_encrypted || '');
  }

  async getConnectionStatus(): Promise<'CONNECTED' | 'SETUP_REQUIRED' | 'RECONNECT_REQUIRED' | 'NOT_CONNECTED'> {
    if (!this.integration) return 'NOT_CONNECTED';
    if (this.integration.status === 'RECONNECT_REQUIRED') return 'RECONNECT_REQUIRED';
    if (this.integration.status === 'SETUP_REQUIRED') return 'SETUP_REQUIRED';

    const token = this.getAccessToken();
    const phoneId = this.integration.provider_phone_id;

    if (!token || !phoneId) {
      return 'SETUP_REQUIRED';
    }

    return 'CONNECTED';
  }

  async sendTemplateMessage(options: SendWhatsAppTemplateOptions): Promise<WhatsAppSendResult> {
    const status = await this.getConnectionStatus();
    if (status !== 'CONNECTED') {
      return {
        success: false,
        provider: 'whatsapp_business',
        status: 'failed',
        errorCode: status,
        errorMessage:
          status === 'SETUP_REQUIRED'
            ? 'WhatsApp Business setup is incomplete. Provide Phone Number ID and System User Access Token.'
            : 'WhatsApp Business authorization expired or revoked. Please reconnect in Settings.',
        retryable: false,
      };
    }

    const token = this.getAccessToken();
    const phoneId = this.integration.provider_phone_id;
    const cleanToPhone = options.toPhone.replace(/[^0-9]/g, '');

    if (!cleanToPhone) {
      return {
        success: false,
        provider: 'whatsapp_business',
        status: 'failed',
        errorCode: 'INVALID_RECIPIENT_PHONE',
        errorMessage: 'Recipient phone number is missing or invalid.',
        retryable: false,
      };
    }

    if (!token || token.startsWith('sim_')) {
      return {
        success: false,
        provider: 'whatsapp_business',
        status: 'failed',
        errorCode: 'INVALID_TOKEN',
        errorMessage: 'WhatsApp Business access token is not verified or expired. Please reconnect in Settings.',
        retryable: false,
      };
    }

    // Real Meta Cloud API payload for transactional template message
    const templateName = options.templateName || 'invoice_payment_reminder';
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanToPhone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en_US' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: options.variables.clientName },
              { type: 'text', text: options.variables.invoiceNumber },
              { type: 'text', text: options.variables.amountFormatted },
              { type: 'text', text: options.variables.dueDate },
              { type: 'text', text: options.variables.businessName },
            ],
          },
        ],
      },
    };

    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('[WhatsApp Cloud API Error]', data);
        const isAuthError = data?.error?.code === 190 || res.status === 401;
        if (isAuthError) {
          await db.updateIntegrationStatus(
            this.integration.id,
            'RECONNECT_REQUIRED',
            'OAUTH_EXPIRED',
            data?.error?.message || 'Access token expired or revoked'
          );
        }
        return {
          success: false,
          provider: 'whatsapp_business',
          status: 'failed',
          errorCode: data?.error?.code ? String(data.error.code) : `HTTP_${res.status}`,
          errorMessage: data?.error?.message || 'Failed to dispatch WhatsApp message via Meta Cloud API',
          retryable: !isAuthError && res.status >= 500,
        };
      }

      const messageId = data?.messages?.[0]?.id || `wamid_${Date.now()}`;
      await db.recordIntegrationSuccess(this.integration.id);

      return {
        success: true,
        provider: 'whatsapp_business',
        providerMessageId: messageId,
        status: 'sent',
      };
    } catch (err: any) {
      console.error('[WhatsApp Cloud API Network Exception]', err);
      return {
        success: false,
        provider: 'whatsapp_business',
        status: 'failed',
        errorCode: 'NETWORK_EXCEPTION',
        errorMessage: err.message,
        retryable: true,
      };
    }
  }

  async disconnect(): Promise<boolean> {
    await db.deleteIntegration(this.integration.user_id, 'whatsapp_business');
    return true;
  }
}
