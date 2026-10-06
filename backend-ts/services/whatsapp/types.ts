export interface SendWhatsAppTemplateOptions {
  toPhone: string;
  templateName?: string;
  variables: {
    clientName: string;
    invoiceNumber: string;
    amountFormatted: string;
    dueDate: string;
    daysOverdue?: number;
    businessName: string;
    paymentLinkOrUpi?: string;
  };
}

export interface WhatsAppSendResult {
  success: boolean;
  provider: 'whatsapp_business';
  providerMessageId?: string;
  status: 'sent' | 'delivered' | 'failed';
  errorCode?: string;
  errorMessage?: string;
  retryable?: boolean;
}

export interface WhatsAppProvider {
  providerName: 'whatsapp_business';
  sendTemplateMessage(options: SendWhatsAppTemplateOptions): Promise<WhatsAppSendResult>;
  getConnectionStatus(): Promise<'CONNECTED' | 'SETUP_REQUIRED' | 'RECONNECT_REQUIRED' | 'NOT_CONNECTED'>;
  disconnect(): Promise<boolean>;
}
