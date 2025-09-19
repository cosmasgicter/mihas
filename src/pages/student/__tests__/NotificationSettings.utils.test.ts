import { beforeAll, describe, expect, it } from 'vitest'

process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'http://localhost:54321'
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? 'anon-key'

let resolveChannelEntry: (preferences: any, channel: 'sms' | 'whatsapp') => { type: string; enabled: boolean; priority: number }
let isChannelOptedIn: (preferences: any, channel: 'sms' | 'whatsapp') => boolean

beforeAll(async () => {
  ;({ resolveChannelEntry, isChannelOptedIn } = await import('@/pages/student/NotificationSettings'))
})

const basePreferences = {
  channels: [
    { type: 'sms', enabled: true, priority: 2 },
    { type: 'whatsapp', enabled: true, priority: 3 }
  ],
  sms_opt_in_at: null,
  sms_opt_out_at: null,
  whatsapp_opt_in_at: null,
  whatsapp_opt_out_at: null
} as const

describe('NotificationSettings helpers', () => {
  it('defaults to enabled entries for SMS and WhatsApp when none exist', () => {
    const smsEntry = resolveChannelEntry(null, 'sms')
    const whatsappEntry = resolveChannelEntry(null, 'whatsapp')

    expect(smsEntry.enabled).toBe(true)
    expect(whatsappEntry.enabled).toBe(true)
  })

  it('treats enabled channels without opt-outs as opted in', () => {
    expect(isChannelOptedIn({ ...basePreferences } as any, 'sms')).toBe(true)
    expect(isChannelOptedIn({ ...basePreferences } as any, 'whatsapp')).toBe(true)
  })

  it('respects opt-out state even when the channel is present', () => {
    const smsOptOutPreferences = {
      ...basePreferences,
      channels: basePreferences.channels.map(channel =>
        channel.type === 'sms' ? { ...channel, enabled: false } : channel
      ),
      sms_opt_out_at: '2024-01-01T00:00:00Z'
    } as any

    const whatsappOptOutPreferences = {
      ...basePreferences,
      channels: basePreferences.channels.map(channel =>
        channel.type === 'whatsapp' ? { ...channel, enabled: false } : channel
      ),
      whatsapp_opt_out_at: '2024-02-01T00:00:00Z'
    } as any

    expect(isChannelOptedIn(smsOptOutPreferences, 'sms')).toBe(false)
    expect(isChannelOptedIn(whatsappOptOutPreferences, 'whatsapp')).toBe(false)
  })
})
