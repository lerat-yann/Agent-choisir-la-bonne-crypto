import { fetchJson } from './fetchJson'

export function callGeminiProxy(prompt) {
  return fetchJson('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  })
}
