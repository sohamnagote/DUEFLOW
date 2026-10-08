import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db, SafeIntegration, IntegrationRecord } from '../db';
import { requireAuth } from '../middleware/auth';
import { encryptToken } from '../services/cryptoService';
import { getEmailProviderForUser } from '../services/email/providerFactory';
import { getWhatsAppProviderForUser } from '../services/whatsapp/providerFactory';
import { config } from '../config';

const router = Router();

function getBaseUrl(req: Request): string {
  // Use runtime APP_URL if available as required by AI Studio preview environment
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  const host = req.get('host') || 'localhost:3000';
  const proto = req.protocol || 'http';
  return `${proto}://${host}`;
}

// ---------------------------------------------------------------------------
// GET /api/integrations - List user's active integrations and channel settings
// ---------------------------------------------------------------------------
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const integrations = await db.getIntegrations(userId);
  const profile = await db.getProfile(userId);

  const safeIntegrations: SafeIntegration[] = integrations.map((i) => db.toSafeIntegration(i));

  const emailIntegration = safeIntegrations.find((i) => i.channel === 'email' && i.status === 'CONNECTED');
  const whatsappIntegration = safeIntegrations.find((i) => i.channel === 'whatsapp' && i.status === 'CONNECTED');

  const emailConnected = Boolean(emailIntegration);
  const whatsappConnected = Boolean(whatsappIntegration);

  let defaultReminderChannel = profile?.default_reminder_channel || 'email';
  // Enforce invariant: "both" only allowed if both are connected
  if (defaultReminderChannel === 'both' && (!emailConnected || !whatsappConnected)) {
    defaultReminderChannel = emailConnected ? 'email' : whatsappConnected ? 'whatsapp' : 'email';
  }

  return res.json({
    success: true,
    integrations: safeIntegrations,
    settings: {
      default_reminder_channel: defaultReminderChannel,
      email_reminders_enabled: profile?.email_reminders_enabled ?? true,
      whatsapp_reminders_enabled: profile?.whatsapp_reminders_enabled ?? false,
      can_select_both: emailConnected && whatsappConnected,
      email_connected: emailConnected,
      whatsapp_connected: whatsappConnected,
    },
  });
});

// ---------------------------------------------------------------------------
// PUT /api/integrations/settings - Update reminder channel policy & toggles
// ---------------------------------------------------------------------------
router.put('/settings', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { default_reminder_channel, email_reminders_enabled, whatsapp_reminders_enabled } = req.body;

  const integrations = await db.getIntegrations(userId);
  const emailConn = integrations.some((i) => i.channel === 'email' && i.status === 'CONNECTED');
  const waConn = integrations.some((i) => i.channel === 'whatsapp' && i.status === 'CONNECTED');

  // Policy validation
  if (default_reminder_channel === 'both' && (!emailConn || !waConn)) {
    return res.status(400).json({
      success: false,
      code: 'INTEGRATION_CHANNEL_UNAVAILABLE',
      message: 'Cannot set default channel to "Both" unless both Email and WhatsApp Business are connected.',
    });
  }

  if (default_reminder_channel === 'whatsapp' && !waConn) {
    return res.status(400).json({
      success: false,
      code: 'WHATSAPP_NOT_CONNECTED',
      message: 'Cannot set default channel to WhatsApp because WhatsApp Business is not connected.',
    });
  }

  const updatedProfile = await db.upsertProfile({
    id: userId,
    email: req.user!.email,
    default_reminder_channel: default_reminder_channel,
    email_reminders_enabled: email_reminders_enabled !== undefined ? Boolean(email_reminders_enabled) : undefined,
    whatsapp_reminders_enabled: whatsapp_reminders_enabled !== undefined ? Boolean(whatsapp_reminders_enabled) : undefined,
  });

  return res.json({
    success: true,
    message: 'Integration settings saved successfully.',
    settings: {
      default_reminder_channel: updatedProfile.default_reminder_channel,
      email_reminders_enabled: updatedProfile.email_reminders_enabled,
      whatsapp_reminders_enabled: updatedProfile.whatsapp_reminders_enabled,
    },
  });
});

// ---------------------------------------------------------------------------
// GOOGLE GMAIL OAUTH
// ---------------------------------------------------------------------------

// POST /api/integrations/email/google/start
router.post('/email/google/start', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/integrations/email/google/callback`;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const state = Buffer.from(JSON.stringify({ userId, nonce: crypto.randomUUID() })).toString('base64');

  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(400).json({
      success: false,
      code: 'GOOGLE_CREDENTIALS_MISSING',
      message: 'Google Cloud credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are not configured in the server environment.',
    });
  }

  const scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email',
    'openid',
  ].join(' ');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(
    scopes
  )}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;

  return res.json({
    url: authUrl,
    mode: 'oauth2',
    redirect_uri: redirectUri,
  });
});

// GET /api/integrations/email/google/callback
router.get(['/email/google/callback', '/email/google/callback/'], async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.send(renderOAuthCallbackHtml({ success: false, provider: 'google', error: String(error) }));
  }

  let userId: string | null = null;
  try {
    if (state) {
      const decoded = JSON.parse(Buffer.from(String(state), 'base64').toString('utf8'));
      userId = decoded.userId;
    }
  } catch {}

  if (!userId) {
    return res.send(
      renderOAuthCallbackHtml({
        success: false,
        provider: 'google',
        error: 'Invalid state parameter in OAuth callback.',
      })
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/integrations/email/google/callback`;

  if (!clientId || !clientSecret || !code) {
    return res.send(
      renderOAuthCallbackHtml({
        success: false,
        provider: 'google',
        error: 'Missing Google credentials or authorization code.',
      })
    );
  }

  let userEmail = '';
  let accessToken = '';
  let refreshToken = '';
  let expiresIn = 3600;

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error) {
      return res.send(
        renderOAuthCallbackHtml({
          success: false,
          provider: 'google',
          error: tokenData.error_description || tokenData.error || 'Token exchange failed',
        })
      );
    }

    accessToken = tokenData.access_token;
    refreshToken = tokenData.refresh_token || '';
    expiresIn = tokenData.expires_in || 3600;

    // Fetch user profile from Google to get real verified email address
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (userRes.ok) {
      const userInfo = await userRes.json();
      userEmail = userInfo.email || '';
    }

    if (!userEmail) {
      return res.send(
        renderOAuthCallbackHtml({
          success: false,
          provider: 'google',
          error: 'Could not retrieve email address for this Google account.',
        })
      );
    }
  } catch (err: any) {
    return res.send(
      renderOAuthCallbackHtml({
        success: false,
        provider: 'google',
        error: err.message || 'Authorization failed',
      })
    );
  }

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const existing = await db.getIntegrationByProvider(userId, 'google');

  const integrationRecord: IntegrationRecord = {
    id: existing?.id || crypto.randomUUID(),
    user_id: userId,
    provider: 'google',
    channel: 'email',
    status: 'CONNECTED',
    provider_account_id: userEmail,
    provider_email: userEmail,
    access_token_encrypted: encryptToken(accessToken),
    refresh_token_encrypted: encryptToken(refreshToken),
    token_expires_at: expiresAt,
    scopes: ['https://www.googleapis.com/auth/gmail.send', 'email', 'openid'],
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_at: existing?.created_at || new Date().toISOString(),
  };

  await db.upsertIntegration(integrationRecord);

  // If user had no email integration or default was unset, set default channel to email
  const currentProfile = await db.getProfile(userId);
  if (!currentProfile?.default_reminder_channel) {
    await db.upsertProfile({
      id: userId,
      email: currentProfile?.email || userEmail,
      default_reminder_channel: 'email',
      email_reminders_enabled: true,
    });
  }

  return res.send(
    renderOAuthCallbackHtml({
      success: true,
      provider: 'google',
      displayEmail: userEmail,
    })
  );
});

// ---------------------------------------------------------------------------
// MICROSOFT OUTLOOK / 365 OAUTH
// ---------------------------------------------------------------------------

// POST /api/integrations/email/microsoft/start
router.post('/email/microsoft/start', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/integrations/email/microsoft/callback`;

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const state = Buffer.from(JSON.stringify({ userId, nonce: crypto.randomUUID() })).toString('base64');

  if (!clientId || !process.env.MICROSOFT_CLIENT_SECRET) {
    return res.status(400).json({
      success: false,
      code: 'MICROSOFT_CREDENTIALS_MISSING',
      message: 'Microsoft Azure credentials (MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET) are not configured in the server environment.',
    });
  }

  const scopes = ['openid', 'email', 'profile', 'offline_access', 'Mail.Send', 'User.Read'].join(' ');
  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(
    scopes
  )}&response_mode=query&state=${encodeURIComponent(state)}`;

  return res.json({
    url: authUrl,
    mode: 'oauth2',
    redirect_uri: redirectUri,
  });
});

// GET /api/integrations/email/microsoft/callback
router.get(['/email/microsoft/callback', '/email/microsoft/callback/'], async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.send(renderOAuthCallbackHtml({ success: false, provider: 'microsoft', error: String(error) }));
  }

  let userId: string | null = null;
  try {
    if (state) {
      const decoded = JSON.parse(Buffer.from(String(state), 'base64').toString('utf8'));
      userId = decoded.userId;
    }
  } catch {}

  if (!userId) {
    return res.send(
      renderOAuthCallbackHtml({
        success: false,
        provider: 'microsoft',
        error: 'Invalid state parameter in Microsoft OAuth callback.',
      })
    );
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/integrations/email/microsoft/callback`;

  if (!clientId || !clientSecret || !code) {
    return res.send(
      renderOAuthCallbackHtml({
        success: false,
        provider: 'microsoft',
        error: 'Missing Microsoft credentials or authorization code.',
      })
    );
  }

  let userEmail = '';
  let accessToken = '';
  let refreshToken = '';
  let expiresIn = 3600;

  try {
    const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: 'offline_access Mail.Send User.Read openid email profile',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error) {
      return res.send(
        renderOAuthCallbackHtml({
          success: false,
          provider: 'microsoft',
          error: tokenData.error_description || tokenData.error || 'Token exchange failed',
        })
      );
    }

    accessToken = tokenData.access_token;
    refreshToken = tokenData.refresh_token || '';
    expiresIn = tokenData.expires_in || 3600;

    // Fetch user profile from Microsoft Graph /me
    const graphRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (graphRes.ok) {
      const graphData = await graphRes.json();
      userEmail = graphData.mail || graphData.userPrincipalName || '';
    }

    if (!userEmail) {
      return res.send(
        renderOAuthCallbackHtml({
          success: false,
          provider: 'microsoft',
          error: 'Could not retrieve email address from Microsoft Graph.',
        })
      );
    }
  } catch (err: any) {
    return res.send(
      renderOAuthCallbackHtml({
        success: false,
        provider: 'microsoft',
        error: err.message || 'Authorization failed',
      })
    );
  }

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const existing = await db.getIntegrationByProvider(userId, 'microsoft');

  const integrationRecord: IntegrationRecord = {
    id: existing?.id || crypto.randomUUID(),
    user_id: userId,
    provider: 'microsoft',
    channel: 'email',
    status: 'CONNECTED',
    provider_account_id: userEmail,
    provider_email: userEmail,
    access_token_encrypted: encryptToken(accessToken),
    refresh_token_encrypted: encryptToken(refreshToken),
    token_expires_at: expiresAt,
    scopes: ['Mail.Send', 'User.Read', 'offline_access'],
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_at: existing?.created_at || new Date().toISOString(),
  };

  await db.upsertIntegration(integrationRecord);

  return res.send(
    renderOAuthCallbackHtml({
      success: true,
      provider: 'microsoft',
      displayEmail: userEmail,
    })
  );
});

// ---------------------------------------------------------------------------
// EMAIL STATUS, TEST, DISCONNECT, RECONNECT
// ---------------------------------------------------------------------------

// GET /api/integrations/email/status
router.get('/email/status', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { provider, isUserConnected, connectedEmail } = await getEmailProviderForUser(userId);
  const status = await provider.getConnectionStatus();

  return res.json({
    success: true,
    provider: provider.providerName,
    is_user_connected: isUserConnected,
    status: isUserConnected ? status : 'NOT_CONNECTED',
    display_email: connectedEmail,
  });
});

// POST /api/integrations/email/test
router.post('/email/test', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const profile = await db.getProfile(userId);
  const { provider, isUserConnected, connectedEmail } = await getEmailProviderForUser(userId);

  const targetEmail = connectedEmail || profile?.email || req.user!.email;

  const result = await provider.sendEmail({
    to: targetEmail,
    fromName: profile?.business_name || profile?.full_name || 'DueFlow System',
    fromEmail: targetEmail,
    subject: `[DueFlow Test] Email integration verified for ${profile?.business_name || 'Studio'}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
        <h2 style="color: #4338ca;">DueFlow Email Verification Successful</h2>
        <p>This test email confirms that your email sending integration (<strong>${provider.providerName.toUpperCase()}</strong>) is properly authorized and connected.</p>
        <div style="background: #f1f5f9; padding: 12px; border-radius: 6px; margin: 16px 0; font-family: monospace; font-size: 13px;">
          Provider: ${provider.providerName}<br>
          Authenticated Account: ${targetEmail}<br>
          Timestamp: ${new Date().toISOString()}
        </div>
        <p style="color: #64748b; font-size: 12px;">You can now dispatch automated payment reminders directly from your authenticated mailbox.</p>
      </div>
    `,
    text: `DueFlow Email Verification Successful. Integration with ${provider.providerName} verified at ${new Date().toISOString()}.`,
  });

  return res.json({
    success: result.success,
    provider: result.provider,
    providerMessageId: result.providerMessageId,
    recipient: targetEmail,
    error: result.errorMessage || result.errorCode,
    message: result.success ? `Test email successfully dispatched to ${targetEmail}` : 'Test email failed to send',
  });
});

// POST /api/integrations/email/disconnect
router.post('/email/disconnect', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { provider: providerName } = req.body;

  if (providerName === 'google' || providerName === 'microsoft') {
    await db.deleteIntegration(userId, providerName);
  } else {
    // Disconnect any active email provider
    await db.deleteIntegration(userId, 'google');
    await db.deleteIntegration(userId, 'microsoft');
  }

  // Update profile default if necessary
  const profile = await db.getProfile(userId);
  if (profile?.default_reminder_channel === 'both') {
    await db.upsertProfile({
      id: userId,
      email: profile.email,
      default_reminder_channel: 'whatsapp',
    });
  }

  return res.json({
    success: true,
    message: 'Email integration disconnected successfully.',
  });
});

// POST /api/integrations/email/reconnect
router.post('/email/reconnect', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { provider } = req.body;

  if (provider === 'google') {
    const googleInt = await db.getIntegrationByProvider(userId, 'google');
    if (googleInt) {
      await db.updateIntegrationStatus(googleInt.id, 'NOT_CONNECTED');
    }
  } else if (provider === 'microsoft') {
    const msInt = await db.getIntegrationByProvider(userId, 'microsoft');
    if (msInt) {
      await db.updateIntegrationStatus(msInt.id, 'NOT_CONNECTED');
    }
  }

  return res.json({
    success: true,
    message: 'Ready to re-authenticate account.',
  });
});

// ---------------------------------------------------------------------------
// WHATSAPP BUSINESS INTEGRATION
// ---------------------------------------------------------------------------

// POST /api/integrations/whatsapp/start - Initiate connection / Onboarding
router.post('/whatsapp/start', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/integrations/whatsapp/callback`;

  // Check if Meta App credentials configured
  const wabaId = process.env.WHATSAPP_WABA_ID;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  return res.json({
    success: true,
    redirect_uri: redirectUri,
    configured_waba_id: wabaId,
    configured_phone_id: phoneId,
    instructions: {
      step1: 'Create a Meta Business account and WhatsApp Cloud API app on developers.facebook.com',
      step2: 'Retrieve your WhatsApp Business Account ID (WABA ID) and Phone Number ID',
      step3: 'Generate a Permanent System User Access Token with whatsapp_business_messaging permission',
      step4: 'Provide these credentials in the Connect WhatsApp Business modal to securely link your sender identity',
    },
  });
});

// POST /api/integrations/whatsapp/callback - Save and verify WhatsApp Business credentials
router.post('/whatsapp/callback', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { phone_number_id, business_account_id, access_token, business_name, sender_phone } = req.body;

  if (!phone_number_id || !access_token) {
    return res.status(400).json({
      success: false,
      code: 'INTEGRATION_SAVE_FAILED',
      message: 'CONNECTION FAILED: Phone Number ID and Permanent Access Token are required.',
    });
  }

  const cleanPhoneId = phone_number_id.trim();
  const cleanToken = access_token.trim();
  const cleanWabaId = business_account_id ? business_account_id.trim() : '';

  // 1. Live verification against Meta Cloud API (Graph API)
  let verifiedName = business_name || '';
  let verifiedPhone = sender_phone || '';

  try {
    const metaPhoneUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(cleanPhoneId)}?fields=id,verified_name,display_phone_number,quality_rating,code_verification_status`;
    const metaRes = await fetch(metaPhoneUrl, {
      headers: { Authorization: `Bearer ${cleanToken}` },
    });

    const metaData = await metaRes.json().catch(() => ({}));
    if (!metaRes.ok || metaData.error) {
      const errDetail = metaData.error?.message || `Meta returned HTTP ${metaRes.status}`;
      return res.status(400).json({
        success: false,
        code: 'META_VERIFICATION_FAILED',
        message: `CONNECTION FAILED: ${errDetail}`,
      });
    }

    if (metaData.verified_name) {
      verifiedName = metaData.verified_name;
    }
    if (metaData.display_phone_number) {
      verifiedPhone = metaData.display_phone_number;
    }

    // 2. If WABA ID provided, verify WABA ID with Meta
    if (cleanWabaId) {
      const wabaUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(cleanWabaId)}?fields=id,name`;
      const wabaRes = await fetch(wabaUrl, {
        headers: { Authorization: `Bearer ${cleanToken}` },
      });
      const wabaData = await wabaRes.json().catch(() => ({}));
      if (!wabaRes.ok || wabaData.error) {
        const wabaErr = wabaData.error?.message || `Meta WABA verification returned HTTP ${wabaRes.status}`;
        return res.status(400).json({
          success: false,
          code: 'META_VERIFICATION_FAILED',
          message: `CONNECTION FAILED: ${wabaErr}`,
        });
      }
      if (wabaData.name && !verifiedName) {
        verifiedName = wabaData.name;
      }
    }
  } catch (netErr: any) {
    return res.status(400).json({
      success: false,
      code: 'META_VERIFICATION_FAILED',
      message: `CONNECTION FAILED: Could not reach Meta Graph API (${netErr.message || 'Network error'})`,
    });
  }

  const existing = await db.getIntegrationByProvider(userId, 'whatsapp_business');
  const now = new Date().toISOString();

  const integrationRecord: IntegrationRecord = {
    id: existing?.id || crypto.randomUUID(),
    user_id: userId,
    provider: 'whatsapp_business',
    channel: 'whatsapp',
    status: 'CONNECTED',
    provider_business_id: cleanWabaId || verifiedName || 'WhatsApp Business',
    provider_phone_id: cleanPhoneId,
    access_token_encrypted: encryptToken(cleanToken),
    connected_at: now,
    updated_at: now,
    created_at: existing?.created_at || now,
  };

  await db.upsertIntegration(integrationRecord);

  // Update profile phone if verified phone is present
  if (verifiedPhone) {
    const profile = await db.getProfile(userId);
    await db.upsertProfile({
      id: userId,
      email: profile?.email || req.user!.email,
      phone: verifiedPhone,
      whatsapp_reminders_enabled: true,
    });
  }

  return res.json({
    success: true,
    message: 'WhatsApp Business connected and verified.',
    integration: db.toSafeIntegration(integrationRecord),
  });
});

// GET /api/integrations/whatsapp/status
router.get('/whatsapp/status', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { provider, isConnected, status } = await getWhatsAppProviderForUser(userId);
  const integration = await db.getIntegrationByProvider(userId, 'whatsapp_business');

  return res.json({
    success: true,
    status: integration ? status : 'NOT_CONNECTED',
    is_connected: isConnected,
    business_name: integration?.provider_business_id || undefined,
    phone_id: integration?.provider_phone_id || undefined,
    last_success_at: integration?.last_success_at,
    last_error: integration?.last_error_message || integration?.last_error_code,
  });
});

// POST /api/integrations/whatsapp/test
router.post('/whatsapp/test', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { recipient_phone } = req.body;
  const profile = await db.getProfile(userId);
  const { provider, isConnected, status } = await getWhatsAppProviderForUser(userId);

  if (!provider || !isConnected) {
    return res.status(400).json({
      success: false,
      code: 'WHATSAPP_NOT_CONNECTED',
      message: `WhatsApp Business is not connected (current status: ${status}). Connect your account first.`,
    });
  }

  const phone = recipient_phone || profile?.phone;
  if (!phone) {
    return res.status(400).json({
      success: false,
      code: 'MISSING_PHONE',
      message: 'Please provide a test recipient phone number (including country code).',
    });
  }

  const result = await provider.sendTemplateMessage({
    toPhone: phone,
    templateName: 'invoice_payment_reminder',
    variables: {
      clientName: 'Test Client',
      invoiceNumber: 'INV-TEST-001',
      amountFormatted: '₹12,500.00',
      dueDate: new Date().toISOString().split('T')[0],
      daysOverdue: 0,
      businessName: profile?.business_name || profile?.full_name || 'DueFlow Studio',
      paymentLinkOrUpi: profile?.upi_id ? `UPI: ${profile.upi_id}` : 'https://dueflow.in',
    },
  });

  return res.json({
    success: result.success,
    provider: result.provider,
    providerMessageId: result.providerMessageId,
    recipient: phone,
    error: result.errorMessage || result.errorCode,
    message: result.success
      ? `Test transactional WhatsApp reminder successfully dispatched to ${phone}`
      : `Test send failed: ${result.errorMessage}`,
  });
});

// POST /api/integrations/whatsapp/disconnect
router.post('/whatsapp/disconnect', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  await db.deleteIntegration(userId, 'whatsapp_business');

  // If default channel was 'whatsapp' or 'both', fall back to 'email'
  const profile = await db.getProfile(userId);
  if (profile?.default_reminder_channel === 'whatsapp' || profile?.default_reminder_channel === 'both') {
    await db.upsertProfile({
      id: userId,
      email: profile.email,
      default_reminder_channel: 'email',
      whatsapp_reminders_enabled: false,
    });
  }

  return res.json({
    success: true,
    message: 'WhatsApp Business disconnected successfully.',
  });
});

// Helper to render popup callback HTML with cross-origin postMessage
function renderOAuthCallbackHtml(params: {
  success: boolean;
  provider: string;
  displayEmail?: string;
  error?: string;
}): string {
  const safeData = JSON.stringify({
    type: params.success ? 'OAUTH_AUTH_SUCCESS' : 'OAUTH_AUTH_ERROR',
    provider: params.provider,
    email: params.displayEmail || '',
    error: params.error || '',
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${params.success ? 'Connection Successful' : 'Connection Failed'} - DueFlow</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
    .card { background: #1e293b; padding: 32px; border-radius: 12px; border: 1px solid #334155; text-align: center; max-width: 400px; }
    h2 { margin: 0 0 12px; font-size: 20px; color: ${params.success ? '#4ade80' : '#f87171'}; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <h2>${params.success ? '✓ Connected Successfully' : '✕ Connection Failed'}</h2>
    <p>${params.success ? `Connected ${params.displayEmail ? `as ${params.displayEmail}` : ''}. This window will close automatically.` : (params.error || 'Authentication could not be completed.')}</p>
  </div>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage(${safeData}, '*');
        setTimeout(() => {
          window.close();
        }, 800);
      } else {
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      }
    } catch (e) {
      console.error('postMessage error:', e);
    }
  </script>
</body>
</html>`;
}

export default router;
