const LIMITS: Record<string, { max: number; windowMs: number }> = {
  inquiry: { max: 3, windowMs: 60 * 60 * 1000 }, // 3 per time
  bim:     { max: 3, windowMs: 60 * 60 * 1000 },
  booking: { max: 5, windowMs: 60 * 60 * 1000 },
  contact: { max: 5, windowMs: 60 * 60 * 1000 },
}

export function checkRateLimit(action: string): boolean {
  const limit = LIMITS[action]
  if (!limit) return true
  const key = `rl_${action}`
  const now = Date.now()
  try {
    const stored = localStorage.getItem(key)
    const history: number[] = stored ? JSON.parse(stored) : []
    const recent = history.filter((t) => now - t < limit.windowMs)
    if (recent.length >= limit.max) return false
    recent.push(now)
    localStorage.setItem(key, JSON.stringify(recent))
    return true
  } catch {
    return true
  }
}

export function getRateLimitMessage(_action: string): string {
  return 'Du har sendt for mange forespørsler. Prøv igjen om en time.'
}
