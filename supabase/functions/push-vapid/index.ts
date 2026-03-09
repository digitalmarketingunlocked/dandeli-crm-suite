import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getOrCreateVapidKeys(supabaseAdmin: any) {
  // Check if keys exist in system_settings
  const { data: existing } = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", "vapid_keys")
    .single();

  if (existing?.value?.publicKey) {
    return existing.value;
  }

  // Generate new ECDSA P-256 key pair
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );

  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  const vapidKeys = {
    publicKey: arrayBufferToBase64Url(publicKeyRaw),
    privateKeyJwk,
  };

  // Store in system_settings
  await supabaseAdmin.from("system_settings").upsert(
    {
      key: "vapid_keys",
      value: vapidKeys,
      description: "VAPID keys for Web Push notifications (auto-generated)",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  return vapidKeys;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const vapidKeys = await getOrCreateVapidKeys(supabaseAdmin);

    return new Response(
      JSON.stringify({ publicKey: vapidKeys.publicKey }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
