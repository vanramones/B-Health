// @ts-nocheck — Deno (Supabase Edge runtime). The workspace TS server runs in
// Node mode and does not know Deno globals / esm.sh imports; these are valid at
// deploy time. Type-checking is handled by the Supabase CLI on deploy.
// ============================================================================
// B-Health — send-push Edge Function
// Sends a Firebase Cloud Messaging (FCM HTTP v1) push to all device tokens
// belonging to a user. Invoked from the app after the admin saves a
// vaccination record (see supabaseApi.js -> functions.invoke('send-push')).
//
// Required secrets (set with `supabase secrets set ...`):
//   FCM_PROJECT_ID      - Firebase project id (e.g. "b-healt")
//   FCM_CLIENT_EMAIL    - service account client_email
//   FCM_PRIVATE_KEY     - service account private_key (with \n line breaks)
// Auto-provided by Supabase:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Build a Google OAuth2 access token from the service account (RS256 JWT) ──
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function base64url(input: ArrayBuffer | string): string {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : new Uint8Array(input);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken(
  clientEmail: string,
  privateKey: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(claim),
  )}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${base64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`OAuth token error: ${JSON.stringify(data)}`);
  return data.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { user_id, title, body, route, broadcast } = await req.json();
    if (!title || (!user_id && !broadcast)) {
      return new Response(
        JSON.stringify({ error: "title and (user_id or broadcast) are required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const projectId = Deno.env.get("FCM_PROJECT_ID")!;
    const clientEmail = Deno.env.get("FCM_CLIENT_EMAIL")!;
    const privateKey = (Deno.env.get("FCM_PRIVATE_KEY") || "").replace(
      /\\n/g,
      "\n",
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up device tokens: a single user, or ALL users when broadcasting
    let tokenQuery = supabase.from("device_tokens").select("token");
    if (!broadcast) tokenQuery = tokenQuery.eq("user_id", user_id);
    const { data: rawTokens, error } = await tokenQuery;
    if (error) throw new Error(error.message);

    // De-duplicate tokens (a broadcast could hit the same device twice)
    const tokens = Array.from(
      new Map((rawTokens || []).map((t) => [t.token, t])).values(),
    );
    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, note: "no device tokens" }),
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const accessToken = await getAccessToken(clientEmail, privateKey);
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    let sent = 0;
    const staleTokens: string[] = [];

    for (const { token } of tokens) {
      const message = {
        message: {
          token,
          notification: { title, body: body || "" },
          data: { route: route || "/user/vaccinations" },
          android: {
            priority: "HIGH",
            notification: { channel_id: "vaccination-reminders", sound: "default" },
          },
        },
      };

      const r = await fetch(fcmUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      if (r.ok) {
        sent++;
      } else {
        const errBody = await r.text();
        // Token no longer valid -> remove it
        if (r.status === 404 || r.status === 400) staleTokens.push(token);
        console.error(`FCM send failed (${r.status}): ${errBody}`);
      }
    }

    if (staleTokens.length) {
      await supabase.from("device_tokens").delete().in("token", staleTokens);
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-push error:", e?.message || e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
