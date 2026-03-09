import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createVapidAuthHeader(
  audience: string,
  subject: string,
  privateKeyJwk: JsonWebKey,
  publicKeyBase64Url: string
) {
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: subject,
  };

  const encodedHeader = arrayBufferToBase64Url(
    new TextEncoder().encode(JSON.stringify(header))
  );
  const encodedPayload = arrayBufferToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload))
  );

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format (64 bytes)
  const sigArray = new Uint8Array(signature);
  let rawSig: Uint8Array;
  if (sigArray.length === 64) {
    rawSig = sigArray;
  } else {
    // DER format: parse r and s
    rawSig = derToRaw(sigArray);
  }

  const encodedSignature = arrayBufferToBase64Url(rawSig.buffer);
  const jwt = `${unsignedToken}.${encodedSignature}`;

  return `vapid t=${jwt}, k=${publicKeyBase64Url}`;
}

function derToRaw(der: Uint8Array): Uint8Array {
  // DER: 0x30 <len> 0x02 <rlen> <r> 0x02 <slen> <s>
  const raw = new Uint8Array(64);
  let offset = 2; // skip 0x30 <len>
  
  // r
  offset++; // skip 0x02
  const rLen = der[offset++];
  const rStart = offset + (rLen > 32 ? rLen - 32 : 0);
  const rDest = 32 - Math.min(rLen, 32);
  raw.set(der.slice(rStart, offset + rLen), rDest);
  offset += rLen;
  
  // s
  offset++; // skip 0x02
  const sLen = der[offset++];
  const sStart = offset + (sLen > 32 ? sLen - 32 : 0);
  const sDest = 32 + 32 - Math.min(sLen, 32);
  raw.set(der.slice(sStart, offset + sLen), sDest);
  
  return raw;
}

async function encryptPayload(
  payload: string,
  p256dhBase64: string,
  authBase64: string
) {
  const userPublicKeyBytes = base64UrlToUint8Array(p256dhBase64);
  const authSecret = base64UrlToUint8Array(authBase64);

  // Import user's public key
  const userPublicKey = await crypto.subtle.importKey(
    "raw",
    userPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Generate ephemeral key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: userPublicKey },
    localKeyPair.privateKey,
    256
  );

  const localPublicKeyRaw = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);

  // HKDF for auth info
  const authInfo = new Uint8Array([
    ...new TextEncoder().encode("WebPush: info\0"),
    ...userPublicKeyBytes,
    ...new Uint8Array(localPublicKeyRaw),
  ]);

  const prkKey = await crypto.subtle.importKey(
    "raw",
    authSecret,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  // IKM from shared secret via HKDF with auth as salt
  const ikmKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(sharedSecret),
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  // Use HKDF with authSecret as salt and sharedSecret as input
  const prk = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: authSecret, info: authInfo },
    ikmKey,
    256
  );

  // Derive content encryption key
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const prkImported = await crypto.subtle.importKey("raw", new Uint8Array(prk), { name: "HKDF" }, false, ["deriveBits"]);
  const cekBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: cekInfo },
    prkImported,
    128
  );

  // Derive nonce
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");
  const nonceBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: nonceInfo },
    prkImported,
    96
  );

  // Encrypt
  const contentKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(cekBits),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  // Add padding (RFC 8291): delimiter byte 0x02 followed by optional zeros
  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // delimiter

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: new Uint8Array(nonceBits) },
    contentKey,
    paddedPayload
  );

  // Build aes128gcm body
  const localPubKeyBytes = new Uint8Array(localPublicKeyRaw);
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096);
  
  const header = new Uint8Array(
    16 + // salt (use nonce padded to 16)
    4 +  // record size
    1 +  // key id length
    localPubKeyBytes.length
  );

  // Use a random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  header.set(salt, 0);
  header.set(recordSize, 16);
  header[20] = localPubKeyBytes.length;
  header.set(localPubKeyBytes, 21);

  // Re-derive with salt
  const cekBits2 = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: cekInfo },
    prkImported,
    128
  );
  const nonceBits2 = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo },
    prkImported,
    96
  );
  const contentKey2 = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(cekBits2),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const encrypted2 = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: new Uint8Array(nonceBits2) },
    contentKey2,
    paddedPayload
  );

  const body = new Uint8Array(header.length + encrypted2.byteLength);
  body.set(header, 0);
  body.set(new Uint8Array(encrypted2), header.length);

  return body;
}

async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: object,
  vapidKeys: { publicKey: string; privateKeyJwk: JsonWebKey }
) {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const authorization = await createVapidAuthHeader(
    audience,
    "mailto:noreply@dandelicrm.lovable.app",
    vapidKeys.privateKeyJwk,
    vapidKeys.publicKey
  );

  const body = await encryptPayload(
    JSON.stringify(payload),
    subscription.p256dh,
    subscription.auth
  );

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
    },
    body,
  });

  return response;
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

    // Get VAPID keys
    const { data: vapidSetting } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "vapid_keys")
      .single();

    if (!vapidSetting?.value?.publicKey) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const vapidKeys = vapidSetting.value;
    const now = new Date().toISOString();

    // Get due reminders
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

    for (const reminder of dueReminders) {
      // Get contact name
      const { data: contact } = await supabaseAdmin
        .from("contacts")
        .select("name")
        .eq("id", reminder.contact_id)
        .single();

      const contactName = contact?.name || "Unknown";
      const body = reminder.message || `Follow-up reminder for ${contactName}`;

      // Get push subscriptions for the reminder creator or all tenant users
      const userId = reminder.created_by;
      let subscriptions;

      if (userId) {
        const { data } = await supabaseAdmin
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", userId);
        subscriptions = data;
      } else {
        const { data } = await supabaseAdmin
          .from("push_subscriptions")
          .select("*")
          .eq("tenant_id", reminder.tenant_id);
        subscriptions = data;
      }

      if (subscriptions && subscriptions.length > 0) {
        for (const sub of subscriptions) {
          try {
            const res = await sendPushNotification(
              sub,
              {
                title: `🔔 Follow-up: ${contactName}`,
                body,
                icon: "/pwa-icon-192.png",
                url: "/follow-ups",
              },
              vapidKeys
            );

            if (res.status === 410 || res.status === 404) {
              // Subscription expired, remove it
              await supabaseAdmin
                .from("push_subscriptions")
                .delete()
                .eq("id", sub.id);
            } else if (res.ok) {
              sentCount++;
            }
          } catch (e) {
            console.error("Push send error:", e);
          }
        }
      }

      // Mark reminder as inactive
      await supabaseAdmin
        .from("reminders")
        .update({ is_active: false })
        .eq("id", reminder.id);
    }

    return new Response(JSON.stringify({ sent: sentCount, reminders: dueReminders.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Push notify error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
