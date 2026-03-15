// lib/__tests__/telegram.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vi.clearAllMocks()
  process.env.TELEGRAM_BOT_TOKEN = 'test-token'
  process.env.TELEGRAM_CHAT_ID = '12345678'
  process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com'
})

describe('sendTelegramMessage', () => {
  it('posts to sendMessage with correct chat_id and returns message_id', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 42 } }),
    })

    const { sendTelegramMessage } = await import('@/lib/telegram')
    const id = await sendTelegramMessage('Hello')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.telegram.org/bottest-token/sendMessage',
      expect.objectContaining({ method: 'POST' })
    )
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.chat_id).toBe(12345678)
    expect(id).toBe(42)
  })
})

describe('answerCallbackQuery', () => {
  it('posts to answerCallbackQuery endpoint', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })

    const { answerCallbackQuery } = await import('@/lib/telegram')
    await answerCallbackQuery('qid-123')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.telegram.org/bottest-token/answerCallbackQuery',
      expect.objectContaining({ method: 'POST' })
    )
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.callback_query_id).toBe('qid-123')
  })
})

describe('removeInlineKeyboard', () => {
  it('calls editMessageReplyMarkup with correct chat_id, message_id, and empty keyboard', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })

    const { removeInlineKeyboard } = await import('@/lib/telegram')
    await removeInlineKeyboard(999)

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.chat_id).toBe(12345678)
    expect(body.message_id).toBe(999)
    expect(body.reply_markup).toEqual({ inline_keyboard: [] })
  })
})

describe('sendDraftNotification', () => {
  it('includes preview URL, subject, and correct callback_data values in keyboard', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 7 } }),
    })

    const { sendDraftNotification } = await import('@/lib/telegram')
    await sendDraftNotification({
      subject: 'IA em diagnósticos',
      previewText: 'Esta semana...',
      previewToken: 'abc-token',
    })

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.text).toContain('abc-token')
    expect(body.text).toContain('IA em diagnósticos')
    const buttons = body.reply_markup.inline_keyboard[0]
    expect(buttons).toHaveLength(2)
    // These exact values drive the webhook state machine — must not change
    expect(buttons[0].callback_data).toBe('approve')
    expect(buttons[1].callback_data).toBe('reject')
  })
})

describe('sendMissedSendNotification', () => {
  it('sends message with approval keyboard', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 8 } }),
    })

    const { sendMissedSendNotification } = await import('@/lib/telegram')
    await sendMissedSendNotification()

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.text).toContain('9h de segunda')
    const buttons = body.reply_markup.inline_keyboard[0]
    expect(buttons[0].callback_data).toBe('approve')
    expect(buttons[1].callback_data).toBe('reject')
  })
})
