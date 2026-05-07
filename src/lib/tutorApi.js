export async function streamTutorResponse({ messages, systemPrompt, onChunk, onDone, onError }) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) {
    onError(new Error('VITE_ANTHROPIC_API_KEY is not set in .env.local'))
    return
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':                              'application/json',
        'x-api-key':                                 apiKey,
        'anthropic-version':                         '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 1500,
        stream:     true,
        system:     systemPrompt,
        messages:   messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .filter((m) => m.content)
          .map((m) => ({ role: m.role, content: m.content })),
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message || `API error ${res.status}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') { onDone(); return }
        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            onChunk(parsed.delta.text)
          }
          if (parsed.type === 'message_stop') { onDone(); return }
        } catch { /* skip malformed SSE lines */ }
      }
    }
    onDone()
  } catch (err) {
    onError(err)
  }
}
