// Step 29: WebAuthn registration verify
// Verifies the registration credential and persists it to passkeys table.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { verifyRegistrationResponse } from "https://esm.sh/@simplewebauthn/server@9"
import { Buffer } from "node:buffer"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    const authHeader = req.headers.get("authorization") ?? ""
    const token = authHeader.replace("Bearer ", "")
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: authError } = await userClient.auth.getUser(token)
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }
    const user = userData.user

    const kv = await Deno.openKv()
    const stored = await kv.get<string>(["wc_reg", user.id])
    if (!stored.value) {
      return new Response(JSON.stringify({ error: "Challenge expired or not found" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }
    const expectedChallenge = stored.value
    await kv.delete(["wc_reg", user.id])

    const body = await req.json()
    const origin = req.headers.get("origin") ?? ""
    const rpID = new URL(origin).hostname

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return new Response(JSON.stringify({ error: "Verification failed" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const { credentialID, credentialPublicKey, counter, aaguid } =
      verification.registrationInfo

    const credentialIdB64 = Buffer.from(credentialID).toString("base64url")
    const publicKeyB64 = Buffer.from(credentialPublicKey).toString("base64url")

    const adminClient = createClient(supabaseUrl, serviceKey)
    const { error: insertError } = await adminClient.from("passkeys").insert({
      user_id: user.id,
      credential_id: credentialIdB64,
      public_key: publicKeyB64,
      counter,
      transports: body.response?.transports ?? [],
      aaguid: aaguid ?? null,
      friendly_name: "Passkey",
    })

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ verified: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
