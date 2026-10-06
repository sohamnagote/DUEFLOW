import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const validateRequest = (schema: { body?: ZodSchema; query?: ZodSchema; params?: ZodSchema }) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.params) {
        req.params = (await schema.params.parseAsync(req.params)) as any;
      }
      if (schema.query) {
        req.query = (await schema.query.parseAsync(req.query)) as any;
      }
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const issues = err.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        return res.status(400).json({
          error: 'Validation failed',
          details: issues,
        });
      }
      return res.status(400).json({ error: 'Malformed request payload' });
    }
  };
};

// Date regex YYYY-MM-DD
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createInvoiceSchema = z.object({
  client_id: z.string().uuid().optional().nullable(),
  client_name: z.string().min(1, 'Client name is required').max(150, 'Client name too long'),
  client_email: z.string().email('Invalid client email address').max(254),
  invoice_number: z.string().min(1, 'Invoice number required').max(50, 'Invoice number too long'),
  amount: z.coerce.number()
    .positive('Amount must be greater than 0')
    .max(100000000, 'Amount cannot exceed INR 100,000,000')
    .refine((val) => Number(val.toFixed(2)) === val, {
      message: 'Amount cannot exceed 2 decimal places',
    }),
  currency: z.literal('INR').default('INR'),
  issue_date: z.string().regex(dateRegex, 'Issue date must be YYYY-MM-DD'),
  due_date: z.string().regex(dateRegex, 'Due date must be YYYY-MM-DD'),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional().default(''),
  template_key: z.enum(['cadence_default', 'gentle', 'firm', 'urgent']).default('cadence_default'),
  reminders_enabled: z.boolean().default(true),
}).refine((data) => data.due_date >= data.issue_date, {
  message: 'Due date must be on or after issue date',
  path: ['due_date'],
});

export const updateInvoiceSchema = z.object({
  client_name: z.string().min(1).max(150).optional(),
  client_email: z.string().email().max(254).optional(),
  amount: z.coerce.number().positive().max(100000000).optional(),
  issue_date: z.string().regex(dateRegex).optional(),
  due_date: z.string().regex(dateRegex).optional(),
  notes: z.string().max(1000).optional(),
  template_key: z.enum(['cadence_default', 'gentle', 'firm', 'urgent']).optional(),
  reminders_enabled: z.boolean().optional(),
});

export const markUnpaidSchema = z.object({
  confirm: z.literal(true, {
    message: 'Explicit confirmation (confirm: true) is required to mark an invoice unpaid.',
  }),
});

export const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  email: z.string().email('Invalid email address').max(254),
  notes: z.string().max(1000).optional(),
  cin: z.string().max(50).optional(),
  phone: z.string().max(30).optional(),
  attn: z.string().max(100).optional(),
});

export const updateProfileSchema = z.object({
  full_name: z.string().max(150).optional(),
  business_name: z.string().max(150).optional(),
  phone: z.string().max(30).optional(),
  timezone: z.string().min(1).max(60).optional(),
  upi_id: z.string().max(100).optional(),
  bank_account: z.string().max(50).optional(),
  bank_ifsc: z.string().max(30).optional(),
  reminder_default: z.string().max(50).optional(),
});

export const aiReminderSchema = z.object({
  invoice_id: z.string().uuid().optional(),
  invoice_number: z.string().min(1).optional(),
  amount: z.coerce.number().positive().optional(),
  due_date: z.string().regex(dateRegex).optional(),
  client_name: z.string().min(1).optional(),
  tone: z.enum(['gentle', 'professional', 'firm', 'urgent']).default('professional'),
});
