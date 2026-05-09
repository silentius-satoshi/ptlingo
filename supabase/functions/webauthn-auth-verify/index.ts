// Step 29: WebAuthn authentication verify
// Verifies assertion, updates counter, issues a magic-link token_hash for session creation.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { verifyAuthenticationResponse } from "https://esm.sh/@simplewebauthn/server@9"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

function base64urlToUint8Array(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/")
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4))
  const bin = atob(b64 + pad)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    const body = await req.json()
    const credentialId = body.id
    if (!credentialId) {
      return new Response(JSON.stringify({ error: "Missing credential id" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const adminClient = createClient(supabaseUrl, serviceKey)

    const { data: passkey, error: pkError } = await adminClient
      .from("passkeys")
      .select("*")
      .eq("credential_id", credentialId)
      .single()

    if (pkError || !passkey) {
      return new Response(JSON.stringify({ error: "Passkey not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    // Decode challenge from clientDataJSON to use as KV lookup key
    const clientDataBytes = base64urlToUint8Array(body.response.clientDataJSON)
    const clientData = JSON.parse(new TextDecoder().decode(clientDataBytes))
    const challengeKey = clientData.challenge

    const kv = await Deno.openKv()
    const stored = await kv.get<{ challenge: string }>(["wc_auth", challengeKey])
    if (!stored.value) {
      return new Response(JSON.stringify({ error: "Challenge expired" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }
    await kv.delete(["wc_auth", challengeKey])

    const origin = req.headers.get("origin") ?? ""
    const rpID = new URL(origin).hostname

    const credentialIdBytes = base64urlToUint8Array(passkey.credential_id)
    const publicKeyBytes = base64urlToUint8Array(passkey.public_key)

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: stored.value.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      // @ts-ignore — v9 expects authenticator (object form), v10 expects credential
      authenticator: {
        credentialID: credentialIdBytes,
        credentialPublicKey: publicKeyBytes,
        counter: Number(passkey.counter ?? 0),
        transports: passkey.transports ?? [],
      },
    })

    if (!verification.verified) {
      return new Response(JSON.stringify({ error: "Verification failed" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    await adminClient
      .from("passkeys")
      .update({
        counter: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", passkey.id)

    const { data: userRecord } = await adminClient.auth.admin.getUserById(passkey.user_id)
    if (!userRecord?.user?.email) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: userRecord.user.email,
    })

    if (linkError || !linkData?.properties?.hashed_token) {
      return new Response(JSON.stringify({ error: "Session generation failed" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    return new Response(
      JSON.stringify({
        token_hash: linkData.properties.hashed_token,
        email: userRecord.user.email,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
