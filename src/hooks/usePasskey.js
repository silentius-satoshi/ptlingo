import { useState, useEffect, useCallback } from 'react'
import { registerPasskey, listPasskeys, deletePasskey } from '../lib/webauthn'

export function usePasskey() {
  const [passkeys, setPasskeys] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    const { data, error: err } = await listPasskeys()
    if (err) setError(err)
    else setPasskeys(data)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const register = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { error: err } = await registerPasskey()
    setLoading(false)
    if (err) {
      setError(err)
      return false
    }
    await refresh()
    return true
  }, [refresh])

  const remove = useCallback(async (id) => {
    setLoading(true)
    setError(null)
    const { error: err } = await deletePasskey(id)
    setLoading(false)
    if (err) {
      setError(err)
      return false
    }
    await refresh()
    return true
  }, [refresh])

  return { passkeys, loading, error, register, remove, refresh }
}
