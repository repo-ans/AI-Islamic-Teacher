import { HttpError } from './http.ts'

export const MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-5'
const EFFORT = Deno.env.get('OPENAI_REASONING_EFFORT') ?? 'low'

/** Calls Chat Completions in JSON mode and returns the parsed object. */
export async function chatJSON<T>(system: string, user: string): Promise<T> {
  const key = Deno.env.get('OPENAI_API_KEY')
  if (!key) throw new HttpError(500, 'OPENAI_API_KEY is not set')

  const body: Record<string, unknown> = {
    model: MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  }
  // Reasoning models (gpt-5, o-series) accept an effort hint; keep latency low for live teaching.
  if (/^(gpt-5|o\d)/.test(MODEL)) body.reasoning_effort = EFFORT

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.text()
    console.error('OpenAI error', res.status, detail)
    throw new HttpError(502, `AI service error (${res.status})`)
  }
  const data = await res.json()
  const content: string = data.choices?.[0]?.message?.content ?? '{}'
  try {
    return JSON.parse(content) as T
  } catch {
    throw new HttpError(502, 'AI returned invalid JSON')
  }
}
