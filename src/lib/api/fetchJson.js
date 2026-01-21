export async function fetchJson(url, options = {}) {
  const res = await fetch(url, options)
  if (!res.ok) {
    if (res.status === 429) throw new Error('rate_limited')
    throw new Error('api_error')
  }
  return res.json()
}
