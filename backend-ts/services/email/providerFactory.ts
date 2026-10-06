import { EmailProvider } from './types';
import { GmailProvider } from './gmailProvider';
import { MicrosoftGraphProvider } from './microsoftProvider';
import { ResendProvider } from './resendProvider';
import { db } from '../../db';

export async function getEmailProviderForUser(userId: string): Promise<{
  provider: EmailProvider;
  isUserConnected: boolean;
  connectedEmail?: string;
}> {
  // Check for user connected OAuth integrations in database
  const googleIntegration = await db.getIntegrationByProvider(userId, 'google');
  if (googleIntegration && googleIntegration.status === 'CONNECTED') {
    return {
      provider: new GmailProvider(googleIntegration),
      isUserConnected: true,
      connectedEmail: googleIntegration.provider_email || undefined,
    };
  }

  const microsoftIntegration = await db.getIntegrationByProvider(userId, 'microsoft');
  if (microsoftIntegration && microsoftIntegration.status === 'CONNECTED') {
    return {
      provider: new MicrosoftGraphProvider(microsoftIntegration),
      isUserConnected: true,
      connectedEmail: microsoftIntegration.provider_email || undefined,
    };
  }

  // Fallback to Resend system mailer
  return {
    provider: new ResendProvider(),
    isUserConnected: false,
  };
}
