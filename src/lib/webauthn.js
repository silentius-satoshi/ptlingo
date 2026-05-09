import { startRegistration, startAuthentication, platformAuthenticatorIsAvailable, browserSupportsWebAuthn } from '@simplewebauthn/browser'
import { supabase } from './supabase'

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ? `Bearer ${session.access_token}` : ''
}

export { platformAuthenticatorIsAvailable, browserSupportsWebAuthn }

export async function registerPasskey() {
  const authHeader = await getAuthHeader()
  if (!authHeader) return { error: 'Not signed in.' }

  let challengeRes
  try {
    challengeRes = await fetch(`${FUNCTIONS_BASE}/webauthn-register-challenge`, {
      headers: { Authorization: authHeader },
    })
  } catch (err) {
    return { error: 'Network error: could not reach passkey service.' }
  }
  if (!challengeRes.ok) {
    const data = await challengeRes.json().catch(() => ({}))
    return { error: data.error || `Challenge failed (${challengeRes.status})` }
  }
  const options = await challengeRes.json()

  let credential
  try {
    credential = await startRegistration(options)
  } catch (err) {
    if (err?.name === 'NotAllowedError') return { error: 'Registration cancelled.' }
    if (err?.name === 'InvalidStateError') return { error: 'This passkey is already registered.' }
    return { error: err?.message || 'Passkey registration failed.' }
  }

  const verifyRes = await fetch(`${FUNCTIONS_BASE}/webauthn-register-verify`, {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify(credential),
  })
  const verifyData = await verifyRes.json().catch(() => ({}))
  if (!verifyRes.ok || !verifyData.verified) {
    return { error: verifyData.error || 'Registration verification failed.' }
  }
  return { error: null }
}

export async function authenticateWithPasskey(email = '') {
  const params = email ? `?email=${encodeURIComponent(email)}` : ''
  let challengeRes
  try {
    challengeRes = await fetch(`${FUNCTIONS_BASE}/webauthn-auth-challenge${params}`)
  } catch (err) {
    return { error: 'Network error: could not reach passkey service.' }
  }
  if (!challengeRes.ok) {
    const data = await challengeRes.json().catch(() => ({}))
    return { error: data.error || `Challenge failed (${challengeRes.status})` }
  }
  const options = await challengeRes.json()

  let assertion
  try {
    assertion = await startAuthentication(options)
  } catch (err) {
    if (err?.name === 'NotAllowedError') return { error: 'Authentication cancelled.' }
    return { error: err?.message || 'Passkey authentication failed.' }
  }

  const verifyRes = await fetch(`${FUNCTIONS_BASE}/webauthn-auth-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assertion),
  })
  const verifyData = await verifyRes.json().catch(() => ({}))
  if (!verifyRes.ok || !verifyData.token_hash) {
    return { error: verifyData.error || 'Authentication verification failed.' }
  }

  const { error: sessionError } = await supabase.auth.verifyOtp({
    token_hash: verifyData.token_hash,
    type: 'email',
  })
  if (sessionError) return { error: sessionError.message }

  return { error: null }
}

export async function unlockWithPasskey() {
  return authenticateWithPasskey('')
}

export async function listPasskeys() {
  const { data, error } = await supabase
    .from('passkeys')
    .select('id, friendly_name, created_at, last_used_at, transports')
    .order('created_at', { ascending: false })
  return { data: data ?? [], error: error?.message ?? null }
}

export async function deletePasskey(id) {
  const { error } = await supabase.from('passkeys').delete().eq('id', id)
  return { error: error?.message ?? null }
}
