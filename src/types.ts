export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'draft' | 'cancelled';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId?: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  description: string;
  items?: { description: string; quantity: number; rate: number }[];
  remindersSentCount?: number;
  followUpStatus?: string;
  follow_up_status?: string;
  lastReplySnippet?: string;
  last_reply_snippet?: string;
  lastReplyClassification?: string;
  last_reply_classification?: string;
  lastReplyAt?: string;
  last_reply_at?: string;
  gmailThreadId?: string;
  gmail_thread_id?: string;
  responseToken?: string;
  response_token?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  billingAddress?: string;
  internalNotes?: string;
  totalInvoiced: number;
  totalOutstanding: number;
  invoicesCount: number;
  createdAt: string;
  preferredTone?: 'FRIENDLY' | 'PROFESSIONAL' | 'FIRM' | 'friendly' | 'professional' | 'firm' | string;
  preferred_tone?: string;
  reminderTone?: 'FRIENDLY' | 'PROFESSIONAL' | 'FIRM' | string;
  reminder_tone?: string;
  preferredChannel?: 'EMAIL' | 'email' | string;
  preferred_channel?: string;
  timezone?: string;
  allowedDays?: string[] | string;
  allowed_days?: string[] | string;
  communicationWindowStart?: string;
  communication_window_start?: string;
  communicationWindowEnd?: string;
  communication_window_end?: string;
  quietHoursStart?: string;
  quiet_hours_start?: string;
  quietHoursEnd?: string;
  quiet_hours_end?: string;
  automatedRemindersEnabled?: boolean;
  automated_reminders_enabled?: boolean;
  communicationNotes?: string;
  communication_notes?: string;
}

export interface ClientResponse {
  id: string;
  invoiceId: string;
  userId: string;
  clientId?: string;
  responseType: 'PAYMENT_REPORTED' | 'NEED_MORE_TIME' | 'QUESTION' | 'CORRECTION_REQUESTED' | string;
  responseText?: string;
  proposedPaymentDate?: string;
  reviewStatus: 'PENDING_REVIEW' | 'RESOLVED' | 'DISMISSED' | string;
  clientEmail?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface PublicInvoiceView {
  invoiceNumber: string;
  businessName: string;
  clientName: string;
  totalAmount: number;
  currency: string;
  dueDate: string;
  issueDate: string;
  paymentInstructions?: string;
  status: string;
  followUpStatus?: string;
}


export interface ReminderScheduleRule {
  id: string;
  label: string;
  timing: 'before' | 'on_due_date' | 'after';
  days: number;
  tone: 'friendly' | 'professional' | 'firm';
  enabled: boolean;
  sendTime?: string;
  timezone?: string;
  invoiceId?: string;
}

export interface ReminderQueueItem {
  id: string;
  invoiceId?: string;
  clientName: string;
  invoiceNumber: string;
  relativeDueText: string;
  scheduledText: string;
  status: 'queued' | 'sent' | 'paused';
}

export interface ReminderHistoryItem {
  id: string;
  scheduledReminderId?: string;
  invoiceId: string;
  recipientEmail: string;
  subject: string;
  status: 'SENT' | 'FAILED';
  providerMessageId?: string;
  errorCategory?: string;
  errorMessage?: string;
  attemptedAt: string;
}

export interface EmailTemplateConfig {
  tone: 'friendly' | 'professional' | 'firm';
  subjectLine: string;
  emailMessage: string;
}

export interface UserProfile {
  fullName: string;
  email: string;
  preferredCurrency: 'INR' | 'USD';
  timezone: string;
  upiId: string;
  beneficiaryName: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  paymentInstructions: string;
  paymentQrUrl: string | null;
  gmailConnected: boolean;
  gmailEmail?: string;
  gmailStatus?: 'connected' | 'reconnect_required' | 'disconnected' | 'unavailable';
  automatedRemindersEnabled: boolean;
  onboardingCompleted: boolean;
  // Invoice branding
  businessName?: string;
  logoUrl?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: string;
  brandColor?: string;
  footerTerms?: string;
}

export interface InvoiceCsvRow {
  invoiceNumber?: string;
  clientName: string;
  clientEmail?: string;
  amount: number;
  currency?: string;
  issueDate?: string;
  dueDate?: string;
  status?: string;
  description?: string;
}

export interface InvoiceImportResult {
  importedCount: number;
  failedCount: number;
  errors: string[];
  importedInvoices: Invoice[];
}

export interface DashboardSummary {
  totalInvoices: number;
  unpaidInvoices: number;
  overdueInvoices: number;
  paidInvoices: number;
  totalClients: number;
  upcomingReminders: number;
  failedReminders: number;
  totalOutstandingByCurrency: Record<string, number>;
  totalCollectedByCurrency: Record<string, number>;
}

export interface SubjectLineOption {
  text: string;
  type: string;
  preheader: string;
  openRateScore: number;
  rationale: string;
}

export interface CtaConfig {
  label: string;
  url: string;
  style?: string;
}

export interface SpamAnalysis {
  score: number;
  rating: 'Clean' | 'Low Risk' | 'Moderate' | 'High Risk';
  tips: string[];
}

export interface Campaign {
  id: string;
  campaignTitle: string;
  campaignTheme: string;
  prompt: string;
  audienceSummary: string;
  industry: string;
  tone: string;
  goal: string;
  subjectLines: SubjectLineOption[];
  selectedSubjectIndex: number;
  headline: string;
  subheadline: string;
  bodyMarkdown: string;
  bodyHtml: string;
  primaryCta: CtaConfig;
  secondaryCta: CtaConfig;
  imagePrompt: string;
  imageUrl?: string;
  imageSize?: '1K' | '2K' | '4K';
  aspectRatio?: '16:9' | '1:1' | '4:3' | '9:16' | '3:4';
  visualStyleDescriptor: string;
  keyTakeaways: string[];
  spamScoreAnalysis: SpamAnalysis;
  sendTimeRecommendation: string;
  abTestRecommendation: string;
  createdAt: string;
  layoutTemplate?: 'editorial-minimal' | 'modern-card' | 'artisan-split' | 'newsletter-digest';
}

export type ChatRole = 'complex' | 'general' | 'fast';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  modelUsed?: string;
  roleUsed?: ChatRole;
}
