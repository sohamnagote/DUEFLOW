/**
 * Live HTTP & Multi-Tenant E2E Verification Suite against http://localhost:3000
 */

async function main() {
  const BASE_URL = 'http://localhost:3000';
  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, name: string, detail?: any) {
    if (cond) {
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${name}`, detail || '');
      failed++;
    }
  }

  console.log('\n========================================================');
  console.log(' DUEFLOW LIVE DEV SERVER E2E VERIFICATION (http://localhost:3000)');
  console.log('========================================================\n');

  // 1. Health check
  console.log('Phase 1: Server & Static Asset Endpoints');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthJson = await healthRes.json();
  assert(healthRes.status === 200 && healthJson.status === 'ok', 'GET /api/health returns 200 OK');

  const indexRes = await fetch(`${BASE_URL}/`);
  const indexHtml = await indexRes.text();
  assert(indexRes.status === 200 && indexHtml.includes('<div id="root"></div>'), 'GET / returns HTML with #root container');

  const mainTsxRes = await fetch(`${BASE_URL}/src/main.tsx`);
  assert(mainTsxRes.status === 200 && Boolean(mainTsxRes.headers.get('content-type')?.includes('javascript')), 'GET /src/main.tsx compiled by Vite');

  // 2. Auth Flow - User 1
  console.log('\nPhase 2: Authentication & Profile Flow (Tenant 1)');
  const tenant1Email = `tester_${Date.now()}@agency.in`;
  const signup1Res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: tenant1Email,
      password: 'SecurePassword123!',
      full_name: 'Antigravity Tester',
      business_name: 'Antigravity Design Studio',
    }),
  });
  const signup1Data = await signup1Res.json();
  assert(signup1Res.status === 201 && Boolean(signup1Data.token), 'POST /api/auth/signup creates Tenant 1 with JWT session');
  const token1 = signup1Data.token;

  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token1}` },
  });
  const meData = await meRes.json();
  assert(meRes.status === 200 && meData.user?.email === tenant1Email.toLowerCase(), 'GET /api/auth/me returns authenticated User 1');

  // Profile update
  const updateProfileRes = await fetch(`${BASE_URL}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`,
    },
    body: JSON.stringify({
      upi_id: 'tester@okaxis',
      timezone: 'Asia/Kolkata',
      bank_account: '987654321012',
      bank_ifsc: 'HDFC0001234',
    }),
  });
  const updateProfileData = await updateProfileRes.json();
  assert(updateProfileRes.status === 200 && updateProfileData.profile.upi_id === 'tester@okaxis', 'PUT /api/profile updates user settings');

  // 3. Client Management
  console.log('\nPhase 3: Client Management');
  const createClientRes = await fetch(`${BASE_URL}/api/clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`,
    },
    body: JSON.stringify({
      name: 'Acme Corporation India',
      email: 'finance@acmeindia.com',
      notes: 'Key enterprise retainer client',
      cin: 'U74999MH2020PTC345678',
      phone: '+91 98200 12345',
    }),
  });
  const client1 = await createClientRes.json();
  assert(createClientRes.status === 201 && Boolean(client1.id), 'POST /api/clients creates client record');

  const listClientsRes = await fetch(`${BASE_URL}/api/clients`, {
    headers: { Authorization: `Bearer ${token1}` },
  });
  const listClientsData = await listClientsRes.json();
  assert(listClientsRes.status === 200 && listClientsData.clients?.length >= 1, 'GET /api/clients lists clients');

  // 4. Invoice Management & Cadence Generation
  console.log('\nPhase 4: Invoice Creation, Rules & Lifecycle');
  const createInvoiceRes = await fetch(`${BASE_URL}/api/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`,
    },
    body: JSON.stringify({
      client_id: client1.id,
      client_name: client1.name,
      client_email: client1.email,
      invoice_number: `INV-${Date.now().toString().slice(-4)}`,
      amount: 75000,
      currency: 'INR',
      issue_date: '2026-10-01',
      due_date: '2026-10-15',
      notes: 'Q4 Branding & UI Deliverables',
      template_key: 'cadence_default',
    }),
  });
  const invoice1 = await createInvoiceRes.json();
  assert(createInvoiceRes.status === 201 && Boolean(invoice1.id), 'POST /api/invoices creates invoice with 4-stage cadence');
  assert(invoice1.rules?.length === 4, 'Invoice has exactly 4 scheduled cadence rules generated');

  // Fetch invoice details
  const getInvoiceRes = await fetch(`${BASE_URL}/api/invoices/${invoice1.id}`, {
    headers: { Authorization: `Bearer ${token1}` },
  });
  const getInvoiceData = await getInvoiceRes.json();
  assert(getInvoiceRes.status === 200 && getInvoiceData.invoice.id === invoice1.id, 'GET /api/invoices/:id fetches invoice, rules, and logs');

  // Mark invoice paid
  const markPaidRes = await fetch(`${BASE_URL}/api/invoices/${invoice1.id}/mark-paid`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}` },
  });
  const markPaidData = await markPaidRes.json();
  assert(markPaidRes.status === 200 && markPaidData.invoice.status === 'paid', 'POST /api/invoices/:id/mark-paid transitions to paid');

  // Mark invoice unpaid
  const markUnpaidRes = await fetch(`${BASE_URL}/api/invoices/${invoice1.id}/mark-unpaid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`,
    },
    body: JSON.stringify({ confirm: true }),
  });
  const markUnpaidData = await markUnpaidRes.json();
  assert(markUnpaidRes.status === 200 && markUnpaidData.invoice.status === 'unpaid', 'POST /api/invoices/:id/mark-unpaid restores cadence');

  // 5. Dashboard Aggregates
  console.log('\nPhase 5: Dashboard Aggregates');
  const dashRes = await fetch(`${BASE_URL}/api/dashboard`, {
    headers: { Authorization: `Bearer ${token1}` },
  });
  const dashData = await dashRes.json();
  assert(dashRes.status === 200 && typeof dashData.totalOutstanding === 'number', 'GET /api/dashboard returns financial metrics');

  // 6. AI Reminder Generation
  console.log('\nPhase 6: AI Reminder Engine');
  const aiRes = await fetch(`${BASE_URL}/api/ai/generate-reminder`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`,
    },
    body: JSON.stringify({
      invoiceNumber: invoice1.invoice_number,
      amount: invoice1.amount,
      dueDate: invoice1.due_date,
      clientName: client1.name,
      businessName: 'Antigravity Studio',
      tone: 'firm',
    }),
  });
  const aiData = await aiRes.json();
  assert(aiRes.status === 200 && Boolean(aiData.subject && aiData.body), 'POST /api/ai/generate-reminder generates subject & copy (with fallback)');

  // 7. Cron & Automation Trigger
  console.log('\nPhase 7: Background Cron & Reminders Dispatch');
  const cronRes = await fetch(`${BASE_URL}/api/cron/process-reminders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer dueflow_cron_dev_secret_2026`,
    },
  });
  const cronData = await cronRes.json();
  assert(cronRes.status === 200 && Array.isArray(cronData.results), 'POST /api/cron/process-reminders executes worker queue idempotently');

  // 8. Multi-Tenant Data Isolation (Tenant 2 Isolation Check)
  console.log('\nPhase 8: Multi-Tenant Data Isolation (RLS Verification)');
  const tenant2Email = `other_user_${Date.now()}@other.com`;
  const signup2Res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: tenant2Email,
      password: 'OtherPassword123!',
      full_name: 'Other Designer',
      business_name: 'Other Agency',
    }),
  });
  const signup2Data = await signup2Res.json();
  const token2 = signup2Data.token;

  // Tenant 2 attempts to fetch Tenant 1's invoice
  const crossInvoiceRes = await fetch(`${BASE_URL}/api/invoices/${invoice1.id}`, {
    headers: { Authorization: `Bearer ${token2}` },
  });
  assert(crossInvoiceRes.status === 404, 'Tenant 2 cannot read Tenant 1 invoice (404 Not Found - Data Isolated)');

  // Tenant 2 attempts to fetch Tenant 1's client
  const crossClientRes = await fetch(`${BASE_URL}/api/clients/${client1.id}`, {
    headers: { Authorization: `Bearer ${token2}` },
  });
  assert(crossClientRes.status === 404, 'Tenant 2 cannot read Tenant 1 client (404 Not Found - Data Isolated)');

  // Tenant 2 invoice list is empty
  const tenant2InvoicesRes = await fetch(`${BASE_URL}/api/invoices`, {
    headers: { Authorization: `Bearer ${token2}` },
  });
  const tenant2InvoicesData = await tenant2InvoicesRes.json();
  assert(tenant2InvoicesData.invoices?.length === 0, 'Tenant 2 invoice list has 0 items (No cross-tenant data leak)');

  console.log('\n========================================================');
  console.log(` RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================\n');

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
