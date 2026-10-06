import { WhatsAppProvider } from './types';
import { WhatsAppBusinessProvider } from './whatsappBusinessProvider';
import { db } from '../../db';

export async function getWhatsAppProviderForUser(userId: string): Promise<{
  provider: WhatsAppProvider | null;
  isConnected: boolean;
  status: 'CONNECTED' | 'SETUP_REQUIRED' | 'RECONNECT_REQUIRED' | 'NOT_CONNECTED';
}> {
  const integration = await db.getIntegrationByProvider(userId, 'whatsapp_business');
  if (!integration) {
    return {
      provider: null,
      isConnected: false,
      status: 'NOT_CONNECTED',
    };
  }

  const provider = new WhatsAppBusinessProvider(integration);
  const status = await provider.getConnectionStatus();

  return {
    provider,
    isConnected: status === 'CONNECTED',
    status,
  };
}
