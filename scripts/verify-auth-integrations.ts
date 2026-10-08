import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://127.0.0.1:3000';

async function runTests() {
  console.log('====================================================');
  console.log(' DUEFLOW PRODUCTION AUTH & INTEGRATION VERIFICATION ');
  console.log('====================================================\n');

  const results: Record<string, 'PASS' | 'FAIL'> = {};
  const blockers: string[] = [];

  // 1. Health check
  try {
    const health = await fetch(`${BASE_URL}/api/health`).then(r => r.json());
    console.log('Server Health:', health);
  } catch (err: any) {
    console.error('Server is not responding:', err.message);
    process.exit(1);
  }

  // ----------------------------------------------------
  // TEST: EMAIL SIGNUP & REAL SUPABASE AUTH
  // ----------------------------------------------------
  const testEmail1 = `prod_test_${Date.now()}@example.com`;
  const testPass = 'DueFlow2026!Secure';
  let token1: string = '';
  let userId1: string = '';

  try {
    const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail1,
        password: testPass,
        full_name: 'Soham Nagote',
        business_name: 'DueFlow Agency'
      }),
    });
    const signupData = await signupRes.json();
    if (signupRes.status === 201 && signupData.token && signupData.user?.email === testEmail1) {
      token1 = signupData.token;
      userId1 = signupData.user.id;
      console.log('✓ Email Signup: PASS (Real Supabase User created & JWT returned)');
      results['EMAIL_SIGNUP'] = 'PASS';
    } else {
      console.error('✗ Email Signup: FAIL', signupData);
      results['EMAIL_SIGNUP'] = 'FAIL';
    }
  } catch (err: any) {
    console.error('✗ Email Signup: ERROR', err.message);
    results['EMAIL_SIGNUP'] = 'FAIL';
  }

  // ----------------------------------------------------
  // TEST: EMAIL LOGIN & REAL SUPABASE AUTH
  // ----------------------------------------------------
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail1,
        password: testPass
      }),
    });
    const loginData = await loginRes.json();
    if (loginRes.status === 200 && loginData.token && loginData.user?.email === testEmail1) {
      token1 = loginData.token; // Refresh token
      console.log('✓ Email Login: PASS (Authenticated via Supabase signInWithPassword)');
      results['EMAIL_LOGIN'] = 'PASS';
    } else {
      console.error('✗ Email Login: FAIL', loginData);
      results['EMAIL_LOGIN'] = 'FAIL';
    }
  } catch (err: any) {
    console.error('✗ Email Login: ERROR', err.message);
    results['EMAIL_LOGIN'] = 'FAIL';
  }

  // ----------------------------------------------------
  // TEST: SESSION PERSISTENCE & /api/auth/me
  // ----------------------------------------------------
  try {
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    const meData = await meRes.json();
    if (meRes.status === 200 && meData.user?.email === testEmail1 && meData.user?.id === userId1) {
      console.log('✓ Session Persistence & /me: PASS (User profile loaded from session)');
      results['SESSION'] = 'PASS';
      results['DASHBOARD_EMAIL'] = 'PASS';
    } else {
      console.error('✗ Session Persistence: FAIL', meData);
      results['SESSION'] = 'FAIL';
      results['DASHBOARD_EMAIL'] = 'FAIL';
    }
  } catch (err: any) {
    console.error('✗ Session Persistence: ERROR', err.message);
    results['SESSION'] = 'FAIL';
    results['DASHBOARD_EMAIL'] = 'FAIL';
  }

  // ----------------------------------------------------
  // TEST: LOGOUT
  // ----------------------------------------------------
  try {
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` }
    });
    const logoutData = await logoutRes.json();
    if (logoutRes.status === 200 && logoutData.message === 'Logged out successfully') {
      console.log('✓ Logout: PASS (Session cleared)');
      results['LOGOUT'] = 'PASS';
    } else {
      console.error('✗ Logout: FAIL', logoutData);
      results['LOGOUT'] = 'FAIL';
    }
  } catch (err: any) {
    console.error('✗ Logout: ERROR', err.message);
    results['LOGOUT'] = 'FAIL';
  }

  // ----------------------------------------------------
  // TEST: GOOGLE LOGIN / OAUTH
  // ----------------------------------------------------
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://gekzjptpetwzzmpjyqhb.supabase.co';
  try {
    // Check if Supabase Google provider is enabled
    const googleAuthRes = await fetch(`${supabaseUrl}/auth/v1/authorize?provider=google`);
    const googleAuthData = await googleAuthRes.json().catch(() => ({}));

    if (googleAuthRes.status === 200 || googleAuthRes.status === 302 || (googleAuthRes.url && googleAuthRes.url.includes('accounts.google.com'))) {
      console.log('✓ Google Login Provider: PASS');
      results['GOOGLE_LOGIN'] = 'PASS';
    } else if (googleAuthData.msg?.includes('Unsupported provider') || googleAuthData.error_code === 'validation_failed') {
      console.log('✗ Google Login Provider: FAIL (Provider disabled in Supabase dashboard)');
      results['GOOGLE_LOGIN'] = 'FAIL';
      blockers.push('Supabase Google OAuth provider is not enabled in the Supabase Dashboard (Authentication -> Providers -> Google). Set Client ID, Client Secret, and toggle Enabled to ON.');
    } else {
      console.log('✗ Google Login Provider: FAIL', googleAuthData);
      results['GOOGLE_LOGIN'] = 'FAIL';
      blockers.push(`Supabase Google OAuth returned: ${JSON.stringify(googleAuthData)}`);
    }
  } catch (err: any) {
    console.error('✗ Google Login: ERROR', err.message);
    results['GOOGLE_LOGIN'] = 'FAIL';
    blockers.push(`Google OAuth check failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST: GMAIL CONNECTION (TASK 4)
  // ----------------------------------------------------
  try {
    const gmailRes = await fetch(`${BASE_URL}/api/integrations/email/google/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` }
    });
    const gmailData = await gmailRes.json();
    if (gmailRes.status === 400 && gmailData.code === 'GOOGLE_CREDENTIALS_MISSING') {
      console.log('✓ Gmail Connect: Verified real OAuth flow (Properly rejects with missing credentials, no fake simulation)');
      results['GMAIL'] = 'FAIL';
      blockers.push('Missing GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET for Gmail Mail-Send OAuth. Configure Google Cloud Console OAuth 2.0 Client credentials with scope https://www.googleapis.com/auth/gmail.send and authorized redirect URI: ' + (process.env.APP_BASE_URL || 'http://localhost:3000') + '/api/integrations/email/google/callback');
    } else if (gmailRes.status === 200 && gmailData.url) {
      console.log('✓ Gmail Connect: PASS (Real Google OAuth URL generated)');
      results['GMAIL'] = 'PASS';
    } else {
      console.log('✗ Gmail Connect: FAIL', gmailData);
      results['GMAIL'] = 'FAIL';
    }
  } catch (err: any) {
    console.error('✗ Gmail Connect: ERROR', err.message);
    results['GMAIL'] = 'FAIL';
  }

  // ----------------------------------------------------
  // TEST: OUTLOOK CONNECTION (TASK 4)
  // ----------------------------------------------------
  try {
    const msRes = await fetch(`${BASE_URL}/api/integrations/email/microsoft/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` }
    });
    const msData = await msRes.json();
    if (msRes.status === 400 && msData.code === 'MICROSOFT_CREDENTIALS_MISSING') {
      console.log('✓ Outlook Connect: Verified real OAuth flow (Properly rejects with missing credentials, no fake simulation)');
      results['OUTLOOK'] = 'FAIL';
      blockers.push('Missing MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET for Outlook Microsoft Graph OAuth. Configure Azure App Registration with Mail.Send permission and redirect URI: ' + (process.env.APP_BASE_URL || 'http://localhost:3000') + '/api/integrations/email/microsoft/callback');
    } else if (msRes.status === 200 && msData.url) {
      console.log('✓ Outlook Connect: PASS (Real Microsoft OAuth URL generated)');
      results['OUTLOOK'] = 'PASS';
    } else {
      console.log('✗ Outlook Connect: FAIL', msData);
      results['OUTLOOK'] = 'FAIL';
    }
  } catch (err: any) {
    console.error('✗ Outlook Connect: ERROR', err.message);
    results['OUTLOOK'] = 'FAIL';
  }

  // ----------------------------------------------------
  // TEST: WHATSAPP CONNECTION (TASK 5)
  // ----------------------------------------------------
  try {
    // Attempt verification with invalid/fake credentials
    const waRes = await fetch(`${BASE_URL}/api/integrations/whatsapp/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`
      },
      body: JSON.stringify({
        phone_number_id: 'fake_12345678',
        waba_id: 'fake_waba_1234',
        access_token: 'EAABfake_token',
        sender_phone: '+919999999999',
        business_name: 'DueFlow Test'
      })
    });
    const waData = await waRes.json();
    if (waRes.status === 400 && waData.error?.includes('Meta Cloud API rejected')) {
      console.log('✓ WhatsApp Verification: Verified live Meta API check (Rejects invalid credentials, never marks fake CONNECTED)');
      results['WHATSAPP'] = 'FAIL';
      blockers.push('Missing valid Meta WhatsApp Business Cloud API credentials. Required from Meta developer portal: Phone Number ID, WhatsApp Business Account ID (WABA ID), and System User Permanent Access Token with whatsapp_business_messaging permissions.');
    } else {
      console.log('✗ WhatsApp Verification: FAIL', waData);
      results['WHATSAPP'] = 'FAIL';
    }
  } catch (err: any) {
    console.error('✗ WhatsApp Verification: ERROR', err.message);
    results['WHATSAPP'] = 'FAIL';
  }

  // ----------------------------------------------------
  // TEST: RLS & SECURITY (TASK 8)
  // ----------------------------------------------------
  try {
    // Create second user
    const testEmail2 = `tenant2_${Date.now()}@example.com`;
    const signup2Res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail2,
        password: testPass,
        full_name: 'Second Tenant'
      })
    });
    const signup2Data = await signup2Res.json();
    const token2 = signup2Data.token;

    // Tenant 1 creates a client and an invoice
    const createClientRes = await fetch(`${BASE_URL}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`
      },
      body: JSON.stringify({
        name: 'Secret Client User 1',
        email: 'secret@client1.com',
        phone: '+1234567890'
      })
    });
    const client1Data = await createClientRes.json();

    // Tenant 2 requests clients
    const getClients2Res = await fetch(`${BASE_URL}/api/clients`, {
      headers: { Authorization: `Bearer ${token2}` }
    });
    const clients2Data = await getClients2Res.json();

    // Tenant 2 attempts to fetch Tenant 1's client
    const clientLeak = clients2Data.clients?.some((c: any) => c.id === client1Data.client?.id);

    // Tenant 2 requests integrations
    const getIntegrations2Res = await fetch(`${BASE_URL}/api/integrations`, {
      headers: { Authorization: `Bearer ${token2}` }
    });
    const integrations2Data = await getIntegrations2Res.json();

    // Verify secrets are never in integration response
    const hasSecretLeak = integrations2Data.integrations?.some((i: any) => i.access_token || i.refresh_token || i.credentials?.access_token);

    if (!clientLeak && !hasSecretLeak) {
      console.log('✓ Multi-Tenant RLS & Security: PASS (Tenant 2 cannot see Tenant 1 data; no tokens returned to frontend)');
      results['RLS_SECURITY'] = 'PASS';
    } else {
      console.error('✗ Multi-Tenant RLS & Security: FAIL', { clientLeak, hasSecretLeak });
      results['RLS_SECURITY'] = 'FAIL';
    }
  } catch (err: any) {
    console.error('✗ Multi-Tenant RLS & Security: ERROR', err.message);
    results['RLS_SECURITY'] = 'FAIL';
  }

  console.log('\n====================================================');
  console.log('SUMMARY RESULTS:');
  console.log(results);
  console.log('\nBLOCKERS:');
  blockers.forEach(b => console.log('-', b));
  console.log('====================================================\n');
}

runTests();
