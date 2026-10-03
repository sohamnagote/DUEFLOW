import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");

    // Optional signature check if secret is configured
    if (webhookSecret) {
      const svixSignature = req.headers.get("svix-signature");
      if (!svixSignature) {
        return new Response(JSON.stringify({ error: "Missing webhook signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = await req.json();
    const eventType = payload.type; // e.g. email.delivered, email.bounced, email.complained
    const emailId = payload.data?.email_id;

    if (!emailId) {
      return new Response(JSON.stringify({ message: "No email_id in webhook" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let status = "sent";
    if (eventType === "email.delivered") {
      status = "delivered";
    } else if (eventType === "email.bounced") {
      status = "bounced";
    } else if (eventType === "email.complained") {
      status = "complained";
    }

    const { data, error } = await supabase
      .from("reminder_logs")
      .update({
        status,
        error_code: eventType === "email.bounced" ? (payload.data?.bounce?.message || "Bounced") : null
      })
      .eq("provider_message_id", emailId);

    if (error) {
      console.error("Failed to update reminder log status:", error);
    }

    return new Response(JSON.stringify({ updated: true, event: eventType, emailId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
