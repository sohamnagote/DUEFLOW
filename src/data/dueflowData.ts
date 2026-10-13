import { Invoice, Client, ReminderScheduleRule, ReminderQueueItem, EmailTemplateConfig, UserProfile } from '../types';

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'cli-1',
    name: 'Acme Corp',
    email: 'billing@acmecorp.com',
    phone: '+1 (555) 234-5678',
    billingAddress: '450 Mission St, Suite 800, San Francisco, CA 94105',
    internalNotes: 'Net 14 payment terms. Always prefers PDF attached.',
    totalInvoiced: 4800,
    totalOutstanding: 2400,
    invoicesCount: 2,
    createdAt: '2026-09-15',
  },
  {
    id: 'cli-2',
    name: 'Stellar Labs',
    email: 'finance@stellarlabs.io',
    phone: '+1 (555) 876-5432',
    billingAddress: '120 Broadway, Fl 18, New York, NY 10271',
    internalNotes: 'Contact: Sarah Connor. Responds well to gentle morning nudges.',
    totalInvoiced: 7200,
    totalOutstanding: 7200,
    invoicesCount: 1,
    createdAt: '2026-09-20',
  },
  {
    id: 'cli-3',
    name: 'Nexus Studio',
    email: 'accounts@nexusstudio.design',
    phone: '+44 20 7946 0912',
    billingAddress: '14 Clerkenwell Close, London EC1R 0AA',
    internalNotes: 'International wire transfer or UPI. Invoice 000 overdue.',
    totalInvoiced: 3500,
    totalOutstanding: 3500,
    invoicesCount: 1,
    createdAt: '2026-09-28',
  },
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2024-001',
    clientId: 'cli-1',
    clientName: 'Acme Corp',
    clientEmail: 'billing@acmecorp.com',
    amount: 180000,
    currency: 'INR',
    issueDate: '2026-09-25',
    dueDate: '2026-10-11', // due in 2 days
    status: 'pending',
    description: 'Design system tokens & brand identity sprint',
    items: [
      { description: 'Component Library Architecture', quantity: 1, rate: 120000 },
      { description: 'Design Tokens & Documentation', quantity: 1, rate: 60000 },
    ],
    remindersSentCount: 0,
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2024-003',
    clientId: 'cli-2',
    clientName: 'Stellar Labs',
    clientEmail: 'finance@stellarlabs.io',
    amount: 75000,
    currency: 'INR',
    issueDate: '2026-09-09',
    dueDate: '2026-10-09', // due today
    status: 'pending',
    description: 'Q3 Mobile Web Application UX Architecture',
    items: [
      { description: 'Full responsive product flow & wireframing', quantity: 1, rate: 75000 },
    ],
    remindersSentCount: 1,
  },
  {
    id: 'inv-3',
    invoiceNumber: 'INV-2024-000',
    clientId: 'cli-3',
    clientName: 'Nexus Studio',
    clientEmail: 'accounts@nexusstudio.design',
    amount: 3500,
    currency: 'USD',
    issueDate: '2026-09-06',
    dueDate: '2026-10-06', // overdue by 3 days
    status: 'overdue',
    description: 'Brand collateral and stationery print consultation',
    items: [
      { description: 'Editorial typography & exhibition catalog', quantity: 1, rate: 3500 },
    ],
    remindersSentCount: 2,
  },
];

export const INITIAL_SCHEDULE_RULES: ReminderScheduleRule[] = [
  {
    id: 'rule-1',
    label: 'Gentle heads up before due date',
    timing: 'before',
    days: 2,
    tone: 'friendly',
    enabled: true,
  },
  {
    id: 'rule-2',
    label: 'Due date payment reminder',
    timing: 'on_due_date',
    days: 0,
    tone: 'professional',
    enabled: true,
  },
  {
    id: 'rule-3',
    label: 'Overdue follow-up notice',
    timing: 'after',
    days: 3,
    tone: 'firm',
    enabled: true,
  },
];

export const INITIAL_REMINDER_QUEUE: ReminderQueueItem[] = [
  {
    id: 'queue-1',
    clientName: 'Acme Corp',
    invoiceNumber: 'INV-2024-001',
    relativeDueText: 'Due in 2 days',
    scheduledText: 'Scheduled for tomorrow, 9:00 AM',
    status: 'queued',
  },
  {
    id: 'queue-2',
    clientName: 'Stellar Labs',
    invoiceNumber: 'INV-2024-003',
    relativeDueText: 'Due today',
    scheduledText: 'Scheduled for today, 2:00 PM',
    status: 'queued',
  },
  {
    id: 'queue-3',
    clientName: 'Nexus Studio',
    invoiceNumber: 'INV-2024-000',
    relativeDueText: 'Overdue by 3 days',
    scheduledText: 'Sent yesterday',
    status: 'sent',
  },
];

export const INITIAL_TEMPLATES: Record<'friendly' | 'professional' | 'firm', EmailTemplateConfig> = {
  friendly: {
    tone: 'friendly',
    subjectLine: 'Friendly note: Invoice {{invoice_number}} payment reminder',
    emailMessage: `Hi {{client_name}},

Hope you're having a great week!

This is a gentle reminder that invoice {{invoice_number}} for {{total_amount}} is coming up for payment on {{due_date}}.

You can review payment details attached or scan the payment QR code below. Let me know if you have any questions!

Warmly,`,
  },
  professional: {
    tone: 'professional',
    subjectLine: 'Invoice {{invoice_number}} payment reminder',
    emailMessage: `Hi {{client_name}},

This is a reminder that invoice {{invoice_number}} for {{total_amount}} is due on {{due_date}}.

You can review payment details attached or scan the payment QR code.

Thank you,`,
  },
  firm: {
    tone: 'firm',
    subjectLine: 'Payment overdue: Invoice {{invoice_number}}',
    emailMessage: `Dear {{client_name}},

According to our records, payment for invoice {{invoice_number}} totaling {{total_amount}} was due on {{due_date}} and is now overdue.

Please settle the outstanding balance using the payment instructions or QR code attached at your earliest convenience.

Best regards,`,
  },
};

export const INITIAL_USER_PROFILE: UserProfile = {
  fullName: '',
  email: '',
  preferredCurrency: 'INR',
  timezone: '(UTC+00:00) Coordinated Universal Time (London)',
  upiId: '',
  beneficiaryName: '',
  bankName: '',
  accountNumber: '',
  routingNumber: '',
  paymentInstructions: '',
  paymentQrUrl: '',
  gmailConnected: false,
  gmailEmail: undefined,
  automatedRemindersEnabled: true,
  onboardingCompleted: false,
};

