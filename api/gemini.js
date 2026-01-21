const RATE_LIMIT_WINDOW_MS = 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 30
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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  const ip = getClientIp(req)
  if (isRateLimited(ip)) {
    res.status(429).json({ error: 'rate_limited' })
    return
  }

  const apiKey = process.env.GEMINI_API_KEY
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'

  if (!apiKey) {
    res.status(500).json({ error: 'missing_api_key' })
    return
  }

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      res.status(400).json({ error: 'invalid_json' })
      return
    }
  }

  const prompt = body?.prompt
  const contents = body?.contents
  if (!prompt && !contents) {
    res.status(400).json({ error: 'missing_prompt' })
    return
  }

  const payload = contents || {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ]
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text()
      res.status(geminiRes.status).json({
        error: 'gemini_error',
        details: errorText.slice(0, 500)
      })
      return
    }

    const data = await geminiRes.json()
    res.status(200).json(data)
  } catch (err) {
    res.status(500).json({ error: 'proxy_error' })
  }
}
