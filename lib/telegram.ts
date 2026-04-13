// lib/telegram.ts

const APPROVAL_KEYBOARD = {
  inline_keyboard: [[
    { text: '✅ Aprovar', callback_data: 'approve' },
    { text: '❌ Reprovar', callback_data: 'reject' },
  ]],
}

async function callTelegram(method: string, body: object): Promise<unknown> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json() as { ok: boolean; result?: unknown; description?: string }
  if (!data.ok) throw new Error(`Telegram ${method} failed: ${data.description}`)
  return data.result
}

export async function sendTelegramMessage(
  text: string,
  replyMarkup?: object,
): Promise<number> {
  const chatId = Number(process.env.TELEGRAM_CHAT_ID)
  const result = await callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    link_preview_options: { is_disabled: true },
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  }) as { message_id: number }
  return result.message_id
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
): Promise<void> {
  await callTelegram('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  })
}

export async function removeInlineKeyboard(messageId: number): Promise<void> {
  const chatId = Number(process.env.TELEGRAM_CHAT_ID)
  await callTelegram('editMessageReplyMarkup', {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: [] },
  })
}

// Escape special characters for Telegram Markdown parse mode
function escapeMd(text: string): string {
  return text.replace(/[_*`[]/g, '\\$&')
}

export async function sendNewsCandidateNotification(params: {
  titulo: string
  resumo: string
  fonte: string
  candidateId: string
}): Promise<number> {
  const keyboard = {
    inline_keyboard: [[
      { text: '✅ Aprovar', callback_data: `news_approve:${params.candidateId}` },
      { text: '❌ Rejeitar', callback_data: `news_reject:${params.candidateId}` },
    ]],
  }

  const text = [
    `📰 *Notícia do dia*`,
    '',
    `*${escapeMd(params.titulo)}*`,
    '',
    escapeMd(params.resumo),
    '',
    `📎 Fonte: ${escapeMd(params.fonte || 'não informada')}`,
  ].join('\n')

  return sendTelegramMessage(text, keyboard)
}

export async function sendDraftNotification(params: {
  subject: string
  previewText: string
  previewToken: string
}): Promise<number> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  const previewUrl = `${baseUrl}/preview/${params.previewToken}`
  const date = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  const preview = params.previewText.slice(0, 300)
  const ellipsis = params.previewText.length > 300 ? '...' : ''

  const text = [
    `📰 *Newsletter — Semana de ${date}*`,
    '',
    `📌 *Temas:* ${escapeMd(params.subject)}`,
    '',
    `📝 *Resumo:*`,
    `${escapeMd(preview)}${ellipsis}`,
    '',
    `🔗 [Visualizar draft completo](${previewUrl})`,
  ].join('\n')

  return sendTelegramMessage(text, APPROVAL_KEYBOARD)
}

export async function sendMissedSendNotification(): Promise<number> {
  const text = '⚠️ Já são 9h de segunda e a newsletter ainda não foi aprovada. O que fazer?'
  return sendTelegramMessage(text, APPROVAL_KEYBOARD)
}

export async function sendErrorNotification(context: string, error: string): Promise<void> {
  await sendTelegramMessage(`⚠️ Erro ao ${context}: ${error}`)
}
