import { Client, Invoice, ActivityItem, UserProfile, ReminderLog } from '../types';

export const initialUserProfile: UserProfile = {
  id: '',
  email: '',
  full_name: '',
  business_name: '',
  phone: '',
  timezone: 'Asia/Kolkata (IST)',
  upi_id: '',
  bank_account_no: '',
  bank_ifsc: '',
  bank_name: '',
  bank_account_name: '',
  default_tone: 'Gentle Creative Professional',
};

export const initialClients: Client[] = [];

export const initialInvoices: Invoice[] = [];

export const initialActivities: ActivityItem[] = [];

export const initialReminderLogs: ReminderLog[] = [];
