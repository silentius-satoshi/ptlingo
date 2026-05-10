export async function streamTutorResponse({ messages, systemPrompt, onChunk, onDone, onError, signal }) {
  try {
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'PT Lingo AI Tutor',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          max_tokens: 1500,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
              .filter((m) => m.role === 'user' || m.role === 'assistant')
              .filter((m) => m.content)
              .map((m) => ({ role: m.role, content: m.content })),
          ],
        }),
      }
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message || `OpenRouter error ${response.status}`)
    }

    const reader = response.body.getReader()
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
          const chunk = parsed.choices?.[0]?.delta?.content
          if (chunk) onChunk(chunk)
        } catch { /* skip malformed SSE lines */ }
      }
    }
    onDone()
  } catch (err) {
    if (err.name === 'AbortError') return // cancelled — not an error
    onError(err)
  }
}
