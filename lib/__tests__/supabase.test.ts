import { describe, it, expect } from 'vitest'
import { supabase } from '../supabase'

describe('supabase client', () => {
  it('creates a client instance', () => {
    expect(supabase).toBeDefined()
    expect(typeof supabase.from).toBe('function')
  })
})
