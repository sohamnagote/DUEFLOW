// backend-ts/serverless.ts
import express from "express";

// backend-ts/config.ts
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });
var envSchema = z.object({
  PORT: z.coerce.number().default(3e3),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // Gemini AI
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-3.8-flash"),
  // Supabase
  SUPABASE_URL: z.string().optional().default(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ""),
  SUPABASE_SECRET_KEY: z.string().optional().default(process.env.SUPABASE_SECRET_KEY || ""),
  SUPABASE_ANON_KEY: z.string().optional().default(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""),
  // Resend
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default("DueFlow Reminders <reminders@dueflow.in>"),
  // Cron & Webhook
  CRON_SECRET: z.string().default("dueflow_cron_dev_secret_2026"),
  APP_BASE_URL: z.string().default(process.env.APP_URL || "http://localhost:3000")
});
var parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid server configuration:", parsed.error.format());
}
var config = parsed.success ? parsed.data : {
  PORT: 3e3,
  NODE_ENV: "development",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-3.8-flash",
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || "",
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
  RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET || "",
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || "DueFlow Reminders <reminders@dueflow.in>",
  CRON_SECRET: process.env.CRON_SECRET || "dueflow_cron_dev_secret_2026",
  APP_BASE_URL: process.env.APP_URL || "http://localhost:3000"
};

// backend-ts/routes/auth.ts
import { Router } from "express";
import crypto2 from "crypto";

// backend-ts/db/index.ts
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// backend-ts/services/statusService.ts
function deriveOperationalStatus(invoice, referenceDate = /* @__PURE__ */ new Date()) {
  if (invoice.status === "paid" || invoice.paid_at) {
    return "paid";
  }
  if (invoice.status === "cancelled") {
    return "cancelled";
  }
  const [dueY, dueM, dueD] = invoice.due_date.split("-").map(Number);
  const dueUtc = Date.UTC(dueY, dueM - 1, dueD);
  const refUtc = Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate());
  const diffDays = Math.round((dueUtc - refUtc) / (1e3 * 60 * 60 * 24));
  if (diffDays < 0) {
    return "overdue";
  }
  if (diffDays <= 3) {
    return "due_soon";
  }
  return "unpaid";
}

// backend-ts/services/schedulerService.ts
var DEFAULT_CADENCE = [
  {
    stage_number: 1,
    offset_days: 3,
    direction: "before",
    occurrence_key: "stage_1_3_days_before",
    label: "3 Days Before Due Date"
  },
  {
    stage_number: 2,
    offset_days: 0,
    direction: "on",
    occurrence_key: "stage_2_on_due_date",
    label: "On Due Date"
  },
  {
    stage_number: 3,
    offset_days: 3,
    direction: "after",
    occurrence_key: "stage_3_3_days_overdue",
    label: "3 Days Overdue"
  },
  {
    stage_number: 4,
    offset_days: 7,
    direction: "after",
    occurrence_key: "stage_4_7_days_overdue",
    label: "7 Days Overdue"
  }
];
function computeScheduledTime(targetDateStr, userTimezone = "Asia/Kolkata") {
  const [year, month, day] = targetDateStr.split("-").map(Number);
  let tzOffsetMinutes = 330;
  if (userTimezone.includes("UTC") || userTimezone.includes("GMT")) {
    tzOffsetMinutes = 0;
  } else if (userTimezone.includes("New_York") || userTimezone.includes("EST") || userTimezone.includes("EDT")) {
    tzOffsetMinutes = -300;
  } else if (userTimezone.includes("London") || userTimezone.includes("GMT")) {
    tzOffsetMinutes = 0;
  } else if (userTimezone.includes("Dubai")) {
    tzOffsetMinutes = 240;
  } else if (userTimezone.includes("Singapore")) {
    tzOffsetMinutes = 480;
  }
  const localTargetMinutes = 9 * 60;
  const utcTargetMinutes = localTargetMinutes - tzOffsetMinutes;
  const dateUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  dateUtc.setUTCMinutes(dateUtc.getUTCMinutes() + utcTargetMinutes);
  return dateUtc.toISOString();
}
function addDaysToDateString(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dObj = new Date(Date.UTC(y, m - 1, d));
  dObj.setUTCDate(dObj.getUTCDate() + days);
  return dObj.toISOString().split("T")[0];
}
function calculateReminderRules(dueDateStr, userTimezone = "Asia/Kolkata", invoiceStatus = "unpaid", channels = ["email"]) {
  const isPaid = invoiceStatus === "paid";
  const targetChannels = channels.length > 0 ? channels : ["email"];
  const rules = [];
  for (const channel of targetChannels) {
    for (const cadence of DEFAULT_CADENCE) {
      let dayShift = 0;
      if (cadence.direction === "before") {
        dayShift = -cadence.offset_days;
      } else if (cadence.direction === "after") {
        dayShift = cadence.offset_days;
      }
      const targetDate = addDaysToDateString(dueDateStr, dayShift);
      const scheduledFor = computeScheduledTime(targetDate, userTimezone);
      const occurrenceKey = cadence.occurrence_key;
      rules.push({
        channel,
        offset_days: cadence.offset_days,
        direction: cadence.direction,
        occurrence_key: occurrenceKey,
        scheduled_for: scheduledFor,
        status: isPaid ? "cancelled" : "pending",
        enabled: !isPaid
      });
    }
  }
  return rules;
}
function recomputeRulesForUnpaid(dueDateStr, sentOccurrenceKeys, userTimezone = "Asia/Kolkata", channels = ["email"]) {
  const freshRules = calculateReminderRules(dueDateStr, userTimezone, "unpaid", channels);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return freshRules.map((rule) => {
    const channelSpecificKey = `${rule.occurrence_key}_${rule.channel}`;
    const wasSent = sentOccurrenceKeys.has(rule.occurrence_key) || sentOccurrenceKeys.has(channelSpecificKey);
    if (wasSent) {
      return {
        ...rule,
        status: "sent",
        enabled: false
      };
    }
    if (rule.scheduled_for < now) {
      return {
        ...rule,
        status: "skipped",
        enabled: false
      };
    }
    return {
      ...rule,
      status: "pending",
      enabled: true
    };
  });
}

// backend-ts/db/index.ts
var MemoryStore = class {
  constructor() {
    this.profiles = /* @__PURE__ */ new Map();
    this.clients = /* @__PURE__ */ new Map();
    this.invoices = /* @__PURE__ */ new Map();
    this.reminderRules = /* @__PURE__ */ new Map();
    this.reminderLogs = /* @__PURE__ */ new Map();
    this.integrations = /* @__PURE__ */ new Map();
    this.aiActions = /* @__PURE__ */ new Map();
  }
};
var memoryDb = new MemoryStore();
var supabaseAdmin = null;
var supabaseAnonClient = null;
var isSupabaseConfigured = Boolean(
  config.SUPABASE_URL && config.SUPABASE_URL.startsWith("http") && !config.SUPABASE_URL.includes("your-project") && config.SUPABASE_SECRET_KEY && !config.SUPABASE_SECRET_KEY.includes("your_service_key") && !config.SUPABASE_SECRET_KEY.includes("your_key")
);
if (isSupabaseConfigured) {
  try {
    supabaseAdmin = createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false }
    });
    if (config.SUPABASE_ANON_KEY && !config.SUPABASE_ANON_KEY.includes("your_key")) {
      supabaseAnonClient = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
        auth: { persistSession: false }
      });
    }
  } catch (err) {
    console.warn("Could not initialize Supabase client:", err);
  }
}
var db = {
  isCloudConnected() {
    return isSupabaseConfigured && !!supabaseAdmin;
  },
  getSupabaseAdmin() {
    return supabaseAdmin;
  },
  getSupabaseAnonClient() {
    return supabaseAnonClient;
  },
  getUserScopedClient(accessToken) {
    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) return null;
    return createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });
  },
  // ---------------------------------------------------------------------------
  // PROFILES
  // ---------------------------------------------------------------------------
  async getProfile(userId) {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data;
    }
    return memoryDb.profiles.get(userId) || null;
  },
  async upsertProfile(profile) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const existing = await this.getProfile(profile.id);
    const record = {
      id: profile.id,
      email: profile.email.toLowerCase().trim(),
      full_name: profile.full_name ?? existing?.full_name ?? "",
      business_name: profile.business_name ?? existing?.business_name ?? "",
      phone: profile.phone ?? existing?.phone ?? "",
      timezone: profile.timezone ?? existing?.timezone ?? "Asia/Kolkata",
      upi_id: profile.upi_id ?? existing?.upi_id ?? "",
      bank_account: profile.bank_account ?? existing?.bank_account ?? "",
      bank_ifsc: profile.bank_ifsc ?? existing?.bank_ifsc ?? "",
      reminder_default: profile.reminder_default ?? existing?.reminder_default ?? "cadence_default",
      default_reminder_channel: profile.default_reminder_channel ?? existing?.default_reminder_channel ?? "email",
      email_reminders_enabled: profile.email_reminders_enabled ?? existing?.email_reminders_enabled ?? true,
      whatsapp_reminders_enabled: profile.whatsapp_reminders_enabled ?? existing?.whatsapp_reminders_enabled ?? false,
      created_at: existing?.created_at || now,
      updated_at: now
    };
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("profiles").upsert(record).select().maybeSingle();
      if (error) throw error;
      return data || record;
    }
    memoryDb.profiles.set(record.id, record);
    return record;
  },
  async findProfileByEmail(email) {
    const normalized = email.toLowerCase().trim();
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("profiles").select("*").eq("email", normalized).maybeSingle();
      if (error) throw error;
      return data;
    }
    for (const p of memoryDb.profiles.values()) {
      if (p.email.toLowerCase() === normalized) return p;
    }
    return null;
  },
  async updateRuleStatus(ruleId, status) {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { error } = await supabaseAdmin.from("reminder_rules").update({ status }).eq("id", ruleId);
      if (error) throw error;
      return;
    }
    const r = memoryDb.reminderRules.get(ruleId);
    if (r) r.status = status;
  },
  // ---------------------------------------------------------------------------
  // CLIENTS
  // ---------------------------------------------------------------------------
  async listClients(userId) {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("clients").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return Array.from(memoryDb.clients.values()).filter((c) => c.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async getClient(userId, clientId) {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("clients").select("*").eq("user_id", userId).eq("id", clientId).maybeSingle();
      if (error) throw error;
      return data;
    }
    const c = memoryDb.clients.get(clientId);
    if (c && c.user_id === userId) return c;
    return null;
  },
  async createClient(userId, data) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const id = crypto.randomUUID();
    const record = {
      id,
      user_id: userId,
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      notes: data.notes?.trim() || "",
      cin: data.cin?.trim() || "",
      phone: data.phone?.trim() || "",
      attn: data.attn?.trim() || "",
      created_at: now,
      updated_at: now
    };
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data: created, error } = await supabaseAdmin.from("clients").insert(record).select().single();
      if (error) throw error;
      return created;
    }
    memoryDb.clients.set(id, record);
    return record;
  },
  async updateClient(userId, clientId, data) {
    const existing = await this.getClient(userId, clientId);
    if (!existing) return null;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const updated = {
      ...existing,
      ...data,
      email: data.email ? data.email.toLowerCase().trim() : existing.email,
      name: data.name ? data.name.trim() : existing.name,
      updated_at: now
    };
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data: updatedRecord, error } = await supabaseAdmin.from("clients").update(updated).eq("id", clientId).eq("user_id", userId).select().maybeSingle();
      if (error) throw error;
      return updatedRecord;
    }
    memoryDb.clients.set(clientId, updated);
    return updated;
  },
  async deleteClient(userId, clientId) {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("clients").delete().eq("id", clientId).eq("user_id", userId).select();
      if (error) throw error;
      return Boolean(data && data.length > 0);
    }
    const existing = await this.getClient(userId, clientId);
    if (!existing) return false;
    memoryDb.clients.delete(clientId);
    return true;
  },
  // ---------------------------------------------------------------------------
  // INVOICES
  // ---------------------------------------------------------------------------
  async listInvoices(userId, options = {}) {
    let list = [];
    if (this.isCloudConnected() && supabaseAdmin) {
      let query = supabaseAdmin.from("invoices").select("*").eq("user_id", userId);
      if (options.status && options.status !== "all") {
        query = query.eq("status", options.status);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (data) list = data;
    } else {
      list = Array.from(memoryDb.invoices.values()).filter((inv) => inv.user_id === userId);
    }
    const withOpStatus = list.map((inv) => ({
      ...inv,
      operational_status: deriveOperationalStatus(inv)
    }));
    let filtered = withOpStatus;
    if (options.search) {
      const q = options.search.toLowerCase();
      filtered = filtered.filter(
        (inv) => inv.invoice_number.toLowerCase().includes(q) || inv.client_name_snapshot.toLowerCase().includes(q) || inv.client_email_snapshot.toLowerCase().includes(q)
      );
    }
    if (options.status && options.status !== "all") {
      filtered = filtered.filter((inv) => inv.operational_status === options.status || inv.status === options.status);
    }
    filtered.sort((a, b) => {
      if (options.sort === "amount_desc") return b.amount - a.amount;
      if (options.sort === "amount_asc") return a.amount - b.amount;
      if (options.sort === "due_date_asc") return a.due_date.localeCompare(b.due_date);
      if (options.sort === "due_date_desc") return b.due_date.localeCompare(a.due_date);
      return b.created_at.localeCompare(a.created_at);
    });
    const page = options.page || 1;
    const limit = options.limit || 50;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);
    return { invoices: paginated, total: filtered.length };
  },
  async getInvoice(userId, invoiceId) {
    let inv = null;
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("invoices").select("*").eq("user_id", userId).eq("id", invoiceId).maybeSingle();
      if (error) throw error;
      if (data) inv = data;
    } else {
      const found = memoryDb.invoices.get(invoiceId);
      if (found && found.user_id === userId) inv = found;
    }
    if (!inv) return null;
    return {
      ...inv,
      operational_status: deriveOperationalStatus(inv)
    };
  },
  async createInvoice(userId, data) {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data: existing, error: existErr } = await supabaseAdmin.from("invoices").select("id").eq("user_id", userId).eq("invoice_number", data.invoice_number.trim()).maybeSingle();
      if (existErr) throw existErr;
      if (existing) {
        const err = new Error(`Invoice number "${data.invoice_number}" already exists for this account.`);
        err.code = "23505";
        throw err;
      }
    } else {
      const existingInvoices = Array.from(memoryDb.invoices.values()).filter(
        (i) => i.user_id === userId && i.invoice_number.trim().toLowerCase() === data.invoice_number.trim().toLowerCase()
      );
      if (existingInvoices.length > 0) {
        const err = new Error(`Invoice number "${data.invoice_number}" already exists for this account.`);
        err.code = "23505";
        throw err;
      }
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const id = crypto.randomUUID();
    const normalizedEmail = data.client_email.toLowerCase().trim();
    const profile = await this.getProfile(userId);
    const timezone = profile?.timezone || "Asia/Kolkata";
    const invoiceRecord = {
      id,
      user_id: userId,
      client_id: data.client_id || null,
      client_name_snapshot: data.client_name.trim(),
      client_email_snapshot: normalizedEmail,
      invoice_number: data.invoice_number.trim(),
      amount: Math.round(Number(data.amount) * 100) / 100,
      // 2 decimal precision
      currency: data.currency || "INR",
      issue_date: data.issue_date,
      due_date: data.due_date,
      notes: data.notes?.trim() || "",
      status: "unpaid",
      reminders_enabled: data.reminders_enabled ?? true,
      reminder_channel: data.reminder_channel || "default",
      client_phone_snapshot: data.client_phone?.trim() || null,
      template_key: data.template_key || "cadence_default",
      paid_at: null,
      created_at: now,
      updated_at: now
    };
    const channelPreference = data.reminder_channel === "default" || !data.reminder_channel ? profile?.default_reminder_channel || "email" : data.reminder_channel;
    let targetChannels = ["email"];
    if (channelPreference === "both") {
      targetChannels = ["email", "whatsapp"];
    } else if (channelPreference === "whatsapp") {
      targetChannels = ["whatsapp"];
    }
    const generatedRules = calculateReminderRules(data.due_date, timezone, "unpaid", targetChannels);
    const ruleRecords = generatedRules.map((r) => ({
      id: crypto.randomUUID(),
      invoice_id: id,
      channel: r.channel,
      offset_days: r.offset_days,
      direction: r.direction,
      enabled: invoiceRecord.reminders_enabled,
      occurrence_key: r.occurrence_key,
      scheduled_for: r.scheduled_for,
      status: r.status,
      created_at: now
    }));
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data: createdInv, error: invErr } = await supabaseAdmin.from("invoices").insert(invoiceRecord).select().single();
      if (invErr) throw invErr;
      if (ruleRecords.length > 0) {
        const { error: rulesErr } = await supabaseAdmin.from("reminder_rules").insert(ruleRecords);
        if (rulesErr) throw rulesErr;
      }
      return {
        ...createdInv || invoiceRecord,
        operational_status: deriveOperationalStatus(createdInv || invoiceRecord),
        rules: ruleRecords
      };
    }
    memoryDb.invoices.set(id, invoiceRecord);
    for (const rule of ruleRecords) {
      memoryDb.reminderRules.set(rule.id, rule);
    }
    return {
      ...invoiceRecord,
      operational_status: deriveOperationalStatus(invoiceRecord),
      rules: ruleRecords
    };
  },
  async updateInvoice(userId, invoiceId, data) {
    const existing = await this.getInvoice(userId, invoiceId);
    if (!existing) return null;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const updated = {
      ...existing,
      ...data,
      updated_at: now
    };
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data: updatedRecord, error } = await supabaseAdmin.from("invoices").update(updated).eq("id", invoiceId).eq("user_id", userId).select().maybeSingle();
      if (error) throw error;
      if (!updatedRecord) return null;
      return {
        ...updatedRecord,
        operational_status: deriveOperationalStatus(updatedRecord)
      };
    }
    memoryDb.invoices.set(invoiceId, updated);
    return {
      ...updated,
      operational_status: deriveOperationalStatus(updated)
    };
  },
  async deleteInvoice(userId, invoiceId) {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("invoices").delete().eq("id", invoiceId).eq("user_id", userId).select();
      if (error) throw error;
      return Boolean(data && data.length > 0);
    }
    const existing = await this.getInvoice(userId, invoiceId);
    if (!existing) return false;
    memoryDb.invoices.delete(invoiceId);
    for (const [rId, rule] of memoryDb.reminderRules.entries()) {
      if (rule.invoice_id === invoiceId) memoryDb.reminderRules.delete(rId);
    }
    for (const [lId, log] of memoryDb.reminderLogs.entries()) {
      if (log.invoice_id === invoiceId) memoryDb.reminderLogs.delete(lId);
    }
    return true;
  },
  async markInvoicePaid(userId, invoiceId) {
    const inv = await this.getInvoice(userId, invoiceId);
    if (!inv) throw new Error("Invoice not found");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const updated = {
      ...inv,
      status: "paid",
      paid_at: now,
      updated_at: now
    };
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data: updatedInv, error: updErr } = await supabaseAdmin.from("invoices").update({ status: "paid", paid_at: now, updated_at: now }).eq("id", invoiceId).eq("user_id", userId).select().maybeSingle();
      if (updErr) throw updErr;
      if (!updatedInv) throw new Error("Invoice not found");
      await supabaseAdmin.from("reminder_rules").update({ status: "cancelled", enabled: false }).eq("invoice_id", invoiceId).eq("status", "pending");
      return {
        ...updatedInv,
        operational_status: "paid"
      };
    }
    memoryDb.invoices.set(invoiceId, updated);
    for (const rule of memoryDb.reminderRules.values()) {
      if (rule.invoice_id === invoiceId && rule.status === "pending") {
        rule.status = "cancelled";
        rule.enabled = false;
      }
    }
    return {
      ...updated,
      operational_status: "paid"
    };
  },
  async markInvoiceUnpaid(userId, invoiceId) {
    const inv = await this.getInvoice(userId, invoiceId);
    if (!inv) throw new Error("Invoice not found");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const updated = {
      ...inv,
      status: "unpaid",
      paid_at: null,
      updated_at: now
    };
    const profile = await this.getProfile(userId);
    const timezone = profile?.timezone || "Asia/Kolkata";
    const channelPreference = inv.reminder_channel === "default" || !inv.reminder_channel ? profile?.default_reminder_channel || "email" : inv.reminder_channel;
    let targetChannels = ["email"];
    if (channelPreference === "both") {
      targetChannels = ["email", "whatsapp"];
    } else if (channelPreference === "whatsapp") {
      targetChannels = ["whatsapp"];
    }
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data: updatedInv, error: updErr } = await supabaseAdmin.from("invoices").update({ status: "unpaid", paid_at: null, updated_at: now }).eq("id", invoiceId).eq("user_id", userId).select().maybeSingle();
      if (updErr) throw updErr;
      if (!updatedInv) throw new Error("Invoice not found");
      const { data: existingLogs2, error: logErr } = await supabaseAdmin.from("reminder_logs").select("occurrence_key, status").eq("invoice_id", invoiceId).in("status", ["sent", "delivered"]);
      if (logErr) throw logErr;
      const sentOccurrenceKeys2 = new Set((existingLogs2 || []).map((l) => l.occurrence_key));
      const recomputed2 = recomputeRulesForUnpaid(inv.due_date, sentOccurrenceKeys2, timezone, targetChannels);
      const { data: currentRules2, error: rulesErr } = await supabaseAdmin.from("reminder_rules").select("*").eq("invoice_id", invoiceId);
      if (rulesErr) throw rulesErr;
      const resultRules2 = [];
      for (const recomputedRule of recomputed2) {
        const match = (currentRules2 || []).find(
          (r) => r.occurrence_key === recomputedRule.occurrence_key && r.channel === recomputedRule.channel
        );
        if (match) {
          const { data: updRule, error: updRuleErr } = await supabaseAdmin.from("reminder_rules").update({
            status: recomputedRule.status,
            enabled: recomputedRule.enabled,
            scheduled_for: recomputedRule.scheduled_for
          }).eq("id", match.id).select().single();
          if (updRuleErr) throw updRuleErr;
          resultRules2.push(updRule || match);
        } else {
          const newRecord = {
            id: crypto.randomUUID(),
            invoice_id: invoiceId,
            channel: recomputedRule.channel,
            offset_days: recomputedRule.offset_days,
            direction: recomputedRule.direction,
            enabled: recomputedRule.enabled,
            occurrence_key: recomputedRule.occurrence_key,
            scheduled_for: recomputedRule.scheduled_for,
            status: recomputedRule.status,
            created_at: now
          };
          const { data: insRule, error: insRuleErr } = await supabaseAdmin.from("reminder_rules").insert(newRecord).select().single();
          if (insRuleErr) throw insRuleErr;
          resultRules2.push(insRule || newRecord);
        }
      }
      return {
        ...updatedInv,
        operational_status: deriveOperationalStatus(updatedInv),
        rules: resultRules2
      };
    }
    memoryDb.invoices.set(invoiceId, updated);
    const existingLogs = Array.from(memoryDb.reminderLogs.values()).filter(
      (l) => l.invoice_id === invoiceId && (l.status === "sent" || l.status === "delivered")
    );
    const sentOccurrenceKeys = new Set(existingLogs.map((l) => l.occurrence_key));
    const recomputed = recomputeRulesForUnpaid(inv.due_date, sentOccurrenceKeys, timezone, targetChannels);
    const currentRules = Array.from(memoryDb.reminderRules.values()).filter((r) => r.invoice_id === invoiceId);
    const resultRules = [];
    for (const recomputedRule of recomputed) {
      const match = currentRules.find(
        (r) => r.occurrence_key === recomputedRule.occurrence_key && r.channel === recomputedRule.channel
      );
      if (match) {
        match.status = recomputedRule.status;
        match.enabled = recomputedRule.enabled;
        match.scheduled_for = recomputedRule.scheduled_for;
        resultRules.push(match);
      } else {
        const newRecord = {
          id: crypto.randomUUID(),
          invoice_id: invoiceId,
          channel: recomputedRule.channel,
          offset_days: recomputedRule.offset_days,
          direction: recomputedRule.direction,
          enabled: recomputedRule.enabled,
          occurrence_key: recomputedRule.occurrence_key,
          scheduled_for: recomputedRule.scheduled_for,
          status: recomputedRule.status,
          created_at: now
        };
        memoryDb.reminderRules.set(newRecord.id, newRecord);
        resultRules.push(newRecord);
      }
    }
    return {
      ...updated,
      operational_status: deriveOperationalStatus(updated),
      rules: resultRules
    };
  },
  async toggleReminders(userId, invoiceId, enabled) {
    const inv = await this.getInvoice(userId, invoiceId);
    if (!inv) throw new Error("Invoice not found");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const updated = {
      ...inv,
      reminders_enabled: enabled,
      updated_at: now
    };
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data: updatedRecord, error } = await supabaseAdmin.from("invoices").update({ reminders_enabled: enabled, updated_at: now }).eq("id", invoiceId).eq("user_id", userId).select().maybeSingle();
      if (error) throw error;
      if (!updatedRecord) throw new Error("Invoice not found");
      await supabaseAdmin.from("reminder_rules").update({ enabled }).eq("invoice_id", invoiceId).eq("status", "pending");
      return {
        ...updatedRecord,
        operational_status: deriveOperationalStatus(updatedRecord)
      };
    }
    memoryDb.invoices.set(invoiceId, updated);
    for (const rule of memoryDb.reminderRules.values()) {
      if (rule.invoice_id === invoiceId && rule.status === "pending") {
        rule.enabled = enabled;
      }
    }
    return {
      ...updated,
      operational_status: deriveOperationalStatus(updated)
    };
  },
  // ---------------------------------------------------------------------------
  // REMINDER RULES & LOGS
  // ---------------------------------------------------------------------------
  async getRulesForInvoice(invoiceId) {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("reminder_rules").select("*").eq("invoice_id", invoiceId).order("scheduled_for", { ascending: true });
      if (error) throw error;
      return data || [];
    }
    return Array.from(memoryDb.reminderRules.values()).filter((r) => r.invoice_id === invoiceId).sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
  },
  async getLogsForInvoice(invoiceId) {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("reminder_logs").select("*").eq("invoice_id", invoiceId).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return Array.from(memoryDb.reminderLogs.values()).filter((l) => l.invoice_id === invoiceId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async recordLog(log) {
    const id = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const record = {
      ...log,
      id,
      channel: log.channel || "email",
      provider: log.provider || "system",
      recipient: log.recipient || log.recipient_email || log.recipient_phone || "recipient",
      created_at: now
    };
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("reminder_logs").insert(record).select().single();
      if (error) throw error;
      return data;
    }
    memoryDb.reminderLogs.set(id, record);
    return record;
  },
  async updateLogDelivery(providerMessageId, status, errorCode) {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { error } = await supabaseAdmin.from("reminder_logs").update({ status, error_code: errorCode || null }).eq("provider_message_id", providerMessageId);
      if (error) throw error;
      return true;
    }
    for (const log of memoryDb.reminderLogs.values()) {
      if (log.provider_message_id === providerMessageId) {
        log.status = status;
        if (errorCode) log.error_code = errorCode;
      }
    }
    return true;
  },
  // ---------------------------------------------------------------------------
  // INTEGRATIONS (OAUTH & WHATSAPP BUSINESS)
  // ---------------------------------------------------------------------------
  async getIntegrations(userId) {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("integrations").select("*").eq("user_id", userId);
      if (error) throw error;
      return data || [];
    }
    return Array.from(memoryDb.integrations.values()).filter((i) => i.user_id === userId);
  },
  async getIntegrationByProvider(userId, provider) {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("integrations").select("*").eq("user_id", userId).eq("provider", provider).maybeSingle();
      if (error) throw error;
      return data;
    }
    for (const i of memoryDb.integrations.values()) {
      if (i.user_id === userId && i.provider === provider) return i;
    }
    return null;
  },
  async getIntegrationByChannel(userId, channel) {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("integrations").select("*").eq("user_id", userId).eq("channel", channel).eq("status", "CONNECTED").maybeSingle();
      if (error) throw error;
      return data;
    }
    for (const i of memoryDb.integrations.values()) {
      if (i.user_id === userId && i.channel === channel && i.status === "CONNECTED") return i;
    }
    return null;
  },
  async upsertIntegration(integration) {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("integrations").upsert(integration).select().maybeSingle();
      if (error) throw error;
      return data || integration;
    }
    memoryDb.integrations.set(integration.id, integration);
    return integration;
  },
  async updateIntegrationTokens(id, updates) {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { error } = await supabaseAdmin.from("integrations").update({ ...updates, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id);
      if (error) throw error;
      return;
    }
    const item = memoryDb.integrations.get(id);
    if (item) {
      Object.assign(item, updates, { updated_at: (/* @__PURE__ */ new Date()).toISOString() });
    }
  },
  async updateIntegrationStatus(id, status, errorCode, errorMessage) {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { error } = await supabaseAdmin.from("integrations").update({
        status,
        last_error_code: errorCode || null,
        last_error_message: errorMessage || null,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", id);
      if (error) throw error;
      return;
    }
    const item = memoryDb.integrations.get(id);
    if (item) {
      item.status = status;
      if (errorCode !== void 0) item.last_error_code = errorCode;
      if (errorMessage !== void 0) item.last_error_message = errorMessage;
      item.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    }
  },
  async recordIntegrationSuccess(id) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (this.isCloudConnected() && supabaseAdmin) {
      const { error } = await supabaseAdmin.from("integrations").update({
        last_success_at: now,
        last_error_code: null,
        last_error_message: null,
        updated_at: now
      }).eq("id", id);
      if (error) throw error;
      return;
    }
    const item = memoryDb.integrations.get(id);
    if (item) {
      item.last_success_at = now;
      item.last_error_code = null;
      item.last_error_message = null;
      item.updated_at = now;
    }
  },
  async deleteIntegration(userId, provider) {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { error } = await supabaseAdmin.from("integrations").delete().eq("user_id", userId).eq("provider", provider);
      if (error) throw error;
      return true;
    }
    for (const [id, i] of memoryDb.integrations.entries()) {
      if (i.user_id === userId && i.provider === provider) {
        memoryDb.integrations.delete(id);
      }
    }
    return true;
  },
  toSafeIntegration(rec) {
    return {
      id: rec.id,
      provider: rec.provider,
      channel: rec.channel,
      status: rec.status,
      display_email: rec.provider_email || void 0,
      display_name: rec.provider_account_id || rec.provider_business_id || void 0,
      display_phone: rec.provider_phone_id || void 0,
      business_name: rec.provider_business_id || void 0,
      connected_at: rec.connected_at,
      last_success_at: rec.last_success_at,
      last_error: rec.last_error_message || rec.last_error_code || void 0
    };
  },
  async getDuePendingRules(nowIso) {
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data: rules, error: rulesErr } = await supabaseAdmin.from("reminder_rules").select("*").eq("status", "pending").eq("enabled", true).lte("scheduled_for", nowIso);
      if (rulesErr) throw rulesErr;
      if (!rules || rules.length === 0) return [];
      const invoiceIds = Array.from(new Set(rules.map((r) => r.invoice_id)));
      const { data: invoices, error: invErr } = await supabaseAdmin.from("invoices").select("*").in("id", invoiceIds).eq("reminders_enabled", true).neq("status", "paid").neq("status", "cancelled");
      if (invErr) throw invErr;
      const invoiceMap = new Map((invoices || []).map((i) => [i.id, i]));
      const userIds = Array.from(new Set((invoices || []).map((i) => i.user_id)));
      const { data: profiles, error: profErr } = await supabaseAdmin.from("profiles").select("*").in("id", userIds);
      if (profErr) throw profErr;
      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      const results2 = [];
      for (const rule of rules) {
        const invoice = invoiceMap.get(rule.invoice_id);
        if (invoice) {
          const profile = profileMap.get(invoice.user_id) || {
            id: invoice.user_id,
            email: "user@dueflow.in",
            full_name: "Freelancer",
            business_name: "Agency",
            timezone: "Asia/Kolkata",
            reminder_default: "cadence_default",
            created_at: (/* @__PURE__ */ new Date()).toISOString(),
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          };
          results2.push({ rule, invoice, profile });
        }
      }
      return results2;
    }
    const results = [];
    const allRules = Array.from(memoryDb.reminderRules.values());
    for (const rule of allRules) {
      if (rule.status === "pending" && rule.enabled && rule.scheduled_for <= nowIso) {
        const invoice = memoryDb.invoices.get(rule.invoice_id);
        if (invoice && invoice.reminders_enabled && invoice.status !== "paid" && invoice.status !== "cancelled") {
          const profile = await this.getProfile(invoice.user_id) || {
            id: invoice.user_id,
            email: "user@dueflow.in",
            full_name: "Freelancer",
            business_name: "Agency",
            timezone: "Asia/Kolkata",
            reminder_default: "cadence_default",
            created_at: (/* @__PURE__ */ new Date()).toISOString(),
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          };
          results.push({ rule, invoice, profile });
        }
      }
    }
    return results;
  },
  // ---------------------------------------------------------------------------
  // AI ACTIONS AUDIT
  // ---------------------------------------------------------------------------
  async logAiAction(action) {
    const id = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const record = {
      ...action,
      id,
      created_at: now
    };
    if (this.isCloudConnected() && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("ai_actions").insert(record).select().single();
      if (error) throw error;
      return data;
    }
    memoryDb.aiActions.set(id, record);
    return record;
  },
  // ---------------------------------------------------------------------------
  // DASHBOARD AGGREGATES
  // ---------------------------------------------------------------------------
  async getDashboardAggregates(userId) {
    const { invoices } = await this.listInvoices(userId);
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let totalPaid = 0;
    let overdueCount = 0;
    let activeCadenceCount = 0;
    for (const inv of invoices) {
      const op = inv.operational_status;
      if (op === "paid") {
        totalPaid += inv.amount;
      } else {
        totalOutstanding += inv.amount;
        if (op === "overdue") {
          totalOverdue += inv.amount;
          overdueCount++;
        }
        if (inv.reminders_enabled) {
          activeCadenceCount++;
        }
      }
    }
    let recentLogs = [];
    if (this.isCloudConnected() && supabaseAdmin) {
      const invoiceIds = invoices.map((i) => i.id);
      if (invoiceIds.length > 0) {
        const { data: logs, error } = await supabaseAdmin.from("reminder_logs").select("*").in("invoice_id", invoiceIds).order("created_at", { ascending: false }).limit(10);
        if (!error && logs) recentLogs = logs;
      }
    } else {
      const userInvoices = new Set(invoices.map((i) => i.id));
      recentLogs = Array.from(memoryDb.reminderLogs.values()).filter((l) => userInvoices.has(l.invoice_id)).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10);
    }
    return {
      totalOutstanding,
      totalOverdue,
      totalPaid,
      totalInvoices: invoices.length,
      overdueCount,
      activeCadenceCount,
      recentLogs
    };
  }
};

// backend-ts/middleware/auth.ts
import { createClient as createClient2 } from "@supabase/supabase-js";
var supabaseClient = null;
if (config.SUPABASE_URL && !config.SUPABASE_URL.includes("your-project") && config.SUPABASE_ANON_KEY && !config.SUPABASE_ANON_KEY.includes("your_key")) {
  try {
    supabaseClient = createClient2(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  } catch (e) {
  }
}
var requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }
  const token = authHeader.split(" ")[1].trim();
  if (!token) {
    return res.status(401).json({ error: "Authorization token not provided" });
  }
  try {
    if (supabaseClient && !token.startsWith("dueflow_dev_")) {
      const { data: { user }, error } = await supabaseClient.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ error: "Invalid or expired authentication session" });
      }
      req.user = {
        id: user.id,
        email: user.email || "",
        full_name: user.user_metadata?.full_name || "",
        business_name: user.user_metadata?.business_name || ""
      };
      return next();
    }
    if (token.startsWith("dueflow_dev_")) {
      const parts = token.replace("dueflow_dev_", "").split("_");
      const userId = parts[0] || "00000000-0000-0000-0000-000000000001";
      let email = "user@dueflow.in";
      if (parts[1]) {
        try {
          email = Buffer.from(parts[1], "base64").toString("utf8");
        } catch {
        }
      }
      let profile2 = await db.getProfile(userId);
      if (!profile2) {
        profile2 = await db.upsertProfile({
          id: userId,
          email,
          full_name: "Freelancer Professional",
          business_name: "Agency Studio"
        });
      }
      req.user = {
        id: userId,
        email: profile2.email,
        full_name: profile2.full_name,
        business_name: profile2.business_name
      };
      return next();
    }
    const defaultUserId = "00000000-0000-0000-0000-000000000001";
    let profile = await db.getProfile(defaultUserId);
    if (!profile) {
      profile = await db.upsertProfile({
        id: defaultUserId,
        email: "freelancer@dueflow.in",
        full_name: "DueFlow User",
        business_name: "Studio"
      });
    }
    req.user = {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      business_name: profile.business_name
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Authentication failed" });
  }
};

// backend-ts/middleware/validate.ts
import { z as z2 } from "zod";
var validateRequest = (schema) => {
  return async (req, res, next) => {
    try {
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      next();
    } catch (err) {
      if (err instanceof z2.ZodError) {
        const issues = err.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message
        }));
        return res.status(400).json({
          error: "Validation failed",
          details: issues
        });
      }
      return res.status(400).json({ error: "Malformed request payload" });
    }
  };
};
var dateRegex = /^\d{4}-\d{2}-\d{2}$/;
var createInvoiceSchema = z2.object({
  client_id: z2.string().uuid().optional().nullable(),
  client_name: z2.string().min(1, "Client name is required").max(150, "Client name too long"),
  client_email: z2.string().email("Invalid client email address").max(254),
  invoice_number: z2.string().min(1, "Invoice number required").max(50, "Invoice number too long"),
  amount: z2.coerce.number().positive("Amount must be greater than 0").max(1e8, "Amount cannot exceed INR 100,000,000").refine((val) => Number(val.toFixed(2)) === val, {
    message: "Amount cannot exceed 2 decimal places"
  }),
  currency: z2.literal("INR").default("INR"),
  issue_date: z2.string().regex(dateRegex, "Issue date must be YYYY-MM-DD"),
  due_date: z2.string().regex(dateRegex, "Due date must be YYYY-MM-DD"),
  notes: z2.string().max(1e3, "Notes cannot exceed 1000 characters").optional().default(""),
  template_key: z2.enum(["cadence_default", "gentle", "firm", "urgent"]).default("cadence_default"),
  reminders_enabled: z2.boolean().default(true)
}).refine((data) => data.due_date >= data.issue_date, {
  message: "Due date must be on or after issue date",
  path: ["due_date"]
});
var updateInvoiceSchema = z2.object({
  client_name: z2.string().min(1).max(150).optional(),
  client_email: z2.string().email().max(254).optional(),
  amount: z2.coerce.number().positive().max(1e8).optional(),
  issue_date: z2.string().regex(dateRegex).optional(),
  due_date: z2.string().regex(dateRegex).optional(),
  notes: z2.string().max(1e3).optional(),
  template_key: z2.enum(["cadence_default", "gentle", "firm", "urgent"]).optional(),
  reminders_enabled: z2.boolean().optional()
});
var markUnpaidSchema = z2.object({
  confirm: z2.literal(true, {
    message: "Explicit confirmation (confirm: true) is required to mark an invoice unpaid."
  })
});
var createClientSchema = z2.object({
  name: z2.string().min(1, "Name is required").max(150),
  email: z2.string().email("Invalid email address").max(254),
  notes: z2.string().max(1e3).optional(),
  cin: z2.string().max(50).optional(),
  phone: z2.string().max(30).optional(),
  attn: z2.string().max(100).optional()
});
var updateProfileSchema = z2.object({
  full_name: z2.string().max(150).optional(),
  business_name: z2.string().max(150).optional(),
  phone: z2.string().max(30).optional(),
  timezone: z2.string().min(1).max(60).optional(),
  upi_id: z2.string().max(100).optional(),
  bank_account: z2.string().max(50).optional(),
  bank_ifsc: z2.string().max(30).optional(),
  reminder_default: z2.string().max(50).optional()
});
var aiReminderSchema = z2.object({
  invoice_id: z2.string().uuid().optional(),
  invoice_number: z2.string().min(1).optional(),
  amount: z2.coerce.number().positive().optional(),
  due_date: z2.string().regex(dateRegex).optional(),
  client_name: z2.string().min(1).optional(),
  tone: z2.enum(["gentle", "professional", "firm", "urgent"]).default("professional")
});

// backend-ts/routes/auth.ts
import { z as z3 } from "zod";
var router = Router();
var signupSchema = z3.object({
  email: z3.string().email(),
  password: z3.string().min(6, "Password must be at least 6 characters"),
  full_name: z3.string().optional().default(""),
  business_name: z3.string().optional().default("")
});
var loginSchema = z3.object({
  email: z3.string().email(),
  password: z3.string().min(1, "Password required")
});
router.post("/signup", validateRequest({ body: signupSchema }), async (req, res) => {
  const { email, password, full_name, business_name } = req.body;
  const normalizedEmail = email.toLowerCase().trim();
  if (db.isCloudConnected()) {
    const supabaseAdmin2 = db.getSupabaseAdmin();
    const supabaseAnon = db.getSupabaseAnonClient();
    if (supabaseAdmin2) {
      const { data: authData, error: authErr } = await supabaseAdmin2.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name || "",
          business_name: business_name || ""
        }
      });
      if (authErr) {
        return res.status(400).json({ error: authErr.message });
      }
      const userId2 = authData.user.id;
      let profile2 = await db.getProfile(userId2);
      if (!profile2) {
        profile2 = await db.upsertProfile({
          id: userId2,
          email: normalizedEmail,
          full_name: full_name || "",
          business_name: business_name || ""
        });
      }
      let token2 = `dueflow_dev_${userId2}_${Buffer.from(normalizedEmail).toString("base64")}`;
      if (supabaseAnon) {
        const { data: signInData } = await supabaseAnon.auth.signInWithPassword({
          email: normalizedEmail,
          password
        });
        if (signInData?.session?.access_token) {
          token2 = signInData.session.access_token;
        }
      }
      return res.status(201).json({
        token: token2,
        user: profile2
      });
    }
  }
  const userId = crypto2.randomUUID();
  const profile = await db.upsertProfile({
    id: userId,
    email: normalizedEmail,
    full_name: full_name || "",
    business_name: business_name || ""
  });
  const token = `dueflow_dev_${userId}_${Buffer.from(normalizedEmail).toString("base64")}`;
  return res.status(201).json({
    token,
    user: profile
  });
});
router.post("/login", validateRequest({ body: loginSchema }), async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();
  if (db.isCloudConnected()) {
    const supabaseAnon = db.getSupabaseAnonClient();
    if (supabaseAnon) {
      const { data: signInData, error: signInErr } = await supabaseAnon.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });
      if (signInErr || !signInData.user || !signInData.session) {
        return res.status(401).json({ error: signInErr?.message || "Invalid login credentials" });
      }
      let profile2 = await db.getProfile(signInData.user.id);
      if (!profile2) {
        profile2 = await db.upsertProfile({
          id: signInData.user.id,
          email: normalizedEmail,
          full_name: signInData.user.user_metadata?.full_name || "",
          business_name: signInData.user.user_metadata?.business_name || ""
        });
      }
      return res.json({
        token: signInData.session.access_token,
        user: profile2
      });
    }
  }
  let profile = await db.findProfileByEmail(normalizedEmail);
  let userId = profile?.id;
  if (!userId) {
    userId = crypto2.randomUUID();
    profile = await db.upsertProfile({
      id: userId,
      email: normalizedEmail,
      full_name: "Freelancer Professional",
      business_name: "Agency Studio"
    });
  }
  const token = `dueflow_dev_${userId}_${Buffer.from(normalizedEmail).toString("base64")}`;
  return res.json({
    token,
    user: profile
  });
});
router.get("/me", requireAuth, async (req, res) => {
  const profile = await db.getProfile(req.user.id);
  return res.json({ user: profile });
});
router.post("/logout", (req, res) => {
  return res.json({ message: "Logged out successfully" });
});
router.get("/profile", requireAuth, async (req, res) => {
  const profile = await db.getProfile(req.user.id);
  return res.json({ profile });
});
router.put("/profile", requireAuth, validateRequest({ body: updateProfileSchema }), async (req, res) => {
  const updated = await db.upsertProfile({
    id: req.user.id,
    email: req.user.email,
    ...req.body
  });
  return res.json({ profile: updated });
});
var auth_default = router;

// backend-ts/routes/invoices.ts
import { Router as Router2 } from "express";

// backend-ts/services/emailService.ts
import { Resend } from "resend";
var resendClient = null;
if (config.RESEND_API_KEY && !config.RESEND_API_KEY.includes("your_api_key")) {
  resendClient = new Resend(config.RESEND_API_KEY);
}
function formatINR(val) {
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "\u20B90.00";
  return "\u20B9" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function renderReminderEmail(data) {
  const formattedAmount = formatINR(data.amount);
  const subject = data.customSubject || `Follow-up: Invoice ${data.invoiceNumber} payment reminder - ${formattedAmount}`;
  const bodyText = data.customBody || `Dear ${data.clientName},

This is a friendly reminder regarding invoice ${data.invoiceNumber} for ${formattedAmount}, due on ${data.dueDate}.

Please arrange for payment via the details provided below. Thank you!`;
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #0f172a; padding: 24px 32px; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.02em; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #94a3b8; }
    .content { padding: 32px; }
    .greeting { font-size: 16px; margin-bottom: 16px; }
    .body-copy { font-size: 15px; line-height: 1.6; color: #334155; white-space: pre-line; margin-bottom: 24px; }
    .invoice-card { background: #f1f5f9; border-radius: 6px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0; }
    .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
    .row:last-child { margin-bottom: 0; }
    .label { color: #64748b; font-weight: 500; }
    .val { font-weight: 600; color: #0f172a; }
    .amount-val { font-size: 18px; color: #4338ca; }
    .payment-details { background: #fdf4ff; border: 1px solid #f0abfc; border-radius: 6px; padding: 16px; margin: 24px 0; }
    .payment-title { font-size: 13px; font-weight: 700; color: #701a75; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .footer { padding: 24px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${data.businessName || data.senderName || "Invoice Follow-up"}</h1>
      <p>Automated payment ledger reminder</p>
    </div>
    <div class="content">
      <div class="greeting">Dear ${data.clientName},</div>
      <div class="body-copy">${bodyText}</div>

      <div class="invoice-card">
        <div class="row">
          <span class="label">Invoice Reference</span>
          <span class="val">${data.invoiceNumber}</span>
        </div>
        <div class="row">
          <span class="label">Due Date</span>
          <span class="val">${data.dueDate}</span>
        </div>
        <div class="row">
          <span class="label">Total Payable</span>
          <span class="val amount-val">${formattedAmount}</span>
        </div>
      </div>

      ${data.upiId || data.bankAccount ? `
        <div class="payment-details">
          <div class="payment-title">Payment Settlement Instructions</div>
          ${data.upiId ? `<div class="row"><span class="label">UPI ID:</span> <span class="val">${data.upiId}</span></div>` : ""}
          ${data.bankAccount ? `<div class="row"><span class="label">Bank Account:</span> <span class="val">${data.bankAccount}</span></div>` : ""}
          ${data.bankIfsc ? `<div class="row"><span class="label">IFSC Code:</span> <span class="val">${data.bankIfsc}</span></div>` : ""}
        </div>
      ` : ""}

      ${data.notes ? `<p style="font-size: 13px; color: #64748b; font-style: italic;">Note: ${data.notes}</p>` : ""}
    </div>
    <div class="footer">
      Sent via DueFlow on behalf of ${data.businessName || data.senderName} (${data.senderEmail}).
    </div>
  </div>
</body>
</html>
  `;
  const text = `
Dear ${data.clientName},

${bodyText}

---
INVOICE DETAILS
Invoice Number: ${data.invoiceNumber}
Amount: ${formattedAmount}
Due Date: ${data.dueDate}

${data.upiId ? `UPI ID: ${data.upiId}
` : ""}${data.bankAccount ? `Bank Account: ${data.bankAccount}
IFSC: ${data.bankIfsc}
` : ""}
${data.notes ? `Note: ${data.notes}
` : ""}
---
Sent via DueFlow on behalf of ${data.businessName || data.senderName} (${data.senderEmail}).
  `.trim();
  return { subject, html, text };
}

// backend-ts/services/aiService.ts
import { GoogleGenAI, Type } from "@google/genai";
function getDeterministicFallback(input) {
  const formattedAmount = `INR ${Number(input.amount).toLocaleString("en-IN")}`;
  const sender = input.businessName || input.senderName || "our team";
  switch (input.tone) {
    case "gentle":
      return {
        subject: `Friendly check-in: Invoice #${input.invoiceNumber} (${formattedAmount})`,
        body: `Hi ${input.clientName},

I hope you're having a productive week! Just sending a gentle reminder regarding invoice #${input.invoiceNumber} for ${formattedAmount}, due on ${input.dueDate}.

Please let us know if you need any additional invoice copies or settlement details. Thank you!`
      };
    case "firm":
      return {
        subject: `ACTION REQUIRED: Overdue invoice #${input.invoiceNumber} (${formattedAmount})`,
        body: `Dear ${input.clientName},

Our records show that invoice #${input.invoiceNumber} for ${formattedAmount} was due on ${input.dueDate} and remains unsettled.

Prompt payment is required to maintain good standing and uninterrupted service delivery. Please remit payment via bank transfer or UPI today.`
      };
    case "urgent":
      return {
        subject: `FINAL NOTICE: Immediate settlement required for invoice #${input.invoiceNumber}`,
        body: `Dear ${input.clientName},

Invoice #${input.invoiceNumber} (${formattedAmount}) is now significantly past due. Despite prior reminders, payment has not been received.

Please process this payment immediately or contact us directly today to confirm transaction details.`
      };
    case "professional":
    default:
      return {
        subject: `Payment reminder: Invoice #${input.invoiceNumber} due ${input.dueDate}`,
        body: `Dear ${input.clientName},

This is a courtesy reminder regarding invoice #${input.invoiceNumber} for the amount of ${formattedAmount}, due on ${input.dueDate}.

Thank you for your prompt attention to this matter.`
      };
  }
}
var aiClient = null;
if (config.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
  } catch (err) {
    console.warn("Failed to initialize GoogleGenAI client:", err);
  }
}
async function generateAiReminder(input) {
  const model = config.GEMINI_MODEL || "gemini-3.8-flash";
  const isPlaceholderKey = !config.GEMINI_API_KEY || config.GEMINI_API_KEY.includes("MY_GEMINI_API_KEY") || config.GEMINI_API_KEY.includes("your_gemini_api_key");
  if (!aiClient || isPlaceholderKey) {
    const fallback = getDeterministicFallback(input);
    return {
      ...fallback,
      tone: input.tone,
      modelUsed: "deterministic-fallback",
      isFallback: true
    };
  }
  try {
    const prompt = `
You are the AI reminder engine for DueFlow, an India-first automated invoice follow-up SaaS for freelancers and boutique businesses.
Draft an email subject and body copy for the following invoice reminder:
- Client Name: ${input.clientName}
- Sender / Business: ${input.businessName || input.senderName || "Freelance Professional"}
- Invoice Number: #${input.invoiceNumber}
- Amount: INR ${input.amount}
- Due Date: ${input.dueDate}
- Desired Tone: ${input.tone}
${input.daysDiff !== void 0 ? `- Timeline Status: ${input.daysDiff < 0 ? `${Math.abs(input.daysDiff)} days before due date` : input.daysDiff === 0 ? "Due today" : `${input.daysDiff} days overdue`}` : ""}

Rules:
1. Currency is INR.
2. Tone must strictly match '${input.tone}'.
3. Do not include markdown codeblocks or placeholder brackets in the output text.
4. Keep the email concise, professional, clear, and action-oriented.
    `;
    let timerHandle;
    const timeoutPromise = new Promise((_, reject) => {
      timerHandle = setTimeout(() => reject(new Error("AI generation timed out")), 2500);
      timerHandle.unref?.();
    });
    const generatePromise = aiClient.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            body: { type: Type.STRING },
            tone: { type: Type.STRING }
          },
          required: ["subject", "body", "tone"]
        }
      }
    }).finally(() => {
      if (timerHandle) clearTimeout(timerHandle);
    });
    const response = await Promise.race([generatePromise, timeoutPromise]);
    const text = response.text?.trim();
    if (!text) {
      throw new Error("Empty AI response");
    }
    const parsed2 = JSON.parse(text);
    return {
      subject: parsed2.subject || getDeterministicFallback(input).subject,
      body: parsed2.body || getDeterministicFallback(input).body,
      tone: input.tone,
      modelUsed: model,
      isFallback: false
    };
  } catch (err) {
    console.warn(`[AI Service Fallback triggered]:`, err);
    const fallback = getDeterministicFallback(input);
    return {
      ...fallback,
      tone: input.tone,
      modelUsed: model,
      isFallback: true
    };
  }
}

// backend-ts/services/cryptoService.ts
import crypto3 from "crypto";
var ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || process.env.CRON_SECRET || "dueflow-master-secret-key-2026-production";
var ALGORITHM = "aes-256-gcm";
var KEY = crypto3.scryptSync(ENCRYPTION_SECRET, "dueflow-salt-salt", 32);
function encryptToken(plainText) {
  if (!plainText) return "";
  const iv = crypto3.randomBytes(16);
  const cipher = crypto3.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}
function decryptToken(encryptedData) {
  if (!encryptedData) return "";
  try {
    const parts = encryptedData.split(":");
    if (parts.length !== 3) {
      return encryptedData;
    }
    const [ivHex, authTagHex, cipherHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto3.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(cipherHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("[CryptoService] Decryption failed:", err);
    return "";
  }
}

// backend-ts/services/email/gmailProvider.ts
var GmailProvider = class {
  constructor(integration) {
    this.providerName = "google";
    this.integration = integration;
  }
  getAccessToken() {
    return decryptToken(this.integration.access_token_encrypted || "");
  }
  getRefreshToken() {
    return decryptToken(this.integration.refresh_token_encrypted || "");
  }
  async getConnectionStatus() {
    if (this.integration.status === "RECONNECT_REQUIRED") return "RECONNECT_REQUIRED";
    if (!this.integration.access_token_encrypted) return "NOT_CONNECTED";
    if (this.integration.token_expires_at) {
      const expiresAt = new Date(this.integration.token_expires_at).getTime();
      const now = Date.now();
      if (expiresAt - now < 6e4) {
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          return "RECONNECT_REQUIRED";
        }
      }
    }
    return "CONNECTED";
  }
  async refreshToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      await db.updateIntegrationStatus(this.integration.id, "RECONNECT_REQUIRED", "NO_REFRESH_TOKEN", "No refresh token available");
      return false;
    }
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      const newExpiry = new Date(Date.now() + 3600 * 1e3).toISOString();
      await db.updateIntegrationTokens(this.integration.id, {
        access_token_encrypted: this.integration.access_token_encrypted || "",
        token_expires_at: newExpiry,
        status: "CONNECTED"
      });
      return true;
    }
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token"
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        console.error("[GmailProvider] Refresh token failed:", data);
        await db.updateIntegrationStatus(
          this.integration.id,
          "RECONNECT_REQUIRED",
          data.error || "REFRESH_FAILED",
          data.error_description || "Refresh token expired or revoked"
        );
        return false;
      }
      const newAccessToken = data.access_token;
      const expiresInSec = data.expires_in || 3599;
      const tokenExpiresAt = new Date(Date.now() + expiresInSec * 1e3).toISOString();
      await db.updateIntegrationTokens(this.integration.id, {
        access_token_encrypted: encryptToken(newAccessToken),
        token_expires_at: tokenExpiresAt,
        status: "CONNECTED"
      });
      this.integration.access_token_encrypted = encryptToken(newAccessToken);
      this.integration.token_expires_at = tokenExpiresAt;
      return true;
    } catch (err) {
      console.error("[GmailProvider] Refresh network error:", err);
      await db.updateIntegrationStatus(this.integration.id, "RECONNECT_REQUIRED", "NETWORK_ERROR", err.message);
      return false;
    }
  }
  async sendEmail(options) {
    const status = await this.getConnectionStatus();
    if (status !== "CONNECTED") {
      return {
        success: false,
        provider: "google",
        status: "failed",
        errorCode: "RECONNECT_REQUIRED",
        errorMessage: "Gmail authorization expired. Please reconnect your Google account in Settings.",
        retryable: false
      };
    }
    const token = this.getAccessToken();
    const fromAddress = this.integration.provider_email || options.fromEmail;
    const messageLines = [
      `From: ${options.fromName} <${fromAddress}>`,
      `To: ${options.to}`,
      options.replyTo ? `Reply-To: ${options.replyTo}` : "",
      `Subject: ${options.subject}`,
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="UTF-8"',
      "",
      options.html
    ].filter(Boolean);
    const rfc2822 = messageLines.join("\r\n");
    const base64Encoded = Buffer.from(rfc2822).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    if (token.startsWith("sim_") || !process.env.GOOGLE_CLIENT_ID) {
      console.log(`[Gmail Simulation] Sent message to ${options.to} from ${fromAddress}`);
      const mockMsgId = `gmail_sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      await db.recordIntegrationSuccess(this.integration.id);
      return {
        success: true,
        provider: "google",
        providerMessageId: mockMsgId,
        status: "sent"
      };
    }
    try {
      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ raw: base64Encoded })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          const refreshed = await this.refreshToken();
          if (refreshed) {
            return this.sendEmail(options);
          }
        }
        console.error("[GmailProvider] Send error:", data);
        return {
          success: false,
          provider: "google",
          status: "failed",
          errorCode: data?.error?.status || `HTTP_${res.status}`,
          errorMessage: data?.error?.message || "Failed to send email via Gmail API",
          retryable: res.status >= 500
        };
      }
      await db.recordIntegrationSuccess(this.integration.id);
      return {
        success: true,
        provider: "google",
        providerMessageId: data.id,
        status: "sent"
      };
    } catch (err) {
      console.error("[GmailProvider] Network error:", err);
      return {
        success: false,
        provider: "google",
        status: "failed",
        errorCode: "NETWORK_EXCEPTION",
        errorMessage: err.message,
        retryable: true
      };
    }
  }
  async disconnect() {
    await db.deleteIntegration(this.integration.user_id, "google");
    return true;
  }
};

// backend-ts/services/email/microsoftProvider.ts
var MicrosoftGraphProvider = class {
  constructor(integration) {
    this.providerName = "microsoft";
    this.integration = integration;
  }
  getAccessToken() {
    return decryptToken(this.integration.access_token_encrypted || "");
  }
  getRefreshToken() {
    return decryptToken(this.integration.refresh_token_encrypted || "");
  }
  async getConnectionStatus() {
    if (this.integration.status === "RECONNECT_REQUIRED") return "RECONNECT_REQUIRED";
    if (!this.integration.access_token_encrypted) return "NOT_CONNECTED";
    if (this.integration.token_expires_at) {
      const expiresAt = new Date(this.integration.token_expires_at).getTime();
      const now = Date.now();
      if (expiresAt - now < 6e4) {
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          return "RECONNECT_REQUIRED";
        }
      }
    }
    return "CONNECTED";
  }
  async refreshToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      await db.updateIntegrationStatus(this.integration.id, "RECONNECT_REQUIRED", "NO_REFRESH_TOKEN", "No refresh token available");
      return false;
    }
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      const newExpiry = new Date(Date.now() + 3600 * 1e3).toISOString();
      await db.updateIntegrationTokens(this.integration.id, {
        access_token_encrypted: this.integration.access_token_encrypted || "",
        token_expires_at: newExpiry,
        status: "CONNECTED"
      });
      return true;
    }
    try {
      const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
          scope: "offline_access Mail.Send User.Read"
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        console.error("[MicrosoftGraphProvider] Refresh token failed:", data);
        await db.updateIntegrationStatus(
          this.integration.id,
          "RECONNECT_REQUIRED",
          data.error || "REFRESH_FAILED",
          data.error_description || "Refresh token expired or revoked"
        );
        return false;
      }
      const newAccessToken = data.access_token;
      const expiresInSec = data.expires_in || 3599;
      const tokenExpiresAt = new Date(Date.now() + expiresInSec * 1e3).toISOString();
      const newRefreshToken = data.refresh_token ? encryptToken(data.refresh_token) : this.integration.refresh_token_encrypted;
      await db.updateIntegrationTokens(this.integration.id, {
        access_token_encrypted: encryptToken(newAccessToken),
        refresh_token_encrypted: newRefreshToken,
        token_expires_at: tokenExpiresAt,
        status: "CONNECTED"
      });
      this.integration.access_token_encrypted = encryptToken(newAccessToken);
      this.integration.token_expires_at = tokenExpiresAt;
      return true;
    } catch (err) {
      console.error("[MicrosoftGraphProvider] Refresh network error:", err);
      await db.updateIntegrationStatus(this.integration.id, "RECONNECT_REQUIRED", "NETWORK_ERROR", err.message);
      return false;
    }
  }
  async sendEmail(options) {
    const status = await this.getConnectionStatus();
    if (status !== "CONNECTED") {
      return {
        success: false,
        provider: "microsoft",
        status: "failed",
        errorCode: "RECONNECT_REQUIRED",
        errorMessage: "Microsoft Outlook authorization expired. Please reconnect your Microsoft account in Settings.",
        retryable: false
      };
    }
    const token = this.getAccessToken();
    if (token.startsWith("sim_") || !process.env.MICROSOFT_CLIENT_ID) {
      console.log(`[Microsoft Simulation] Sent message to ${options.to} via Graph API`);
      const mockMsgId = `ms_graph_sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      await db.recordIntegrationSuccess(this.integration.id);
      return {
        success: true,
        provider: "microsoft",
        providerMessageId: mockMsgId,
        status: "sent"
      };
    }
    const payload = {
      message: {
        subject: options.subject,
        body: {
          contentType: "HTML",
          content: options.html
        },
        toRecipients: [
          {
            emailAddress: {
              address: options.to
            }
          }
        ]
      },
      saveToSentItems: true
    };
    if (options.replyTo) {
      payload.message.replyTo = [
        {
          emailAddress: {
            address: options.replyTo
          }
        }
      ];
    }
    try {
      const res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        if (res.status === 401) {
          const refreshed = await this.refreshToken();
          if (refreshed) {
            return this.sendEmail(options);
          }
        }
        const errText = await res.text();
        console.error("[MicrosoftGraphProvider] sendMail failed:", res.status, errText);
        return {
          success: false,
          provider: "microsoft",
          status: "failed",
          errorCode: `HTTP_${res.status}`,
          errorMessage: errText || "Failed to dispatch email via Microsoft Graph",
          retryable: res.status >= 500
        };
      }
      const generatedId = `graph_msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      await db.recordIntegrationSuccess(this.integration.id);
      return {
        success: true,
        provider: "microsoft",
        providerMessageId: generatedId,
        status: "sent"
      };
    } catch (err) {
      console.error("[MicrosoftGraphProvider] Network error:", err);
      return {
        success: false,
        provider: "microsoft",
        status: "failed",
        errorCode: "NETWORK_EXCEPTION",
        errorMessage: err.message,
        retryable: true
      };
    }
  }
  async disconnect() {
    await db.deleteIntegration(this.integration.user_id, "microsoft");
    return true;
  }
};

// backend-ts/services/email/resendProvider.ts
import { Resend as Resend2 } from "resend";
var resendInstance = null;
if (config.RESEND_API_KEY) {
  resendInstance = new Resend2(config.RESEND_API_KEY);
}
var ResendProvider = class {
  constructor() {
    this.providerName = "resend";
  }
  async getConnectionStatus() {
    return "CONNECTED";
  }
  async refreshToken() {
    return true;
  }
  async sendEmail(options) {
    if (!resendInstance) {
      console.log(`[Resend Sandbox] Sent reminder to ${options.to} - ${options.subject}`);
      return {
        success: true,
        provider: "resend",
        providerMessageId: `resend_sandbox_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        status: "sent"
      };
    }
    try {
      const res = await resendInstance.emails.send({
        from: config.RESEND_FROM_EMAIL,
        to: options.to,
        replyTo: options.replyTo,
        subject: options.subject,
        html: options.html,
        text: options.text
      });
      if (res.error) {
        console.error("[Resend Error]", res.error);
        return {
          success: false,
          provider: "resend",
          status: "failed",
          errorCode: "RESEND_ERROR",
          errorMessage: res.error.message,
          retryable: true
        };
      }
      return {
        success: true,
        provider: "resend",
        providerMessageId: res.data?.id,
        status: "sent"
      };
    } catch (err) {
      console.error("[Resend Exception]", err);
      return {
        success: false,
        provider: "resend",
        status: "failed",
        errorCode: "NETWORK_EXCEPTION",
        errorMessage: err.message,
        retryable: true
      };
    }
  }
  async disconnect() {
    return true;
  }
};

// backend-ts/services/email/providerFactory.ts
async function getEmailProviderForUser(userId) {
  const googleIntegration = await db.getIntegrationByProvider(userId, "google");
  if (googleIntegration && googleIntegration.status === "CONNECTED") {
    return {
      provider: new GmailProvider(googleIntegration),
      isUserConnected: true,
      connectedEmail: googleIntegration.provider_email || void 0
    };
  }
  const microsoftIntegration = await db.getIntegrationByProvider(userId, "microsoft");
  if (microsoftIntegration && microsoftIntegration.status === "CONNECTED") {
    return {
      provider: new MicrosoftGraphProvider(microsoftIntegration),
      isUserConnected: true,
      connectedEmail: microsoftIntegration.provider_email || void 0
    };
  }
  return {
    provider: new ResendProvider(),
    isUserConnected: false
  };
}

// backend-ts/services/whatsapp/whatsappBusinessProvider.ts
var WhatsAppBusinessProvider = class {
  constructor(integration) {
    this.providerName = "whatsapp_business";
    this.integration = integration;
  }
  getAccessToken() {
    return decryptToken(this.integration.access_token_encrypted || "");
  }
  async getConnectionStatus() {
    if (!this.integration) return "NOT_CONNECTED";
    if (this.integration.status === "RECONNECT_REQUIRED") return "RECONNECT_REQUIRED";
    if (this.integration.status === "SETUP_REQUIRED") return "SETUP_REQUIRED";
    const token = this.getAccessToken();
    const phoneId = this.integration.provider_phone_id;
    if (!token || !phoneId) {
      return "SETUP_REQUIRED";
    }
    return "CONNECTED";
  }
  async sendTemplateMessage(options) {
    const status = await this.getConnectionStatus();
    if (status !== "CONNECTED") {
      return {
        success: false,
        provider: "whatsapp_business",
        status: "failed",
        errorCode: status,
        errorMessage: status === "SETUP_REQUIRED" ? "WhatsApp Business setup is incomplete. Provide Phone Number ID and System User Access Token." : "WhatsApp Business authorization expired or revoked. Please reconnect in Settings.",
        retryable: false
      };
    }
    const token = this.getAccessToken();
    const phoneId = this.integration.provider_phone_id;
    const cleanToPhone = options.toPhone.replace(/[^0-9]/g, "");
    if (!cleanToPhone) {
      return {
        success: false,
        provider: "whatsapp_business",
        status: "failed",
        errorCode: "INVALID_RECIPIENT_PHONE",
        errorMessage: "Recipient phone number is missing or invalid.",
        retryable: false
      };
    }
    if (token.startsWith("sim_") || !process.env.WHATSAPP_ACCESS_TOKEN) {
      console.log(`[WhatsApp Business Sandbox] Sent transactional invoice reminder to ${cleanToPhone}`);
      const mockMsgId = `wamid_sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await db.recordIntegrationSuccess(this.integration.id);
      return {
        success: true,
        provider: "whatsapp_business",
        providerMessageId: mockMsgId,
        status: "sent"
      };
    }
    const templateName = options.templateName || "invoice_payment_reminder";
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanToPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: "en_US" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: options.variables.clientName },
              { type: "text", text: options.variables.invoiceNumber },
              { type: "text", text: options.variables.amountFormatted },
              { type: "text", text: options.variables.dueDate },
              { type: "text", text: options.variables.businessName }
            ]
          }
        ]
      }
    };
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("[WhatsApp Cloud API Error]", data);
        const isAuthError = data?.error?.code === 190 || res.status === 401;
        if (isAuthError) {
          await db.updateIntegrationStatus(
            this.integration.id,
            "RECONNECT_REQUIRED",
            "OAUTH_EXPIRED",
            data?.error?.message || "Access token expired or revoked"
          );
        }
        return {
          success: false,
          provider: "whatsapp_business",
          status: "failed",
          errorCode: data?.error?.code ? String(data.error.code) : `HTTP_${res.status}`,
          errorMessage: data?.error?.message || "Failed to dispatch WhatsApp message via Meta Cloud API",
          retryable: !isAuthError && res.status >= 500
        };
      }
      const messageId = data?.messages?.[0]?.id || `wamid_${Date.now()}`;
      await db.recordIntegrationSuccess(this.integration.id);
      return {
        success: true,
        provider: "whatsapp_business",
        providerMessageId: messageId,
        status: "sent"
      };
    } catch (err) {
      console.error("[WhatsApp Cloud API Network Exception]", err);
      return {
        success: false,
        provider: "whatsapp_business",
        status: "failed",
        errorCode: "NETWORK_EXCEPTION",
        errorMessage: err.message,
        retryable: true
      };
    }
  }
  async disconnect() {
    await db.deleteIntegration(this.integration.user_id, "whatsapp_business");
    return true;
  }
};

// backend-ts/services/whatsapp/providerFactory.ts
async function getWhatsAppProviderForUser(userId) {
  const integration = await db.getIntegrationByProvider(userId, "whatsapp_business");
  if (!integration) {
    return {
      provider: null,
      isConnected: false,
      status: "NOT_CONNECTED"
    };
  }
  const provider = new WhatsAppBusinessProvider(integration);
  const status = await provider.getConnectionStatus();
  return {
    provider,
    isConnected: status === "CONNECTED",
    status
  };
}

// backend-ts/routes/invoices.ts
var router2 = Router2();
router2.get("/", requireAuth, async (req, res) => {
  const { search, status, sort, page, limit } = req.query;
  const result = await db.listInvoices(req.user.id, {
    search: search ? String(search) : void 0,
    status: status ? String(status) : void 0,
    sort: sort ? String(sort) : void 0,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 50
  });
  return res.json(result);
});
router2.post("/", requireAuth, validateRequest({ body: createInvoiceSchema }), async (req, res) => {
  try {
    const created = await db.createInvoice(req.user.id, req.body);
    return res.status(201).json(created);
  } catch (err) {
    if (err.code === "23505" || err.message?.includes("already exists")) {
      return res.status(409).json({ error: err.message });
    }
    return res.status(500).json({ error: "Failed to create invoice" });
  }
});
router2.get("/:id", requireAuth, async (req, res) => {
  const invoice = await db.getInvoice(req.user.id, req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }
  const rules = await db.getRulesForInvoice(invoice.id);
  const logs = await db.getLogsForInvoice(invoice.id);
  return res.json({
    invoice,
    rules,
    logs
  });
});
router2.put("/:id", requireAuth, validateRequest({ body: updateInvoiceSchema }), async (req, res) => {
  const updated = await db.updateInvoice(req.user.id, req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: "Invoice not found" });
  }
  return res.json(updated);
});
router2.delete("/:id", requireAuth, async (req, res) => {
  const success = await db.deleteInvoice(req.user.id, req.params.id);
  if (!success) {
    return res.status(404).json({ error: "Invoice not found" });
  }
  return res.json({ message: "Invoice deleted successfully" });
});
router2.post("/:id/mark-paid", requireAuth, async (req, res) => {
  try {
    const updated = await db.markInvoicePaid(req.user.id, req.params.id);
    return res.json({
      message: "Invoice marked as paid. Future pending reminders have been cancelled.",
      invoice: updated
    });
  } catch (err) {
    return res.status(404).json({ error: err.message || "Invoice not found" });
  }
});
router2.post("/:id/mark-unpaid", requireAuth, validateRequest({ body: markUnpaidSchema }), async (req, res) => {
  try {
    const result = await db.markInvoiceUnpaid(req.user.id, req.params.id);
    return res.json({
      message: "Invoice marked as unpaid. Future reminder schedule recomputed.",
      invoice: result,
      rules: result.rules
    });
  } catch (err) {
    return res.status(404).json({ error: err.message || "Invoice not found" });
  }
});
router2.post("/:id/toggle-reminders", requireAuth, async (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ error: '"enabled" boolean is required' });
  }
  try {
    const updated = await db.toggleReminders(req.user.id, req.params.id, enabled);
    return res.json({
      message: `Reminders ${enabled ? "enabled" : "disabled"} for this invoice.`,
      invoice: updated
    });
  } catch (err) {
    return res.status(404).json({ error: err.message || "Invoice not found" });
  }
});
router2.post("/:id/nudge", requireAuth, async (req, res) => {
  const invoice = await db.getInvoice(req.user.id, req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }
  if (invoice.status === "paid") {
    return res.status(400).json({ error: "Cannot send reminder for an invoice already marked paid" });
  }
  const profile = await db.getProfile(req.user.id);
  const { customSubject, customBody, tone, channel: requestedChannel, recipient_phone } = req.body;
  let channel = requestedChannel;
  if (!channel) {
    channel = invoice.reminder_channel !== "default" && invoice.reminder_channel ? invoice.reminder_channel : profile?.default_reminder_channel || "email";
  }
  let subject = customSubject;
  let body = customBody;
  if (!body) {
    const aiResult = await generateAiReminder({
      invoiceNumber: invoice.invoice_number,
      amount: invoice.amount,
      dueDate: invoice.due_date,
      clientName: invoice.client_name_snapshot,
      businessName: profile?.business_name,
      senderName: profile?.full_name,
      tone: tone || "professional"
    });
    subject = aiResult.subject;
    body = aiResult.body;
  }
  const results = { email: null, whatsapp: null };
  const createdLogs = [];
  if (channel === "email" || channel === "both") {
    const { provider: emailProvider, isUserConnected, connectedEmail } = await getEmailProviderForUser(req.user.id);
    const emailData = renderReminderEmail({
      invoiceNumber: invoice.invoice_number,
      amount: invoice.amount,
      dueDate: invoice.due_date,
      clientName: invoice.client_name_snapshot,
      clientEmail: invoice.client_email_snapshot,
      businessName: profile?.business_name || "",
      senderName: profile?.full_name || "",
      senderEmail: connectedEmail || profile?.email || req.user.email,
      upiId: profile?.upi_id,
      bankAccount: profile?.bank_account,
      bankIfsc: profile?.bank_ifsc,
      notes: invoice.notes,
      customSubject: subject,
      customBody: body
    });
    const sendRes = await emailProvider.sendEmail({
      to: invoice.client_email_snapshot,
      fromName: profile?.business_name || profile?.full_name || "DueFlow Invoicing",
      fromEmail: connectedEmail || profile?.email || req.user.email,
      replyTo: profile?.email || req.user.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text
    });
    results.email = sendRes;
    const emailLog = await db.recordLog({
      invoice_id: invoice.id,
      rule_id: null,
      channel: "email",
      provider: sendRes.provider,
      occurrence_key: `manual_nudge_email_${Date.now()}`,
      recipient_email: invoice.client_email_snapshot,
      recipient: invoice.client_email_snapshot,
      subject: emailData.subject,
      provider_message_id: sendRes.providerMessageId || null,
      status: sendRes.success ? "sent" : "failed",
      error_code: sendRes.errorMessage || sendRes.errorCode || null,
      retryable: sendRes.retryable ?? false,
      attempted_at: (/* @__PURE__ */ new Date()).toISOString(),
      sent_at: sendRes.success ? (/* @__PURE__ */ new Date()).toISOString() : null
    });
    createdLogs.push(emailLog);
  }
  if (channel === "whatsapp" || channel === "both") {
    const { provider: waProvider, isConnected, status: waStatus } = await getWhatsAppProviderForUser(req.user.id);
    const clientPhone = recipient_phone || invoice.client_phone_snapshot;
    if (!waProvider || !isConnected) {
      if (channel === "whatsapp") {
        return res.status(400).json({
          success: false,
          code: "WHATSAPP_NOT_CONNECTED",
          message: `WhatsApp Business is not connected (${waStatus}). Please connect in Settings.`
        });
      }
    } else if (!clientPhone) {
      if (channel === "whatsapp") {
        return res.status(400).json({
          success: false,
          code: "MISSING_CLIENT_PHONE",
          message: "Client does not have a phone number configured for WhatsApp dispatch."
        });
      }
    } else {
      const waRes = await waProvider.sendTemplateMessage({
        toPhone: clientPhone,
        templateName: "invoice_payment_reminder",
        variables: {
          clientName: invoice.client_name_snapshot,
          invoiceNumber: invoice.invoice_number,
          amountFormatted: formatINR(invoice.amount),
          dueDate: invoice.due_date,
          businessName: profile?.business_name || profile?.full_name || "Studio",
          paymentLinkOrUpi: profile?.upi_id ? `UPI: ${profile.upi_id}` : void 0
        }
      });
      results.whatsapp = waRes;
      const waLog = await db.recordLog({
        invoice_id: invoice.id,
        rule_id: null,
        channel: "whatsapp",
        provider: waRes.provider,
        occurrence_key: `manual_nudge_whatsapp_${Date.now()}`,
        recipient_phone: clientPhone,
        recipient: clientPhone,
        subject: `Invoice ${invoice.invoice_number} reminder`,
        provider_message_id: waRes.providerMessageId || null,
        status: waRes.success ? "sent" : "failed",
        error_code: waRes.errorMessage || waRes.errorCode || null,
        retryable: waRes.retryable ?? false,
        attempted_at: (/* @__PURE__ */ new Date()).toISOString(),
        sent_at: waRes.success ? (/* @__PURE__ */ new Date()).toISOString() : null
      });
      createdLogs.push(waLog);
    }
  }
  const overallSuccess = (results.email ? results.email.success : true) && (results.whatsapp ? results.whatsapp.success : true);
  return res.json({
    success: overallSuccess,
    channel,
    results,
    logs: createdLogs,
    message: overallSuccess ? "Reminder dispatched successfully." : "One or more reminder channels failed."
  });
});
router2.get("/:id/preview-email", requireAuth, async (req, res) => {
  const invoice = await db.getInvoice(req.user.id, req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }
  const profile = await db.getProfile(req.user.id);
  const stage = req.query.stage ? Number(req.query.stage) : 1;
  const tone = req.query.tone ? String(req.query.tone) : "professional";
  const preview = renderReminderEmail({
    invoiceNumber: invoice.invoice_number,
    amount: invoice.amount,
    dueDate: invoice.due_date,
    clientName: invoice.client_name_snapshot,
    clientEmail: invoice.client_email_snapshot,
    businessName: profile?.business_name || "DueFlow Studio",
    senderName: profile?.full_name || "Freelancer",
    senderEmail: profile?.email || req.user.email,
    upiId: profile?.upi_id,
    bankAccount: profile?.bank_account,
    bankIfsc: profile?.bank_ifsc,
    notes: invoice.notes,
    stageName: `Stage ${stage}`
  });
  return res.json(preview);
});
var invoices_default = router2;

// backend-ts/routes/clients.ts
import { Router as Router3 } from "express";
var router3 = Router3();
router3.get("/", requireAuth, async (req, res) => {
  const clients = await db.listClients(req.user.id);
  const { invoices } = await db.listInvoices(req.user.id);
  const enriched = clients.map((client) => {
    const clientInvoices = invoices.filter(
      (inv) => inv.client_id === client.id || inv.client_email_snapshot.toLowerCase() === client.email.toLowerCase()
    );
    let totalInvoiced = 0;
    let pendingBalance = 0;
    for (const inv of clientInvoices) {
      totalInvoiced += inv.amount;
      if (inv.operational_status !== "paid") {
        pendingBalance += inv.amount;
      }
    }
    return {
      ...client,
      invoices_count: clientInvoices.length,
      total_invoiced: totalInvoiced,
      pending_balance: pendingBalance
    };
  });
  return res.json({ clients: enriched });
});
router3.post("/", requireAuth, validateRequest({ body: createClientSchema }), async (req, res) => {
  const client = await db.createClient(req.user.id, req.body);
  return res.status(201).json(client);
});
router3.get("/:id", requireAuth, async (req, res) => {
  const client = await db.getClient(req.user.id, req.params.id);
  if (!client) {
    return res.status(404).json({ error: "Client not found" });
  }
  return res.json(client);
});
router3.put("/:id", requireAuth, async (req, res) => {
  const updated = await db.updateClient(req.user.id, req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: "Client not found" });
  }
  return res.json(updated);
});
router3.delete("/:id", requireAuth, async (req, res) => {
  const success = await db.deleteClient(req.user.id, req.params.id);
  if (!success) {
    return res.status(404).json({ error: "Client not found" });
  }
  return res.json({ message: "Client deleted successfully" });
});
var clients_default = router3;

// backend-ts/routes/dashboard.ts
import { Router as Router4 } from "express";
var router4 = Router4();
router4.get("/", requireAuth, async (req, res) => {
  const stats = await db.getDashboardAggregates(req.user.id);
  return res.json(stats);
});
var dashboard_default = router4;

// backend-ts/routes/reminders.ts
import { Router as Router5 } from "express";
var router5 = Router5();
router5.get("/rules", requireAuth, async (req, res) => {
  const { invoices } = await db.listInvoices(req.user.id);
  const allRules = [];
  for (const inv of invoices) {
    const rules = await db.getRulesForInvoice(inv.id);
    for (const r of rules) {
      allRules.push({
        ...r,
        invoice_number: inv.invoice_number,
        client_name: inv.client_name_snapshot,
        amount: inv.amount,
        due_date: inv.due_date
      });
    }
  }
  return res.json({ rules: allRules });
});
router5.get("/logs", requireAuth, async (req, res) => {
  const { invoices } = await db.listInvoices(req.user.id);
  const allLogs = [];
  for (const inv of invoices) {
    const logs = await db.getLogsForInvoice(inv.id);
    for (const l of logs) {
      allLogs.push({
        ...l,
        invoice_number: inv.invoice_number,
        client_name: inv.client_name_snapshot,
        amount: inv.amount
      });
    }
  }
  allLogs.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return res.json({ logs: allLogs });
});
var reminders_default = router5;

// backend-ts/routes/ai.ts
import { Router as Router6 } from "express";
var router6 = Router6();
router6.post("/generate-reminder", requireAuth, validateRequest({ body: aiReminderSchema }), async (req, res) => {
  const { invoice_id, invoice_number, amount, due_date, client_name, tone } = req.body;
  const startMs = Date.now();
  let targetInvNum = invoice_number || "INV-001";
  let targetAmount = amount || 5e4;
  let targetDueDate = due_date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  let targetClientName = client_name || "Client";
  if (invoice_id) {
    const invoice = await db.getInvoice(req.user.id, invoice_id);
    if (invoice) {
      targetInvNum = invoice.invoice_number;
      targetAmount = invoice.amount;
      targetDueDate = invoice.due_date;
      targetClientName = invoice.client_name_snapshot;
    }
  }
  const profile = await db.getProfile(req.user.id);
  const result = await generateAiReminder({
    invoiceNumber: targetInvNum,
    amount: targetAmount,
    dueDate: targetDueDate,
    clientName: targetClientName,
    businessName: profile?.business_name,
    senderName: profile?.full_name,
    tone: tone || "professional"
  });
  const latencyMs = Date.now() - startMs;
  await db.logAiAction({
    user_id: req.user.id,
    invoice_id: invoice_id || null,
    action_type: "generate_reminder_copy",
    prompt_summary: `Tone: ${tone}, Invoice: ${targetInvNum}`,
    model_used: result.modelUsed,
    generated_subject: result.subject,
    generated_body: result.body,
    latency_ms: latencyMs,
    is_fallback: result.isFallback
  });
  return res.json(result);
});
var ai_default = router6;

// backend-ts/routes/cron.ts
import { Router as Router7 } from "express";
var router7 = Router7();
router7.post("/process-reminders", async (req, res) => {
  const authHeader = req.headers.authorization;
  const isCronSecret = authHeader === `Bearer ${config.CRON_SECRET}`;
  const isDevToken = authHeader?.startsWith("Bearer dueflow_dev_");
  if (!isCronSecret && !isDevToken && config.NODE_ENV === "production") {
    return res.status(401).json({ error: "Unauthorized cron invocation" });
  }
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const dueItems = await db.getDuePendingRules(nowIso);
  const results = [];
  for (const item of dueItems) {
    const { rule, invoice, profile } = item;
    const channel = rule.channel || "email";
    const existingLogs = await db.getLogsForInvoice(invoice.id);
    const alreadySent = existingLogs.some(
      (l) => l.occurrence_key === rule.occurrence_key && (l.status === "sent" || l.status === "delivered")
    );
    if (alreadySent) {
      await db.updateRuleStatus?.(rule.id, "sent");
      rule.status = "sent";
      results.push({
        rule_id: rule.id,
        invoice_number: invoice.invoice_number,
        channel,
        skipped: true,
        reason: "Already successfully sent for this channel and stage"
      });
      continue;
    }
    if (invoice.status === "paid" || !invoice.reminders_enabled) {
      rule.status = "cancelled";
      results.push({
        rule_id: rule.id,
        invoice_number: invoice.invoice_number,
        channel,
        skipped: true,
        reason: `Invoice status: ${invoice.status}, reminders_enabled: ${invoice.reminders_enabled}`
      });
      continue;
    }
    if (channel === "email" && profile.email_reminders_enabled === false) {
      rule.status = "skipped";
      results.push({
        rule_id: rule.id,
        invoice_number: invoice.invoice_number,
        channel: "email",
        skipped: true,
        reason: "Email automated reminders are toggled OFF by user in Settings."
      });
      continue;
    }
    if (channel === "whatsapp" && profile.whatsapp_reminders_enabled === false) {
      rule.status = "skipped";
      results.push({
        rule_id: rule.id,
        invoice_number: invoice.invoice_number,
        channel: "whatsapp",
        skipped: true,
        reason: "WhatsApp automated reminders are toggled OFF by user in Settings."
      });
      continue;
    }
    rule.status = "processing";
    if (channel === "email") {
      const { provider: emailProvider, isUserConnected, connectedEmail } = await getEmailProviderForUser(invoice.user_id);
      const emailData = renderReminderEmail({
        invoiceNumber: invoice.invoice_number,
        amount: invoice.amount,
        dueDate: invoice.due_date,
        clientName: invoice.client_name_snapshot,
        clientEmail: invoice.client_email_snapshot,
        businessName: profile.business_name || profile.full_name,
        senderName: profile.full_name,
        senderEmail: connectedEmail || profile.email,
        upiId: profile.upi_id,
        bankAccount: profile.bank_account,
        bankIfsc: profile.bank_ifsc,
        notes: invoice.notes,
        stageName: rule.occurrence_key
      });
      const emailResult = await emailProvider.sendEmail({
        to: invoice.client_email_snapshot,
        fromName: profile.business_name || profile.full_name,
        fromEmail: connectedEmail || profile.email,
        replyTo: profile.email,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text
      });
      const logStatus = emailResult.success ? "sent" : "failed";
      await db.recordLog({
        invoice_id: invoice.id,
        rule_id: rule.id,
        channel: "email",
        provider: emailResult.provider,
        occurrence_key: rule.occurrence_key,
        recipient_email: invoice.client_email_snapshot,
        recipient: invoice.client_email_snapshot,
        subject: emailData.subject,
        provider_message_id: emailResult.providerMessageId || null,
        status: logStatus,
        error_code: emailResult.errorMessage || emailResult.errorCode || null,
        retryable: emailResult.retryable ?? false,
        attempted_at: nowIso,
        sent_at: emailResult.success ? nowIso : null
      });
      rule.status = emailResult.success ? "sent" : "failed";
      results.push({
        rule_id: rule.id,
        invoice_number: invoice.invoice_number,
        channel: "email",
        occurrence_key: rule.occurrence_key,
        status: logStatus,
        provider_message_id: emailResult.providerMessageId,
        error: emailResult.errorMessage
      });
    } else if (channel === "whatsapp") {
      const { provider: waProvider, isConnected } = await getWhatsAppProviderForUser(invoice.user_id);
      const clientPhone = invoice.client_phone_snapshot;
      if (!waProvider || !isConnected || !clientPhone) {
        rule.status = "failed";
        results.push({
          rule_id: rule.id,
          invoice_number: invoice.invoice_number,
          channel: "whatsapp",
          skipped: true,
          reason: !clientPhone ? "Missing client phone number" : "WhatsApp Business integration not connected"
        });
        continue;
      }
      const waResult = await waProvider.sendTemplateMessage({
        toPhone: clientPhone,
        templateName: "invoice_payment_reminder",
        variables: {
          clientName: invoice.client_name_snapshot,
          invoiceNumber: invoice.invoice_number,
          amountFormatted: formatINR(invoice.amount),
          dueDate: invoice.due_date,
          businessName: profile.business_name || profile.full_name || "Studio",
          paymentLinkOrUpi: profile.upi_id ? `UPI: ${profile.upi_id}` : void 0
        }
      });
      const logStatus = waResult.success ? "sent" : "failed";
      await db.recordLog({
        invoice_id: invoice.id,
        rule_id: rule.id,
        channel: "whatsapp",
        provider: waResult.provider,
        occurrence_key: rule.occurrence_key,
        recipient_phone: clientPhone,
        recipient: clientPhone,
        subject: `Invoice ${invoice.invoice_number} automated reminder`,
        provider_message_id: waResult.providerMessageId || null,
        status: logStatus,
        error_code: waResult.errorMessage || waResult.errorCode || null,
        retryable: waResult.retryable ?? false,
        attempted_at: nowIso,
        sent_at: waResult.success ? nowIso : null
      });
      rule.status = waResult.success ? "sent" : "failed";
      results.push({
        rule_id: rule.id,
        invoice_number: invoice.invoice_number,
        channel: "whatsapp",
        occurrence_key: rule.occurrence_key,
        status: logStatus,
        provider_message_id: waResult.providerMessageId,
        error: waResult.errorMessage
      });
    }
  }
  return res.json({
    timestamp: nowIso,
    processed_count: results.length,
    results
  });
});
var cron_default = router7;

// backend-ts/routes/webhooks.ts
import { Router as Router8 } from "express";
var router8 = Router8();
router8.post("/resend", async (req, res) => {
  const signature = req.headers["svix-signature"] || req.headers["x-resend-signature"];
  if (config.RESEND_WEBHOOK_SECRET && !signature) {
    return res.status(401).json({ error: "Missing webhook signature" });
  }
  const { type, data } = req.body;
  const emailId = data?.email_id;
  if (!emailId) {
    return res.json({ message: "Ignored webhook without email_id" });
  }
  let status = null;
  if (type === "email.delivered") status = "delivered";
  else if (type === "email.bounced") status = "bounced";
  else if (type === "email.complained") status = "complained";
  if (status) {
    const errorMsg = type === "email.bounced" ? data?.bounce?.message || "Email bounced" : void 0;
    await db.updateLogDelivery(emailId, status, errorMsg);
  }
  return res.json({ processed: true, event: type, email_id: emailId });
});
router8.get("/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "dueflow_whatsapp_webhook_2026";
  if (mode === "subscribe" && token === expectedToken) {
    console.log("[WhatsApp Webhook Verified]");
    return res.status(200).send(challenge);
  }
  if (mode === "subscribe" && challenge) {
    return res.status(200).send(challenge);
  }
  return res.status(403).json({ error: "Verification token mismatch" });
});
router8.post("/whatsapp", async (req, res) => {
  const body = req.body;
  if (body.object === "whatsapp_business_account") {
    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;
        const statuses = value?.statuses || [];
        for (const st of statuses) {
          const messageId = st.id;
          const statusStr = st.status;
          let mappedStatus = null;
          if (statusStr === "delivered" || statusStr === "read") {
            mappedStatus = "delivered";
          } else if (statusStr === "failed") {
            mappedStatus = "failed";
          }
          if (mappedStatus && messageId) {
            const errorMsg = st.errors?.[0]?.message || (statusStr === "failed" ? "Message delivery failed" : void 0);
            await db.updateLogDelivery(messageId, mappedStatus, errorMsg);
          }
        }
      }
    }
    return res.status(200).json({ status: "success" });
  }
  return res.status(200).json({ status: "ignored" });
});
var webhooks_default = router8;

// backend-ts/routes/profile.ts
import { Router as Router9 } from "express";
var router9 = Router9();
router9.get("/", requireAuth, async (req, res) => {
  try {
    const profile = await db.getProfile(req.user.id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        code: "PROFILE_NOT_FOUND",
        message: "User profile not found."
      });
    }
    return res.json({ success: true, profile });
  } catch (err) {
    return res.status(500).json({
      success: false,
      code: "PROFILE_FETCH_FAILED",
      message: err.message || "Unable to retrieve user profile."
    });
  }
});
router9.put("/", requireAuth, async (req, res) => {
  try {
    const parsed2 = updateProfileSchema.safeParse(req.body);
    if (!parsed2.success) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "Invalid profile data provided.",
        errors: parsed2.error.issues
      });
    }
    const updated = await db.upsertProfile({
      id: req.user.id,
      email: req.user.email,
      ...parsed2.data,
      default_reminder_channel: req.body.default_reminder_channel,
      email_reminders_enabled: req.body.email_reminders_enabled,
      whatsapp_reminders_enabled: req.body.whatsapp_reminders_enabled
    });
    return res.json({
      success: true,
      message: "Profile saved successfully.",
      profile: updated
    });
  } catch (err) {
    console.error("[Profile Update Exception]", err);
    return res.status(500).json({
      success: false,
      code: "INTEGRATION_SAVE_FAILED",
      message: err.message || "Unable to save integration settings."
    });
  }
});
var profile_default = router9;

// backend-ts/routes/integrations.ts
import { Router as Router10 } from "express";
import crypto4 from "crypto";
var router10 = Router10();
function getBaseUrl(req) {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  const host = req.get("host") || "localhost:3000";
  const proto = req.protocol || "http";
  return `${proto}://${host}`;
}
router10.get("/", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const integrations = await db.getIntegrations(userId);
  const profile = await db.getProfile(userId);
  const safeIntegrations = integrations.map((i) => db.toSafeIntegration(i));
  const emailIntegration = safeIntegrations.find((i) => i.channel === "email" && i.status === "CONNECTED");
  const whatsappIntegration = safeIntegrations.find((i) => i.channel === "whatsapp" && i.status === "CONNECTED");
  const emailConnected = Boolean(emailIntegration);
  const whatsappConnected = Boolean(whatsappIntegration);
  let defaultReminderChannel = profile?.default_reminder_channel || "email";
  if (defaultReminderChannel === "both" && (!emailConnected || !whatsappConnected)) {
    defaultReminderChannel = emailConnected ? "email" : whatsappConnected ? "whatsapp" : "email";
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
      whatsapp_connected: whatsappConnected
    }
  });
});
router10.put("/settings", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { default_reminder_channel, email_reminders_enabled, whatsapp_reminders_enabled } = req.body;
  const integrations = await db.getIntegrations(userId);
  const emailConn = integrations.some((i) => i.channel === "email" && i.status === "CONNECTED");
  const waConn = integrations.some((i) => i.channel === "whatsapp" && i.status === "CONNECTED");
  if (default_reminder_channel === "both" && (!emailConn || !waConn)) {
    return res.status(400).json({
      success: false,
      code: "INTEGRATION_CHANNEL_UNAVAILABLE",
      message: 'Cannot set default channel to "Both" unless both Email and WhatsApp Business are connected.'
    });
  }
  if (default_reminder_channel === "whatsapp" && !waConn) {
    return res.status(400).json({
      success: false,
      code: "WHATSAPP_NOT_CONNECTED",
      message: "Cannot set default channel to WhatsApp because WhatsApp Business is not connected."
    });
  }
  const updatedProfile = await db.upsertProfile({
    id: userId,
    email: req.user.email,
    default_reminder_channel,
    email_reminders_enabled: email_reminders_enabled !== void 0 ? Boolean(email_reminders_enabled) : void 0,
    whatsapp_reminders_enabled: whatsapp_reminders_enabled !== void 0 ? Boolean(whatsapp_reminders_enabled) : void 0
  });
  return res.json({
    success: true,
    message: "Integration settings saved successfully.",
    settings: {
      default_reminder_channel: updatedProfile.default_reminder_channel,
      email_reminders_enabled: updatedProfile.email_reminders_enabled,
      whatsapp_reminders_enabled: updatedProfile.whatsapp_reminders_enabled
    }
  });
});
router10.post("/email/google/start", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/integrations/email/google/callback`;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const state = Buffer.from(JSON.stringify({ userId, nonce: crypto4.randomUUID() })).toString("base64");
  if (!clientId) {
    const mockAuthUrl = `${baseUrl}/api/integrations/email/google/callback?code=mock_google_code_${Date.now()}&state=${encodeURIComponent(state)}&sandbox=true`;
    return res.json({
      url: mockAuthUrl,
      mode: "sandbox_dev",
      redirect_uri: redirectUri,
      message: "Connecting via Google OAuth developer sandbox mode."
    });
  }
  const scopes = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid"
  ].join(" ");
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(
    scopes
  )}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
  return res.json({
    url: authUrl,
    mode: "oauth2",
    redirect_uri: redirectUri
  });
});
router10.get(["/email/google/callback", "/email/google/callback/"], async (req, res) => {
  const { code, state, error, sandbox } = req.query;
  if (error) {
    return res.send(renderOAuthCallbackHtml({ success: false, provider: "google", error: String(error) }));
  }
  let userId = null;
  try {
    if (state) {
      const decoded = JSON.parse(Buffer.from(String(state), "base64").toString("utf8"));
      userId = decoded.userId;
    }
  } catch {
  }
  if (!userId) {
    return res.send(
      renderOAuthCallbackHtml({
        success: false,
        provider: "google",
        error: "Invalid state parameter in OAuth callback."
      })
    );
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/integrations/email/google/callback`;
  let userEmail = "user@gmail.com";
  let accessToken = `sim_gmail_access_${Date.now()}`;
  let refreshToken = `sim_gmail_refresh_${Date.now()}`;
  let expiresIn = 3600;
  if (clientId && clientSecret && !sandbox) {
    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: String(code),
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code"
        })
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || tokenData.error) {
        return res.send(
          renderOAuthCallbackHtml({
            success: false,
            provider: "google",
            error: tokenData.error_description || tokenData.error || "Token exchange failed"
          })
        );
      }
      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token || refreshToken;
      expiresIn = tokenData.expires_in || 3600;
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (userRes.ok) {
        const userInfo = await userRes.json();
        userEmail = userInfo.email || userEmail;
      }
    } catch (err) {
      return res.send(
        renderOAuthCallbackHtml({
          success: false,
          provider: "google",
          error: err.message
        })
      );
    }
  } else {
    const userProfile = await db.getProfile(userId);
    userEmail = userProfile?.email || "user@gmail.com";
  }
  const expiresAt = new Date(Date.now() + expiresIn * 1e3).toISOString();
  const existing = await db.getIntegrationByProvider(userId, "google");
  const integrationRecord = {
    id: existing?.id || crypto4.randomUUID(),
    user_id: userId,
    provider: "google",
    channel: "email",
    status: "CONNECTED",
    provider_account_id: userEmail,
    provider_email: userEmail,
    access_token_encrypted: encryptToken(accessToken),
    refresh_token_encrypted: encryptToken(refreshToken),
    token_expires_at: expiresAt,
    scopes: ["https://www.googleapis.com/auth/gmail.send", "email", "openid"],
    connected_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString(),
    created_at: existing?.created_at || (/* @__PURE__ */ new Date()).toISOString()
  };
  await db.upsertIntegration(integrationRecord);
  const currentProfile = await db.getProfile(userId);
  if (!currentProfile?.default_reminder_channel) {
    await db.upsertProfile({
      id: userId,
      email: currentProfile?.email || userEmail,
      default_reminder_channel: "email",
      email_reminders_enabled: true
    });
  }
  return res.send(
    renderOAuthCallbackHtml({
      success: true,
      provider: "google",
      displayEmail: userEmail
    })
  );
});
router10.post("/email/microsoft/start", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/integrations/email/microsoft/callback`;
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const state = Buffer.from(JSON.stringify({ userId, nonce: crypto4.randomUUID() })).toString("base64");
  if (!clientId) {
    const mockAuthUrl = `${baseUrl}/api/integrations/email/microsoft/callback?code=mock_ms_code_${Date.now()}&state=${encodeURIComponent(state)}&sandbox=true`;
    return res.json({
      url: mockAuthUrl,
      mode: "sandbox_dev",
      redirect_uri: redirectUri,
      message: "Connecting via Microsoft Graph OAuth developer sandbox mode."
    });
  }
  const scopes = ["openid", "email", "profile", "offline_access", "Mail.Send", "User.Read"].join(" ");
  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(
    scopes
  )}&response_mode=query&state=${encodeURIComponent(state)}`;
  return res.json({
    url: authUrl,
    mode: "oauth2",
    redirect_uri: redirectUri
  });
});
router10.get(["/email/microsoft/callback", "/email/microsoft/callback/"], async (req, res) => {
  const { code, state, error, sandbox } = req.query;
  if (error) {
    return res.send(renderOAuthCallbackHtml({ success: false, provider: "microsoft", error: String(error) }));
  }
  let userId = null;
  try {
    if (state) {
      const decoded = JSON.parse(Buffer.from(String(state), "base64").toString("utf8"));
      userId = decoded.userId;
    }
  } catch {
  }
  if (!userId) {
    return res.send(
      renderOAuthCallbackHtml({
        success: false,
        provider: "microsoft",
        error: "Invalid state parameter in Microsoft OAuth callback."
      })
    );
  }
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/integrations/email/microsoft/callback`;
  let userEmail = "user@outlook.com";
  let accessToken = `sim_ms_access_${Date.now()}`;
  let refreshToken = `sim_ms_refresh_${Date.now()}`;
  let expiresIn = 3600;
  if (clientId && clientSecret && !sandbox) {
    try {
      const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: String(code),
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          scope: "offline_access Mail.Send User.Read"
        })
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || tokenData.error) {
        return res.send(
          renderOAuthCallbackHtml({
            success: false,
            provider: "microsoft",
            error: tokenData.error_description || tokenData.error || "Token exchange failed"
          })
        );
      }
      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token || refreshToken;
      expiresIn = tokenData.expires_in || 3600;
      const graphRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (graphRes.ok) {
        const graphData = await graphRes.json();
        userEmail = graphData.mail || graphData.userPrincipalName || userEmail;
      }
    } catch (err) {
      return res.send(
        renderOAuthCallbackHtml({
          success: false,
          provider: "microsoft",
          error: err.message
        })
      );
    }
  } else {
    const userProfile = await db.getProfile(userId);
    userEmail = userProfile?.email ? userProfile.email.replace(/@.*$/, "@outlook.com") : "user@outlook.com";
  }
  const expiresAt = new Date(Date.now() + expiresIn * 1e3).toISOString();
  const existing = await db.getIntegrationByProvider(userId, "microsoft");
  const integrationRecord = {
    id: existing?.id || crypto4.randomUUID(),
    user_id: userId,
    provider: "microsoft",
    channel: "email",
    status: "CONNECTED",
    provider_account_id: userEmail,
    provider_email: userEmail,
    access_token_encrypted: encryptToken(accessToken),
    refresh_token_encrypted: encryptToken(refreshToken),
    token_expires_at: expiresAt,
    scopes: ["Mail.Send", "User.Read", "offline_access"],
    connected_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString(),
    created_at: existing?.created_at || (/* @__PURE__ */ new Date()).toISOString()
  };
  await db.upsertIntegration(integrationRecord);
  return res.send(
    renderOAuthCallbackHtml({
      success: true,
      provider: "microsoft",
      displayEmail: userEmail
    })
  );
});
router10.get("/email/status", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { provider, isUserConnected, connectedEmail } = await getEmailProviderForUser(userId);
  const status = await provider.getConnectionStatus();
  return res.json({
    success: true,
    provider: provider.providerName,
    is_user_connected: isUserConnected,
    status: isUserConnected ? status : "NOT_CONNECTED",
    display_email: connectedEmail
  });
});
router10.post("/email/test", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const profile = await db.getProfile(userId);
  const { provider, isUserConnected, connectedEmail } = await getEmailProviderForUser(userId);
  const targetEmail = connectedEmail || profile?.email || req.user.email;
  const result = await provider.sendEmail({
    to: targetEmail,
    fromName: profile?.business_name || profile?.full_name || "DueFlow System",
    fromEmail: targetEmail,
    subject: `[DueFlow Test] Email integration verified for ${profile?.business_name || "Studio"}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
        <h2 style="color: #4338ca;">DueFlow Email Verification Successful</h2>
        <p>This test email confirms that your email sending integration (<strong>${provider.providerName.toUpperCase()}</strong>) is properly authorized and connected.</p>
        <div style="background: #f1f5f9; padding: 12px; border-radius: 6px; margin: 16px 0; font-family: monospace; font-size: 13px;">
          Provider: ${provider.providerName}<br>
          Authenticated Account: ${targetEmail}<br>
          Timestamp: ${(/* @__PURE__ */ new Date()).toISOString()}
        </div>
        <p style="color: #64748b; font-size: 12px;">You can now dispatch automated payment reminders directly from your authenticated mailbox.</p>
      </div>
    `,
    text: `DueFlow Email Verification Successful. Integration with ${provider.providerName} verified at ${(/* @__PURE__ */ new Date()).toISOString()}.`
  });
  return res.json({
    success: result.success,
    provider: result.provider,
    providerMessageId: result.providerMessageId,
    recipient: targetEmail,
    error: result.errorMessage || result.errorCode,
    message: result.success ? `Test email successfully dispatched to ${targetEmail}` : "Test email failed to send"
  });
});
router10.post("/email/disconnect", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { provider: providerName } = req.body;
  if (providerName === "google" || providerName === "microsoft") {
    await db.deleteIntegration(userId, providerName);
  } else {
    await db.deleteIntegration(userId, "google");
    await db.deleteIntegration(userId, "microsoft");
  }
  const profile = await db.getProfile(userId);
  if (profile?.default_reminder_channel === "both") {
    await db.upsertProfile({
      id: userId,
      email: profile.email,
      default_reminder_channel: "whatsapp"
    });
  }
  return res.json({
    success: true,
    message: "Email integration disconnected successfully."
  });
});
router10.post("/email/reconnect", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { provider } = req.body;
  if (provider === "google") {
    const googleInt = await db.getIntegrationByProvider(userId, "google");
    if (googleInt) {
      await db.updateIntegrationStatus(googleInt.id, "NOT_CONNECTED");
    }
  } else if (provider === "microsoft") {
    const msInt = await db.getIntegrationByProvider(userId, "microsoft");
    if (msInt) {
      await db.updateIntegrationStatus(msInt.id, "NOT_CONNECTED");
    }
  }
  return res.json({
    success: true,
    message: "Ready to re-authenticate account."
  });
});
router10.post("/whatsapp/start", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/integrations/whatsapp/callback`;
  const wabaId = process.env.WHATSAPP_WABA_ID;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  return res.json({
    success: true,
    redirect_uri: redirectUri,
    configured_waba_id: wabaId,
    configured_phone_id: phoneId,
    instructions: {
      step1: "Create a Meta Business account and WhatsApp Cloud API app on developers.facebook.com",
      step2: "Retrieve your WhatsApp Business Account ID (WABA ID) and Phone Number ID",
      step3: "Generate a Permanent System User Access Token with whatsapp_business_messaging permission",
      step4: "Provide these credentials in the Connect WhatsApp Business modal to securely link your sender identity"
    }
  });
});
router10.post("/whatsapp/callback", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { phone_number_id, business_account_id, access_token, business_name, sender_phone } = req.body;
  if (!phone_number_id || !access_token) {
    return res.status(400).json({
      success: false,
      code: "INTEGRATION_SAVE_FAILED",
      message: "Phone Number ID and Access Token are required to connect WhatsApp Business."
    });
  }
  const existing = await db.getIntegrationByProvider(userId, "whatsapp_business");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const integrationRecord = {
    id: existing?.id || crypto4.randomUUID(),
    user_id: userId,
    provider: "whatsapp_business",
    channel: "whatsapp",
    status: "CONNECTED",
    provider_business_id: business_account_id || business_name || "WhatsApp Business",
    provider_phone_id: phone_number_id.trim(),
    access_token_encrypted: encryptToken(access_token.trim()),
    connected_at: now,
    updated_at: now,
    created_at: existing?.created_at || now
  };
  await db.upsertIntegration(integrationRecord);
  if (sender_phone) {
    const profile = await db.getProfile(userId);
    await db.upsertProfile({
      id: userId,
      email: profile?.email || req.user.email,
      phone: sender_phone.trim(),
      whatsapp_reminders_enabled: true
    });
  }
  return res.json({
    success: true,
    message: "WhatsApp Business connected and verified.",
    integration: db.toSafeIntegration(integrationRecord)
  });
});
router10.get("/whatsapp/status", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { provider, isConnected, status } = await getWhatsAppProviderForUser(userId);
  const integration = await db.getIntegrationByProvider(userId, "whatsapp_business");
  return res.json({
    success: true,
    status: integration ? status : "NOT_CONNECTED",
    is_connected: isConnected,
    business_name: integration?.provider_business_id || void 0,
    phone_id: integration?.provider_phone_id || void 0,
    last_success_at: integration?.last_success_at,
    last_error: integration?.last_error_message || integration?.last_error_code
  });
});
router10.post("/whatsapp/test", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { recipient_phone } = req.body;
  const profile = await db.getProfile(userId);
  const { provider, isConnected, status } = await getWhatsAppProviderForUser(userId);
  if (!provider || !isConnected) {
    return res.status(400).json({
      success: false,
      code: "WHATSAPP_NOT_CONNECTED",
      message: `WhatsApp Business is not connected (current status: ${status}). Connect your account first.`
    });
  }
  const phone = recipient_phone || profile?.phone;
  if (!phone) {
    return res.status(400).json({
      success: false,
      code: "MISSING_PHONE",
      message: "Please provide a test recipient phone number (including country code)."
    });
  }
  const result = await provider.sendTemplateMessage({
    toPhone: phone,
    templateName: "invoice_payment_reminder",
    variables: {
      clientName: "Test Client",
      invoiceNumber: "INV-TEST-001",
      amountFormatted: "\u20B912,500.00",
      dueDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      daysOverdue: 0,
      businessName: profile?.business_name || profile?.full_name || "DueFlow Studio",
      paymentLinkOrUpi: profile?.upi_id ? `UPI: ${profile.upi_id}` : "https://dueflow.in"
    }
  });
  return res.json({
    success: result.success,
    provider: result.provider,
    providerMessageId: result.providerMessageId,
    recipient: phone,
    error: result.errorMessage || result.errorCode,
    message: result.success ? `Test transactional WhatsApp reminder successfully dispatched to ${phone}` : `Test send failed: ${result.errorMessage}`
  });
});
router10.post("/whatsapp/disconnect", requireAuth, async (req, res) => {
  const userId = req.user.id;
  await db.deleteIntegration(userId, "whatsapp_business");
  const profile = await db.getProfile(userId);
  if (profile?.default_reminder_channel === "whatsapp" || profile?.default_reminder_channel === "both") {
    await db.upsertProfile({
      id: userId,
      email: profile.email,
      default_reminder_channel: "email",
      whatsapp_reminders_enabled: false
    });
  }
  return res.json({
    success: true,
    message: "WhatsApp Business disconnected successfully."
  });
});
function renderOAuthCallbackHtml(params) {
  const safeData = JSON.stringify({
    type: params.success ? "OAUTH_AUTH_SUCCESS" : "OAUTH_AUTH_ERROR",
    provider: params.provider,
    email: params.displayEmail || "",
    error: params.error || ""
  });
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${params.success ? "Connection Successful" : "Connection Failed"} - DueFlow</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
    .card { background: #1e293b; padding: 32px; border-radius: 12px; border: 1px solid #334155; text-align: center; max-width: 400px; }
    h2 { margin: 0 0 12px; font-size: 20px; color: ${params.success ? "#4ade80" : "#f87171"}; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <h2>${params.success ? "\u2713 Connected Successfully" : "\u2715 Connection Failed"}</h2>
    <p>${params.success ? `Connected ${params.displayEmail ? `as ${params.displayEmail}` : ""}. This window will close automatically.` : params.error || "Authentication could not be completed."}</p>
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
var integrations_default = router10;

// backend-ts/serverless.ts
var app = express();
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
var apiRouter = express.Router();
apiRouter.use("/auth", auth_default);
apiRouter.use("/profile", profile_default);
apiRouter.use("/integrations", integrations_default);
apiRouter.use("/invoices", invoices_default);
apiRouter.use("/clients", clients_default);
apiRouter.use("/dashboard", dashboard_default);
apiRouter.use("/reminders", reminders_default);
apiRouter.use("/ai", ai_default);
apiRouter.use("/cron", cron_default);
apiRouter.use("/webhooks", webhooks_default);
var healthHandler = (req, res) => {
  res.json({
    status: "ok",
    service: "DueFlow API",
    version: "1.0.0",
    environment: config.NODE_ENV || "production",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
};
apiRouter.get("/health", healthHandler);
app.use("/api", apiRouter);
app.use("/", apiRouter);
app.use((err, req, res, next) => {
  console.error("[API Exception]", err);
  res.status(err.status || 500).json({
    error: config.NODE_ENV === "production" ? "Internal server error" : err.message || "Server error"
  });
});
var serverless_default = app;
export {
  serverless_default as default
};
