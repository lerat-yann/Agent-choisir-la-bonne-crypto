const RATE_LIMIT_WINDOW_MS = 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 60
const rateLimitStore = new Map()

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

function isRateLimited(ip) {
  const now = Date.now()
  const entry = rateLimitStore.get(ip)
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, start: now })
    return false
  }
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) return true
  entry.count += 1
  return false
}

function isAllowedPath(path) {
  if (!path || path.includes('..')) return false
  if (path === '/search') return true
  if (path.startsWith('/coins/')) return true
  return false
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  const ip = getClientIp(req)
  if (isRateLimited(ip)) {
    res.status(429).json({ error: 'rate_limited' })
    return
  }

  const pathParam = req.query.path
  const path = Array.isArray(pathParam)
    ? `/${pathParam.join('/')}`
    : `/${pathParam || ''}`

  if (!isAllowedPath(path)) {
    res.status(400).json({ error: 'invalid_path' })
    return
  }

  const url = new URL(`https://api.coingecko.com/api/v3${path}`)
  Object.entries(req.query).forEach(([key, value]) => {
    if (key === 'path') return
    url.searchParams.set(key, value)
  })

  try {
    const upstream = await fetch(url.toString(), {
      headers: { Accept: 'application/json' }
    })
    const text = await upstream.text()
    res.status(upstream.status).send(text)
  } catch (error) {
    res.status(500).json({ error: 'proxy_error' })
  }
}
