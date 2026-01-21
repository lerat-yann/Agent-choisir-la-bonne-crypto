const memoryCache = new Map()

export function getCached(key) {
  if (memoryCache.has(key)) return memoryCache.get(key)
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    const { value, expiresAt } = JSON.parse(raw)
    if (Date.now() > expiresAt) return null
    memoryCache.set(key, value)
    return value
  } catch {
    return null
  }
}

export function setCached(key, value, ttlMs) {
  memoryCache.set(key, value)
  localStorage.setItem(
    key,
    JSON.stringify({
      value,
      expiresAt: Date.now() + ttlMs
    })
  )
}
