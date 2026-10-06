import { GoogleGenAI, Type } from '@google/genai';
import { config } from '../config';

export type ReminderTone = 'gentle' | 'professional' | 'firm' | 'urgent';

export interface AiReminderInput {
  invoiceNumber: string;
  amount: number | string;
  dueDate: string;
  clientName: string;
  businessName?: string;
  senderName?: string;
  tone: ReminderTone;
  daysDiff?: number; // negative: before due date, 0: on due date, positive: overdue
}

export interface AiReminderOutput {
  subject: string;
  body: string;
  tone: ReminderTone;
  modelUsed: string;
  isFallback: boolean;
}

// Deterministic fallback templates to guarantee continuous delivery even during offline/AI outage
function getDeterministicFallback(input: AiReminderInput): { subject: string; body: string } {
  const formattedAmount = `INR ${Number(input.amount).toLocaleString('en-IN')}`;
  const sender = input.businessName || input.senderName || 'our team';

  switch (input.tone) {
    case 'gentle':
      return {
        subject: `Friendly check-in: Invoice #${input.invoiceNumber} (${formattedAmount})`,
        body: `Hi ${input.clientName},\n\nI hope you're having a productive week! Just sending a gentle reminder regarding invoice #${input.invoiceNumber} for ${formattedAmount}, due on ${input.dueDate}.\n\nPlease let us know if you need any additional invoice copies or settlement details. Thank you!`,
      };
    case 'firm':
      return {
        subject: `ACTION REQUIRED: Overdue invoice #${input.invoiceNumber} (${formattedAmount})`,
        body: `Dear ${input.clientName},\n\nOur records show that invoice #${input.invoiceNumber} for ${formattedAmount} was due on ${input.dueDate} and remains unsettled.\n\nPrompt payment is required to maintain good standing and uninterrupted service delivery. Please remit payment via bank transfer or UPI today.`,
      };
    case 'urgent':
      return {
        subject: `FINAL NOTICE: Immediate settlement required for invoice #${input.invoiceNumber}`,
        body: `Dear ${input.clientName},\n\nInvoice #${input.invoiceNumber} (${formattedAmount}) is now significantly past due. Despite prior reminders, payment has not been received.\n\nPlease process this payment immediately or contact us directly today to confirm transaction details.`,
      };
    case 'professional':
    default:
      return {
        subject: `Payment reminder: Invoice #${input.invoiceNumber} due ${input.dueDate}`,
        body: `Dear ${input.clientName},\n\nThis is a courtesy reminder regarding invoice #${input.invoiceNumber} for the amount of ${formattedAmount}, due on ${input.dueDate}.\n\nThank you for your prompt attention to this matter.`,
      };
  }
}

let aiClient: GoogleGenAI | null = null;
if (config.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err);
  }
}

export async function generateAiReminder(input: AiReminderInput): Promise<AiReminderOutput> {
  const model = config.GEMINI_MODEL || 'gemini-3.8-flash';

  const isPlaceholderKey = !config.GEMINI_API_KEY || 
    config.GEMINI_API_KEY.includes('MY_GEMINI_API_KEY') || 
    config.GEMINI_API_KEY.includes('your_gemini_api_key');

  if (!aiClient || isPlaceholderKey) {
    const fallback = getDeterministicFallback(input);
    return {
      ...fallback,
      tone: input.tone,
      modelUsed: 'deterministic-fallback',
      isFallback: true,
    };
  }

  try {
    const prompt = `
You are the AI reminder engine for DueFlow, an India-first automated invoice follow-up SaaS for freelancers and boutique businesses.
Draft an email subject and body copy for the following invoice reminder:
- Client Name: ${input.clientName}
- Sender / Business: ${input.businessName || input.senderName || 'Freelance Professional'}
- Invoice Number: #${input.invoiceNumber}
- Amount: INR ${input.amount}
- Due Date: ${input.dueDate}
- Desired Tone: ${input.tone}
${input.daysDiff !== undefined ? `- Timeline Status: ${input.daysDiff < 0 ? `${Math.abs(input.daysDiff)} days before due date` : input.daysDiff === 0 ? 'Due today' : `${input.daysDiff} days overdue`}` : ''}

Rules:
1. Currency is INR.
2. Tone must strictly match '${input.tone}'.
3. Do not include markdown codeblocks or placeholder brackets in the output text.
4. Keep the email concise, professional, clear, and action-oriented.
    `;

    // Timeout after 2.5 seconds to guarantee resilient response
    let timerHandle: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timerHandle = setTimeout(() => reject(new Error('AI generation timed out')), 2500);
      timerHandle.unref?.();
    });

    const generatePromise = aiClient.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            body: { type: Type.STRING },
            tone: { type: Type.STRING },
          },
          required: ['subject', 'body', 'tone'],
        },
      },
    }).finally(() => {
      if (timerHandle) clearTimeout(timerHandle);
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);

    const text = response.text?.trim();
    if (!text) {
      throw new Error('Empty AI response');
    }

    const parsed = JSON.parse(text);
    return {
      subject: parsed.subject || getDeterministicFallback(input).subject,
      body: parsed.body || getDeterministicFallback(input).body,
      tone: input.tone,
      modelUsed: model,
      isFallback: false,
    };
  } catch (err) {
    console.warn(`[AI Service Fallback triggered]:`, err);
    const fallback = getDeterministicFallback(input);
    return {
      ...fallback,
      tone: input.tone,
      modelUsed: model,
      isFallback: true,
    };
  }
}
