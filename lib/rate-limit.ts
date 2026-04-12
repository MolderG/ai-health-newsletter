import { createServerClient } from './supabase-server'

interface RateLimitResult {
  allowed: boolean
  remaining: number
}

/**
 * Check and consume a rate limit slot.
 *
 * @param key     Unique key, e.g. "subscribe:ip:1.2.3.4"
 * @param limit   Max requests allowed in the window
 * @param windowMs  Window size in milliseconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const supabase = createServerClient()
  const windowStart = new Date(Date.now() - windowMs).toISOString()

  // Count recent attempts
  const { count } = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('key', key)
    .gte('created_at', windowStart)

  const current = count ?? 0

  if (current >= limit) {
    return { allowed: false, remaining: 0 }
  }

  // Record this attempt
  await supabase.from('rate_limits').insert({ key })

  // Opportunistic cleanup: delete old entries for this key (non-blocking)
  supabase
    .from('rate_limits')
    .delete()
    .eq('key', key)
    .lt('created_at', windowStart)
    .then(() => {})

  return { allowed: true, remaining: limit - current - 1 }
}
