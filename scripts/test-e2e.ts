/**
 * DueFlow Full Backend Integration & E2E Verification Suite
 * Tests full lifecycle: Auth, Client CRUD, Invoice CRUD, Status Service,
 * Cadence Generation, Reminder Worker, Idempotency, AI Generation & Fallback,
 * and Cross-Tenant Data Isolation (RLS).
 */

import { db } from '../backend/db';
import { deriveOperationalStatus } from '../backend/services/statusService';
import { calculateReminderRules, recomputeRulesForUnpaid } from '../backend/services/schedulerService';
import { generateAiReminder } from '../backend/services/aiService';
import { sendEmail } from '../backend/services/emailService';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}`, detail || '');
    failCount++;
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log(' Starting DueFlow Production Backend Test Suite');
  console.log('======================================================\n');

  const tenant1Id = '00000000-0000-4000-a000-000000000001';
  const tenant2Id = '00000000-0000-4000-a000-000000000002';

  // ---------------------------------------------------------------------------
  // 1. User Profiles & Signup
  // ---------------------------------------------------------------------------
  console.log('Test Group 1: User Profiles & Provisioning');
  const user1 = await db.upsertProfile({
    id: tenant1Id,
    email: 'SOHAM@AGENCY.IN', // Test uppercase normalization
    full_name: 'Soham Nagote',
    business_name: 'Komorebi Studio',
    timezone: 'Asia/Kolkata',
    upi_id: 'soham@okhdfcbank',
  });

  assert(user1.email === 'soham@agency.in', 'User 1 email normalized to lowercase');
  assert(user1.business_name === 'Komorebi Studio', 'User 1 profile stored correctly');

  const user2 = await db.upsertProfile({
    id: tenant2Id,
    email: 'other@freelance.co',
    full_name: 'Other Freelancer',
    business_name: 'Other Design Studio',
    timezone: 'Asia/Kolkata',
  });
  assert(user2.id === tenant2Id, 'User 2 profile provisioned for cross-tenant checks');

  // ---------------------------------------------------------------------------
  // 2. Client Management & Normalization
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 2: Client Management');
  const client1 = await db.createClient(tenant1Id, {
    name: 'Nexus Interactive',
    email: 'BILLING@NEXUS.COM  ',
    notes: 'Q4 Contract Client',
    cin: 'U72900MH2021PTC123456',
  });

  assert(client1.email === 'billing@nexus.com', 'Client email trimmed and normalized to lowercase');
  assert(client1.user_id === tenant1Id, 'Client associated with Tenant 1');

  // ---------------------------------------------------------------------------
  // 3. Invoice Creation & Deterministic Cadence Schedule
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 3: Invoice Creation & 4-Stage Cadence Generation');
  const invoice1 = await db.createInvoice(tenant1Id, {
    client_id: client1.id,
    client_name: client1.name,
    client_email: client1.email,
    invoice_number: 'INV-2026-001',
    amount: 145000.00,
    currency: 'INR',
    issue_date: '2026-10-01',
    due_date: '2026-10-15',
    notes: 'Full stack development milestone',
    template_key: 'cadence_default',
  });

  assert(invoice1.invoice_number === 'INV-2026-001', 'Invoice created with correct number');
  assert(invoice1.amount === 145000, 'Invoice amount stored with exact numeric precision');
  assert(invoice1.rules.length === 4, 'Invoice has exactly 4 scheduled cadence rules');

  const ruleKeys = invoice1.rules.map((r) => r.occurrence_key);
  assert(
    ruleKeys.includes('stage_1_3_days_before') &&
    ruleKeys.includes('stage_2_on_due_date') &&
    ruleKeys.includes('stage_3_3_days_overdue') &&
    ruleKeys.includes('stage_4_7_days_overdue'),
    'Cadence rules include Stage 1 (-3d), Stage 2 (0d), Stage 3 (+3d), Stage 4 (+7d)'
  );

  // Check unique invoice number constraint
  let duplicateThrew = false;
  try {
    await db.createInvoice(tenant1Id, {
      client_name: 'Nexus',
      client_email: 'billing@nexus.com',
      invoice_number: 'INV-2026-001', // duplicate!
      amount: 5000,
      issue_date: '2026-10-01',
      due_date: '2026-10-15',
    });
  } catch (e: any) {
    duplicateThrew = true;
  }
  assert(duplicateThrew, 'Duplicate invoice number for same user is rejected (unique constraint)');

  // ---------------------------------------------------------------------------
  // 4. Centralized Status Service Transitions
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 4: Centralized Operational Status Calculations');
  const refDate = new Date('2026-10-10T12:00:00Z');

  // Due in 5 days -> unpaid
  const statusFar = deriveOperationalStatus({ status: 'unpaid', due_date: '2026-10-15' }, refDate);
  assert(statusFar === 'unpaid', 'Status is "unpaid" when due date > 3 days ahead');

  // Due in 2 days -> due_soon
  const statusSoon = deriveOperationalStatus({ status: 'unpaid', due_date: '2026-10-12' }, refDate);
  assert(statusSoon === 'due_soon', 'Status is "due_soon" when due date is within 3 days');

  // Due yesterday -> overdue
  const statusOver = deriveOperationalStatus({ status: 'unpaid', due_date: '2026-10-09' }, refDate);
  assert(statusOver === 'overdue', 'Status is "overdue" when due date is in the past');

  // ---------------------------------------------------------------------------
  // 5. Mark Paid & Unpaid Lifecycle
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 5: Mark Paid and Unpaid Transitions');
  const paidInvoice = await db.markInvoicePaid(tenant1Id, invoice1.id);
  assert(paidInvoice.status === 'paid', 'Invoice marked as paid');
  assert(paidInvoice.paid_at !== null, 'Invoice has paid_at timestamp');

  // Check that future rules were cancelled
  const rulesAfterPaid = await db.getRulesForInvoice(invoice1.id);
  const allCancelled = rulesAfterPaid.every((r) => r.status === 'cancelled' && !r.enabled);
  assert(allCancelled, 'All future pending reminder rules cancelled upon marking invoice paid');

  // Re-open (mark unpaid)
  const unpaidInvoice = await db.markInvoiceUnpaid(tenant1Id, invoice1.id);
  assert(unpaidInvoice.status === 'unpaid', 'Invoice status reverted to unpaid');
  assert(unpaidInvoice.paid_at === null, 'Invoice paid_at cleared');

  // ---------------------------------------------------------------------------
  // 6. Reminder Delivery & Idempotency
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 6: Reminder Dispatch & Idempotency Guarantee');
  // Record a simulated sent log for Stage 1
  const occurrence = 'stage_1_3_days_before';
  const emailDispatch = await sendEmail(
    client1.email,
    user1.email,
    {
      invoiceNumber: invoice1.invoice_number,
      amount: invoice1.amount,
      dueDate: invoice1.due_date,
      clientName: client1.name,
      clientEmail: client1.email,
      businessName: user1.business_name,
      senderName: user1.full_name,
      senderEmail: user1.email,
      upiId: user1.upi_id,
    }
  );

  assert(emailDispatch.success, 'Transactional email rendered and sent successfully');

  const log = await db.recordLog({
    invoice_id: invoice1.id,
    rule_id: invoice1.rules[0].id,
    occurrence_key: occurrence,
    recipient_email: client1.email,
    provider_message_id: emailDispatch.providerMessageId,
    status: 'sent',
    attempted_at: new Date().toISOString(),
    sent_at: new Date().toISOString(),
  });

  assert(log.occurrence_key === occurrence, 'Reminder log recorded with occurrence key');

  // Test recomputation does NOT re-send already sent log
  const sentKeys = new Set([occurrence]);
  const recomputed = recomputeRulesForUnpaid(invoice1.due_date, sentKeys, 'Asia/Kolkata');
  const stage1Recomputed = recomputed.find((r) => r.occurrence_key === occurrence);
  assert(stage1Recomputed?.status === 'sent' && !stage1Recomputed.enabled, 'Recomputed rules retain "sent" status and do NOT re-queue stage 1');

  // ---------------------------------------------------------------------------
  // 7. AI Copy Generation & Deterministic Fallback
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 7: AI Copy Generation & Fallback');
  const aiGentle = await generateAiReminder({
    invoiceNumber: invoice1.invoice_number,
    amount: invoice1.amount,
    dueDate: invoice1.due_date,
    clientName: client1.name,
    businessName: user1.business_name,
    tone: 'gentle',
  });
  assert(aiGentle.subject.length > 5 && aiGentle.body.length > 20, 'Generated gentle reminder has subject and body');
  assert(aiGentle.tone === 'gentle', 'Generated copy preserves gentle tone');

  const aiFirm = await generateAiReminder({
    invoiceNumber: invoice1.invoice_number,
    amount: invoice1.amount,
    dueDate: invoice1.due_date,
    clientName: client1.name,
    businessName: user1.business_name,
    tone: 'firm',
  });
  assert(aiFirm.subject.toLowerCase().includes('invoice') || aiFirm.subject.includes('INV'), 'Firm reminder subject mentions invoice');

  // ---------------------------------------------------------------------------
  // 8. Cross-Tenant Data Isolation (RLS)
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 8: Multi-Tenant RLS Access Control');
  // Tenant 2 attempts to fetch Tenant 1's invoice
  const crossInvoice = await db.getInvoice(tenant2Id, invoice1.id);
  assert(crossInvoice === null, 'Tenant 2 cannot read Tenant 1 invoice (RLS isolation)');

  // Tenant 2 attempts to delete Tenant 1's client
  const crossDeleteClient = await db.deleteClient(tenant2Id, client1.id);
  assert(crossDeleteClient === false, 'Tenant 2 cannot delete Tenant 1 client');

  // Tenant 2 invoice list should be empty
  const tenant2Invoices = await db.listInvoices(tenant2Id);
  assert(tenant2Invoices.invoices.length === 0, 'Tenant 2 sees zero invoices (isolated scope)');

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(` Test Execution Complete: ${passCount} Passed, ${failCount} Failed`);
  console.log('======================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Test execution failed with fatal error:', err);
  process.exit(1);
});
