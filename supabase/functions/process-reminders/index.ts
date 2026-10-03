import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");

    // Protect execution with CRON_SECRET or service role authorization
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
        return new Response(JSON.stringify({ error: "Unauthorized cron trigger" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const nowIso = new Date().toISOString();

    // 1. Fetch pending rules where scheduled_for <= now
    const { data: dueRules, error: rulesError } = await supabase
      .from("reminder_rules")
      .select(`
        id,
        occurrence_key,
        scheduled_for,
        status,
        invoices!inner(
          id,
          user_id,
          invoice_number,
          amount,
          currency,
          issue_date,
          due_date,
          notes,
          status,
          reminders_enabled,
          client_name_snapshot,
          client_email_snapshot,
          profiles!inner(
            full_name,
            business_name,
            email,
            upi_id,
            bank_account,
            bank_ifsc
          )
        )
      `)
      .eq("status", "pending")
      .lte("scheduled_for", nowIso);

    if (rulesError) {
      throw rulesError;
    }

    const results = [];

    for (const rule of dueRules || []) {
      const inv = rule.invoices;

      // Invariant check: Invoices must still be unpaid and reminders enabled
      if (inv.status === "paid" || inv.status === "cancelled" || !inv.reminders_enabled) {
        await supabase
          .from("reminder_rules")
          .update({ status: "cancelled" })
          .eq("id", rule.id);
        results.push({ rule_id: rule.id, skipped: true, reason: `Invoice status: ${inv.status}` });
        continue;
      }

      // Check if already sent (idempotency guard)
      const { data: existingLog } = await supabase
        .from("reminder_logs")
        .select("id")
        .eq("invoice_id", inv.id)
        .eq("occurrence_key", rule.occurrence_key)
        .in("status", ["delivered", "sent"])
        .maybeSingle();

      if (existingLog) {
        await supabase
          .from("reminder_rules")
          .update({ status: "sent" })
          .eq("id", rule.id);
        results.push({ rule_id: rule.id, skipped: true, reason: "Already successfully logged" });
        continue;
      }

      // Acquire concurrency lock by setting status to processing
      const { error: lockErr } = await supabase
        .from("reminder_rules")
        .update({ status: "processing" })
        .eq("id", rule.id)
        .eq("status", "pending");

      if (lockErr) continue;

      let providerMessageId: string | null = null;
      let sendSuccess = false;
      let sendError: string | null = null;

      if (resendApiKey) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: Deno.env.get("RESEND_FROM_EMAIL") || "DueFlow Reminders <reminders@dueflow.in>",
              to: [inv.client_email_snapshot],
              reply_to: inv.profiles.email,
              subject: `Reminder: Invoice ${inv.invoice_number} due - INR ${inv.amount}`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0;">
                  <h2 style="color: #4f46e5;">Payment Reminder from ${inv.profiles.business_name || inv.profiles.full_name}</h2>
                  <p>Dear ${inv.client_name_snapshot},</p>
                  <p>This is a reminder regarding invoice <strong>#${inv.invoice_number}</strong> for the amount of <strong>INR ${inv.amount}</strong>.</p>
                  <p><strong>Due Date:</strong> ${inv.due_date}</p>
                  ${inv.profiles.upi_id ? `<p><strong>UPI ID:</strong> ${inv.profiles.upi_id}</p>` : ''}
                  <p style="margin-top: 30px; font-size: 12px; color: #888;">Powered by DueFlow</p>
                </div>
              `,
            }),
          });

          const resData = await res.json();
          if (res.ok) {
            providerMessageId = resData.id;
            sendSuccess = true;
          } else {
            sendError = resData.message || "Resend delivery error";
          }
        } catch (err: any) {
          sendError = err.message || "Network exception";
        }
      } else {
        // Safe staging / mock mode if API key not injected
        providerMessageId = `resend_sim_${Date.now()}_${rule.id.slice(0, 8)}`;
        sendSuccess = true;
      }

      const logStatus = sendSuccess ? "sent" : "failed";

      await supabase.from("reminder_logs").insert({
        invoice_id: inv.id,
        rule_id: rule.id,
        occurrence_key: rule.occurrence_key,
        recipient_email: inv.client_email_snapshot,
        provider_message_id: providerMessageId,
        status: logStatus,
        error_code: sendError,
        sent_at: sendSuccess ? new Date().toISOString() : null,
      });

      await supabase
        .from("reminder_rules")
        .update({ status: sendSuccess ? "sent" : "failed" })
        .eq("id", rule.id);

      results.push({
        rule_id: rule.id,
        invoice_number: inv.invoice_number,
        status: logStatus,
        providerMessageId,
      });
    }

    return new Response(JSON.stringify({ processed: results.length, details: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
