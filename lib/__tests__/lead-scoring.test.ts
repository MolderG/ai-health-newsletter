import { describe, it, expect } from 'vitest'
import { calculateScoreDelta, getLeadTemperature } from '../lead-scoring'

describe('calculateScoreDelta', () => {
  it('returns 2 for open event', () => {
    expect(calculateScoreDelta('open', null)).toBe(2)
  })

  it('returns 5 for click on regular link', () => {
    expect(calculateScoreDelta('click', 'https://example.com/article')).toBe(5)
  })

  it('returns 15 for click on cta-comercial link', () => {
    expect(calculateScoreDelta('click', 'https://weknow.com/demo?ref=cta-comercial')).toBe(15)
  })

  it('returns 20 for reply event', () => {
    expect(calculateScoreDelta('reply', null)).toBe(20)
  })

  it('returns 0 for bounce', () => {
    expect(calculateScoreDelta('bounce', null)).toBe(0)
  })
})

describe('getLeadTemperature', () => {
  it('returns cold for score 0-20', () => {
    expect(getLeadTemperature(0)).toBe('cold')
    expect(getLeadTemperature(20)).toBe('cold')
  })

  it('returns warm for score 21-50', () => {
    expect(getLeadTemperature(21)).toBe('warm')
    expect(getLeadTemperature(50)).toBe('warm')
  })

  it('returns hot for score 51+', () => {
    expect(getLeadTemperature(51)).toBe('hot')
    expect(getLeadTemperature(200)).toBe('hot')
  })
})
