import { describe, expect, it, beforeEach, vi } from 'vitest'

const insertSpy = vi.fn()

const { supabaseMock, fromMock } = vi.hoisted(() => {
  const from = vi.fn()
  return {
    supabaseMock: { from },
    fromMock: from
  }
})

const { notificationServiceMock, dispatchChannelMock } = vi.hoisted(() => {
  const dispatch = vi.fn()
  return {
    notificationServiceMock: { dispatchChannel: dispatch },
    dispatchChannelMock: dispatch
  }
})

vi.mock('@/lib/supabase', () => ({ supabase: supabaseMock }))

vi.mock('@/services/notifications', () => ({ notificationService: notificationServiceMock }))

import { multiChannelNotifications } from '@/lib/multiChannelNotifications'

function mockSupabaseResponses(preferences: Record<string, unknown>) {
  fromMock.mockImplementation((table: string) => {
    if (table === 'user_notification_preferences') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: preferences })
          })
        })
      }
    }

    if (table === 'notification_logs') {
      return {
        insert: (payload: Record<string, unknown>) => {
          insertSpy(payload)
          return Promise.resolve({ error: null })
        }
      }
    }

    throw new Error(`Unexpected table requested: ${table}`)
  })
}

const basePreferences = {
  channels: [
    { type: 'email', enabled: true, priority: 1 },
    { type: 'sms', enabled: true, priority: 2 },
    { type: 'whatsapp', enabled: true, priority: 3 },
    { type: 'in_app', enabled: true, priority: 4 }
  ],
  frequency: 'immediate',
  optimalTiming: true,
  sms_opt_in_at: null,
  sms_opt_in_source: null,
  sms_opt_in_actor: null,
  sms_opt_out_at: null,
  sms_opt_out_source: null,
  sms_opt_out_actor: null,
  sms_opt_out_reason: null,
  whatsapp_opt_in_at: null,
  whatsapp_opt_in_source: null,
  whatsapp_opt_in_actor: null,
  whatsapp_opt_out_at: null,
  whatsapp_opt_out_source: null,
  whatsapp_opt_out_actor: null,
  whatsapp_opt_out_reason: null
}

beforeEach(() => {
  fromMock.mockReset()
  insertSpy.mockReset()
  dispatchChannelMock.mockReset()
})

describe('MultiChannelNotificationService consent gating', () => {
  it('blocks SMS dispatch when the channel lacks explicit opt-in consent', async () => {
    mockSupabaseResponses({
      ...basePreferences,
      sms_opt_in_at: null,
      sms_opt_out_at: null,
      channels: basePreferences.channels
    })

    const result = await multiChannelNotifications.sendNotification(
      'user-123',
      'application_approved',
      { full_name: 'Test Student', program: 'Nursing', institution: 'MIHAS' },
      ['sms']
    )

    expect(result).toBe(false)
    expect(dispatchChannelMock).not.toHaveBeenCalled()

    expect(insertSpy).toHaveBeenCalledTimes(1)
    const payload = insertSpy.mock.calls[0][0]
    expect(payload.channel_statuses).toEqual({ sms: 'blocked' })
    expect(payload.success_count).toBe(0)
    expect(payload.total_count).toBe(1)
  })

  it('dispatches to all opted-in channels and records provider metadata', async () => {
    mockSupabaseResponses({
      ...basePreferences,
      sms_opt_in_at: '2025-03-01T10:00:00Z',
      whatsapp_opt_in_at: '2025-03-01T10:05:00Z',
      sms_opt_out_at: null,
      whatsapp_opt_out_at: null
    })

    dispatchChannelMock
      .mockResolvedValueOnce({ success: true, status: 'queued', messageId: 'SM123' })
      .mockResolvedValueOnce({ success: true, status: 'sent', messageId: 'WA456' })

    const result = await multiChannelNotifications.sendNotification(
      'user-123',
      'application_approved',
      { full_name: 'Test Student', program: 'Nursing', institution: 'MIHAS' },
      ['sms', 'whatsapp']
    )

    expect(result).toBe(true)
    expect(dispatchChannelMock).toHaveBeenCalledTimes(2)
    expect(dispatchChannelMock).toHaveBeenNthCalledWith(1, {
      channel: 'sms',
      content: expect.any(String),
      type: 'application_approved',
      userId: 'user-123'
    })
    expect(dispatchChannelMock).toHaveBeenNthCalledWith(2, {
      channel: 'whatsapp',
      content: expect.any(String),
      type: 'application_approved',
      userId: 'user-123'
    })

    const payload = insertSpy.mock.calls[0][0]
    expect(payload.success_count).toBe(2)
    expect(payload.channel_statuses).toEqual({ sms: 'queued', whatsapp: 'sent' })
    expect(payload.provider_message_ids).toEqual({ sms: 'SM123', whatsapp: 'WA456' })
  })
})
