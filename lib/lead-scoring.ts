const CTA_COMMERCIAL_TAG = 'cta-comercial'

export function calculateScoreDelta(eventType: string, urlClicked: string | null): number {
  if (eventType === 'open') return 2
  if (eventType === 'reply') return 20
  if (eventType === 'click') {
    if (urlClicked?.includes(CTA_COMMERCIAL_TAG)) return 15
    return 5
  }
  return 0
}

export type LeadTemperature = 'cold' | 'warm' | 'hot'

export function getLeadTemperature(score: number): LeadTemperature {
  if (score <= 20) return 'cold'
  if (score <= 50) return 'warm'
  return 'hot'
}
