// Step 29: WebAuthn registration challenge
// Generates registration options for an authenticated user.
// Stores challenge in Deno KV with 5-min TTL.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { generateRegistrationOptions } from "https://esm.sh/@simplewebauthn/server@9"

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

    const adminClient = createClient(supabaseUrl, serviceKey)
    const { data: existing } = await adminClient
      .from("passkeys")
      .select("credential_id, transports")
      .eq("user_id", user.id)

    const excludeCredentials = (existing ?? []).map((p: any) => ({
      id: p.credential_id,
      type: "public-key" as const,
      transports: p.transports ?? [],
    }))

    const origin = req.headers.get("origin") ?? req.headers.get("referer") ?? ""
    if (!origin) {
      return new Response(JSON.stringify({ error: "Missing origin" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }
    const rpID = new URL(origin).hostname

    const options = await generateRegistrationOptions({
      rpName: "NPTE Prep",
      rpID,
      userID: new TextEncoder().encode(user.id),
      userName: user.email ?? user.id,
      userDisplayName: user.email ?? "NPTE Prep User",
      attestationType: "none",
      excludeCredentials,
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
    })

    const kv = await Deno.openKv()
    await kv.set(["wc_reg", user.id], options.challenge, { expireIn: 300_000 })

    return new Response(JSON.stringify(options), {
      headers: { ...cors, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
