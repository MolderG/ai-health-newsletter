import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Get the Monday of the current week (00:00 UTC).
 */
function getMondayOfThisWeek(): string {
  const now = new Date()
  const day = now.getUTCDay() // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1 // days since Monday
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - diff)
  monday.setUTCHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0] // YYYY-MM-DD
}

/**
 * Query approved, unused news candidates from the current week and format
 * them as structured text for the newsletter generation prompt.
 */
export async function getApprovedNewsForGeneration(
  supabase: SupabaseClient,
): Promise<string> {
  const monday = getMondayOfThisWeek()

  const { data: approvedNews, error } = await supabase
    .from('news_candidates')
    .select('*')
    .eq('status', 'approved')
    .is('used_in_email_id', null)
    .gte('fetched_at', monday)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) throw new Error(`Failed to fetch approved news: ${error.message}`)

  if (!approvedNews || approvedNews.length < 3) {
    throw new Error(
      `Apenas ${approvedNews?.length ?? 0} notícias aprovadas na semana. Mínimo necessário: 3.`
    )
  }

  return approvedNews
    .map(
      (n: { titulo: string; resumo: string; fonte: string | null }, i: number) =>
        `${i + 1}. ${n.titulo}\nResumo: ${n.resumo}\nFonte: ${n.fonte ?? 'não informada'}`,
    )
    .join('\n\n')
}

/**
 * Mark news candidates as used by a specific newsletter edition.
 * This prevents them from being reused in future editions.
 */
export async function markNewsAsUsed(
  supabase: SupabaseClient,
  candidateIds: string[],
  emailId: string,
): Promise<void> {
  const { error } = await supabase
    .from('news_candidates')
    .update({ used_in_email_id: emailId })
    .in('id', candidateIds)

  if (error) throw new Error(`Failed to mark news as used: ${error.message}`)
}
