import { supabase } from '../lib/supabase'

export function useMFA() {
  const enroll = async () => {
    return await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'NPTE Prep Authenticator',
    })
  }

  const verify = async (factorId, code) => {
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId })
    if (challengeError) return { error: challengeError }
    return await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    })
  }

  const unenroll = async (factorId) => {
    return await supabase.auth.mfa.unenroll({ factorId })
  }

  const listFactors = async () => {
    return await supabase.auth.mfa.listFactors()
  }

  const getAssuranceLevel = async () => {
    return await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  }

  return { enroll, verify, unenroll, listFactors, getAssuranceLevel }
}
