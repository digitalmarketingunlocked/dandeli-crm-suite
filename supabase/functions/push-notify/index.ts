import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jwkToPem(_jwk: JsonWebKey): string {
  // web-push expects a base64url-encoded private key (32 bytes for P-256)
  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Shared-secret guard: this function should only be invoked by the pg_cron scheduler
  const cronSecret = Deno.env.get("CRON_SECRET");
  const providedSecret =
    req.headers.get("x-cron-secret") ??
    new URL(req.url).searchParams.get("cron_secret");
  if (!cronSecret || providedSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: vapidSetting } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "vapid_keys")
      .single();

    if (!vapidSetting?.value?.publicKey) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const publicKey: string = vapidSetting.value.publicKey;
    // Private key may be stored as JWK ({d: "..."}) or raw base64url string
    let privateKey: string;
    const stored = vapidSetting.value.privateKey ?? vapidSetting.value.privateKeyJwk;
    if (typeof stored === "string") {
      privateKey = stored;
    } else if (stored && typeof stored === "object" && "d" in stored) {
      privateKey = (stored as JsonWebKey).d as string;
    } else {
      return new Response(JSON.stringify({ error: "VAPID private key missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    webpush.setVapidDetails(
      "mailto:noreply@dandelicrm.lovable.app",
      publicKey,
      privateKey
    );

    const now = new Date().toISOString();

    const { data: dueReminders } = await supabaseAdmin
      .from("reminders")
      .select("id, message, reminder_date, contact_id, tenant_id, created_by")
      .eq("is_active", true)
      .lte("reminder_date", now)
      .order("reminder_date", { ascending: true })
      .limit(50);

    if (!dueReminders || dueReminders.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;
    let errorCount = 0;

    for (const reminder of dueReminders) {
      const { data: contact } = await supabaseAdmin
        .from("contacts")
        .select("name")
        .eq("id", reminder.contact_id)
        .single();

      const contactName = contact?.name || "Lead";
      const body = reminder.message || `Time to follow up with ${contactName}`;

      // Determine recipients
      let subQuery = supabaseAdmin.from("push_subscriptions").select("*");
      if (reminder.created_by) {
        subQuery = subQuery.eq("user_id", reminder.created_by);
      } else {
        subQuery = subQuery.eq("tenant_id", reminder.tenant_id);
      }
      const { data: subscriptions } = await subQuery;

      if (subscriptions && subscriptions.length > 0) {
        const payload = JSON.stringify({
          title: `🔔 Follow-up: ${contactName}`,
          body,
          icon: "/pwa-icon-192.png",
          url: "/follow-ups",
          tag: `reminder-${reminder.id}`,
        });

        for (const sub of subscriptions) {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              payload
            );
            sentCount++;
          } catch (e: any) {
            errorCount++;
            const status = e?.statusCode;
            console.error("Push send error:", status, e?.body || e?.message);
            if (status === 404 || status === 410) {
              await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
            }
          }
        }
      }

      await supabaseAdmin.from("reminders").update({ is_active: false }).eq("id", reminder.id);
    }

    return new Response(
      JSON.stringify({ sent: sentCount, errors: errorCount, reminders: dueReminders.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Push notify error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
