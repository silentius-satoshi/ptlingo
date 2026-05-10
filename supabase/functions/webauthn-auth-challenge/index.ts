// Step 29: WebAuthn authentication challenge
// Public endpoint — generates auth options for login flow.
// Optional ?email= populates allowCredentials hint.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { generateAuthenticationOptions } from "https://esm.sh/@simplewebauthn/server@9"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    const url = new URL(req.url)
    const email = url.searchParams.get("email") ?? ""

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const adminClient = createClient(supabaseUrl, serviceKey)

    let allowCredentials: { id: string; type: "public-key"; transports: string[] }[] = []
    if (email) {
      const { data: users } = await adminClient.auth.admin.listUsers()
      const match = users?.users?.find((u) => u.email === email)
      if (match) {
        const { data: passkeys } = await adminClient
          .from("passkeys")
          .select("credential_id, transports")
          .eq("user_id", match.id)
        allowCredentials = (passkeys ?? []).map((p: any) => ({
          id: p.credential_id,
          type: "public-key" as const,
          transports: p.transports ?? [],
        }))
      }
    }

    const origin = req.headers.get("origin") ?? req.headers.get("referer") ?? ""
    if (!origin) {
      return new Response(JSON.stringify({ error: "Missing origin" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }
    const rpID = new URL(origin).hostname

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: "required",
    })

    const challengeId = `wc_auth:${options.challenge}`
    const { error: storeError } = await adminClient
      .from("webauthn_challenges")
      .insert({
        id: challengeId,
        user_id: null,
        challenge: options.challenge,
        created_at: new Date().toISOString(),
      })
    if (storeError) {
      return new Response(JSON.stringify({ error: `Challenge store failed: ${storeError.message}` }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }

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
