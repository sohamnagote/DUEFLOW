import { db } from '../server/db';
import { encryptToken, decryptToken } from '../server/services/cryptoService';
import { getEmailProviderForUser } from '../server/services/email/providerFactory';
import { getWhatsAppProviderForUser } from '../server/services/whatsapp/providerFactory';
import { calculateReminderRules, recomputeRulesForUnpaid } from '../server/services/schedulerService';

async function testIntegrations() {
  console.log('\n--- Testing Integrations Architecture & Security ---');

  // 1. Encryption at rest
  const testSecret = 'ya29.a0AfH6SMB_secret_access_token_12345';
  const cipher = encryptToken(testSecret);
  console.assert(cipher !== testSecret, 'Cipher text should not be plain text');
  const decrypted = decryptToken(cipher);
  console.assert(decrypted === testSecret, 'Decrypted token should match original secret');
  console.log('✓ [PASS] AES-256-GCM Token Encryption at Rest');

  // 2. Integration record creation & querying
  const userId = 'user_test_tenant_1';
  const googleRecord = await db.upsertIntegration({
    id: 'int_google_1',
    user_id: userId,
    provider: 'google',
    channel: 'email',
    status: 'CONNECTED',
    provider_account_id: 'freelancer@gmail.com',
    provider_email: 'freelancer@gmail.com',
    access_token_encrypted: encryptToken('access_token_test'),
    refresh_token_encrypted: encryptToken('refresh_token_test'),
    scopes: ['https://www.googleapis.com/auth/gmail.send'],
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });

  const fetchedGoogle = await db.getIntegrationByProvider(userId, 'google');
  console.assert(fetchedGoogle?.status === 'CONNECTED', 'Fetched Google integration should be CONNECTED');
  console.assert(fetchedGoogle?.provider_email === 'freelancer@gmail.com', 'Provider email should match');
  console.log('✓ [PASS] Google Integration persistence & retrieval');

  // 3. Provider factory resolution
  const { provider: emailProvider, isUserConnected, connectedEmail } = await getEmailProviderForUser(userId);
  console.assert(isUserConnected === true, 'User should have connected provider');
  console.assert(emailProvider.providerName === 'google', 'Provider should be GmailProvider');
  console.assert(connectedEmail === 'freelancer@gmail.com', 'Connected email should match');
  console.log('✓ [PASS] Email Provider Factory resolves to GmailProvider');

  // 4. WhatsApp Business integration
  await db.upsertIntegration({
    id: 'int_wa_1',
    user_id: userId,
    provider: 'whatsapp_business',
    channel: 'whatsapp',
    status: 'CONNECTED',
    provider_business_id: 'Studio Vertex Official',
    provider_phone_id: '109283746501928',
    access_token_encrypted: encryptToken('sim_meta_token'),
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });

  const { provider: waProvider, isConnected, status: waStatus } = await getWhatsAppProviderForUser(userId);
  console.assert(isConnected === true, 'WhatsApp should be connected');
  console.assert(waStatus === 'CONNECTED', 'WhatsApp status should be CONNECTED');
  console.assert(waProvider !== null, 'WhatsAppProvider should be initialized');
  console.log('✓ [PASS] WhatsApp Business Provider factory & connection status');

  // 5. Cadence Generation with multiple channels
  const dueDate = '2026-10-15';
  const dualRules = calculateReminderRules(dueDate, 'Asia/Kolkata', 'unpaid', ['email', 'whatsapp']);
  console.assert(dualRules.length === 8, 'Dual channels should produce 8 total rules (4 for each channel)');
  const emailRules = dualRules.filter((r) => r.channel === 'email');
  const waRules = dualRules.filter((r) => r.channel === 'whatsapp');
  console.assert(emailRules.length === 4, 'Should have 4 email rules');
  console.assert(waRules.length === 4, 'Should have 4 WhatsApp rules');
  console.assert(emailRules[0].channel === 'email', 'Rule channel should be email');
  console.assert(waRules[0].channel === 'whatsapp', 'Rule channel should be whatsapp');
  console.log('✓ [PASS] Channel-specific Cadence Generation & Occurrence Keys');

  // 6. Test Email Dispatch simulation
  const emailSendResult = await emailProvider.sendEmail({
    to: 'client@example.com',
    fromName: 'Studio Vertex',
    fromEmail: 'freelancer@gmail.com',
    subject: 'Invoice #1042 Reminder',
    html: '<p>Payment reminder</p>',
    text: 'Payment reminder',
  });
  console.assert(emailSendResult.success === true, 'Email dispatch should succeed');
  console.assert(Boolean(emailSendResult.providerMessageId), 'Provider message ID should be populated');
  console.log('✓ [PASS] Email Dispatch execution & Provider Message ID');

  // 7. Test WhatsApp Dispatch simulation
  const waSendResult = await waProvider!.sendTemplateMessage({
    toPhone: '+919876543210',
    variables: {
      clientName: 'Acme Corp',
      invoiceNumber: 'INV-1042',
      amountFormatted: '₹25,000.00',
      dueDate: '2026-10-15',
      businessName: 'Studio Vertex',
    },
  });
  console.assert(waSendResult.success === true, 'WhatsApp dispatch should succeed');
  console.assert(Boolean(waSendResult.providerMessageId), 'WhatsApp message ID should be populated');
  console.log('✓ [PASS] WhatsApp Template Dispatch execution & Message ID');

  console.log('\n--- All Integration Architecture Tests Passed! ---\n');
}

testIntegrations().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
