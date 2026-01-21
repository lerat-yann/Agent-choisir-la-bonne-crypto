export function createRateLimiter({ intervalMs, maxCalls }) {
  let windowStart = Date.now()
  let callCount = 0

  return function canCall() {
    const now = Date.now()
    if (now - windowStart > intervalMs) {
      windowStart = now
      callCount = 0
    }
    if (callCount >= maxCalls) return false
    callCount += 1
    return true
  }
}
