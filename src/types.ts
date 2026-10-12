export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'draft';

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
  automatedRemindersEnabled: boolean;
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
