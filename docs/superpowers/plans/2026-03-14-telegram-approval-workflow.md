# Telegram Approval Workflow Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Telegram-based human-in-the-loop approval flow so the editor reviews, approves, or requests improvements to each newsletter draft before it is sent to email subscribers.

**Architecture:** Two Vercel crons (generate on Sunday, send on Monday). Approval state lives in the `emails` table. A Telegram webhook drives state transitions. Async regeneration uses Next.js `after()` to comply with Telegram's 5-second response limit without needing a separate background service.

**Tech Stack:** Next.js 16 (`after()` from `next/server`), Telegram Bot API, Supabase, Vitest

**Spec:** `docs/superpowers/specs/2026-03-14-telegram-approval-workflow-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/002_telegram_approval.sql` | Create | 6 new columns on `emails` table |
| `lib/telegram.ts` | Create | Telegram API helpers |
| `lib/__tests__/telegram.test.ts` | Create | Unit tests for telegram helpers |
| `lib/ai/pipeline.ts` | Modify | Add optional `feedback` param; add `previewText` to `PipelineResult` |
| `lib/ai/__tests__/pipeline-feedback.test.ts` | Create | Tests for new `previewText` and `feedback` functionality (separate from existing `pipeline.test.ts`) |
| `app/api/cron/generate/route.ts` | Modify | Save `approval_status`, `preview_token`, `preview_text`; send Telegram notification |
| `app/api/cron/send/route.ts` | Create | Monday send cron — find scheduled email or notify if none |
| `app/api/telegram/webhook/route.ts` | Create | Telegram webhook + state machine (approve/reject/feedback) |
| `app/preview/[token]/page.tsx` | Create | Public preview page, token-based auth, no login |
| `vercel.json` | Modify | Replace existing Monday cron with Sunday (generate) + Monday (send) |
| `next.config.ts` | Read | No change needed — `after()` stable in Next.js 16 without config |
| `scripts/setup-telegram-webhook.sh` | Create | One-time script to register Telegram webhook URL |

---

## Chunk 1: Foundation — Migration, Env Vars, Telegram Helpers

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/002_telegram_approval.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/002_telegram_approval.sql
ALTER TABLE emails
  ADD COLUMN IF NOT EXISTS approval_status TEXT
    CHECK (approval_status IN ('pending_approval','pending_feedback','approved','sent','skipped')),
  ADD COLUMN IF NOT EXISTS approval_feedback TEXT,
  ADD COLUMN IF NOT EXISTS preview_token UUID,
  ADD COLUMN IF NOT EXISTS preview_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS telegram_message_id BIGINT,
  ADD COLUMN IF NOT EXISTS send_immediately BOOLEAN NOT NULL DEFAULT FALSE;

-- Fast lookup of drafts awaiting action
CREATE INDEX IF NOT EXISTS emails_approval_active
  ON emails(approval_status)
  WHERE approval_status IN ('pending_approval', 'pending_feedback');
```

Note: `preview_text` column already exists in the schema — no migration needed.

- [ ] **Step 2: Apply migration**

Go to Supabase project → SQL Editor → paste the SQL above → Run.

Verify: `SELECT column_name FROM information_schema.columns WHERE table_name = 'emails' ORDER BY ordinal_position;` — `approval_status`, `approval_feedback`, `preview_token`, `preview_token_expires_at`, `telegram_message_id`, `send_immediately` must appear.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_telegram_approval.sql
git commit -m "feat: add telegram approval columns to emails table"
```

---

### Task 2: Environment variables

- [ ] **Step 1: Add to `.env.local`**

```bash
TELEGRAM_BOT_TOKEN=        # token from @BotFather
TELEGRAM_CHAT_ID=          # your numeric chat ID (how to get: see step 2)
TELEGRAM_WEBHOOK_SECRET=   # random string — run: openssl rand -hex 16
```

- [ ] **Step 2: Get your chat ID**

Start a conversation with your new bot in Telegram, then open in browser:
`https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`

Your chat ID is at `result[0].message.chat.id`.

- [ ] **Step 3: Verify `.env.local` is in `.gitignore`**

```bash
grep '.env.local' .gitignore
```
Should return a matching line. If not, add `.env.local` to `.gitignore`.

---

### Task 3: Telegram helpers library

**Files:**
- Create: `lib/telegram.ts`
- Create: `lib/__tests__/telegram.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
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
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx vitest run lib/__tests__/telegram.test.ts
```
Expected: FAIL — Vitest will report an import/resolution error since `lib/telegram.ts` does not exist yet

- [ ] **Step 3: Implement `lib/telegram.ts`**

```typescript
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
    `📌 *Temas:* ${params.subject}`,
    '',
    `📝 *Carta editorial:*`,
    `${preview}${ellipsis}`,
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
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx vitest run lib/__tests__/telegram.test.ts
```
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/telegram.ts lib/__tests__/telegram.test.ts
git commit -m "feat: add Telegram API helpers library"
```

---

## Chunk 2: Pipeline Update + Generate Cron

### Task 4: Add feedback param and previewText to pipeline

**Files:**
- Modify: `lib/ai/pipeline.ts`
- Create: `lib/ai/__tests__/pipeline-feedback.test.ts` (note: an existing `pipeline.test.ts` may already be in this directory — create a separate file to avoid conflicts)

The pipeline currently takes `news: string`. We add an optional `feedback?: string` that, when present, appends editor notes to the generation prompt so models can improve the draft. We also extract a plain-text `previewText` from the winning carta.

- [ ] **Step 1: Write failing test**

```typescript
// lib/ai/__tests__/pipeline-feedback.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/ai/openrouter', () => ({
  generateWithModel: vi.fn().mockResolvedValue(
    JSON.stringify({
      subject: 'IA no hospital',
      carta: '<p>Esta semana foi intensa.</p><p>Boa leitura,<br>Henrique</p>',
      materias: [{
        titulo: 'Teste',
        oQueAconteceu: 'Algo aconteceu.',
        comoFunciona: 'Funciona assim.',
        porQueImporta: 'É importante.',
        nossaVisao: 'Nossa visão.',
      }],
      numeroDaSemana: null,
      blocoPromo: null,
    })
  ),
}))

describe('generateNewsletter', () => {
  it('returns previewText as plain text extracted from carta', async () => {
    const { generateNewsletter } = await import('@/lib/ai/pipeline')
    const result = await generateNewsletter('some news')
    expect(result.previewText).toBe('Esta semana foi intensa. Boa leitura, Henrique')
  })

  it('accepts feedback and returns a result', async () => {
    const { generateNewsletter } = await import('@/lib/ai/pipeline')
    const result = await generateNewsletter('some news', 'Improve the carta tone')
    expect(result.previewText).toBeDefined()
    expect(result.subject).toBe('IA no hospital')
  })
})
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx vitest run lib/ai/__tests__/pipeline-feedback.test.ts
```
Expected: FAIL — `previewText` not in result

- [ ] **Step 3: Modify `lib/ai/pipeline.ts`**

Add `previewText` to `PipelineResult` interface:

```typescript
export interface PipelineResult {
  winningContent: string
  winningModel: string
  justification: string
  subject: string
  previewText: string          // NEW: plain text excerpt of the carta editorial
  allOutputs: { model: string; content: string }[]
}
```

Add a feedback block to `buildGenerationPrompt`:

```typescript
function buildGenerationPrompt(news: string, feedback?: string): string {
  const feedbackBlock = feedback ? `\n\n---\n\nNOTA DO EDITOR (melhorias solicitadas — aplique em TODAS as seções):\n${feedback}\n\n---` : ''

  return `Você é Henrique, curador da newsletter...
// ... (keep existing prompt body unchanged) ...
NOTÍCIAS DA SEMANA:
${news}
${feedbackBlock}
---

Retorne APENAS um JSON válido...`
}
```

Add `previewText` extraction after parsing winning JSON and update function signature:

```typescript
// Helper — strip HTML tags and normalize whitespace
function extractPlainText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function generateNewsletter(
  news: string,
  feedback?: string,        // NEW optional param
): Promise<PipelineResult> {
  const prompt = buildGenerationPrompt(news, feedback)
  // ... rest of function unchanged until the return ...

  const previewText = extractPlainText(newsletterData.carta)   // NEW

  return {
    winningContent,
    winningModel,
    justification: evaluation.justification,
    subject: newsletterData.subject,
    previewText,              // NEW
    allOutputs,
  }
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx vitest run lib/ai/__tests__/pipeline-feedback.test.ts
```
Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/ai/pipeline.ts lib/ai/__tests__/pipeline-feedback.test.ts
git commit -m "feat: add feedback param and previewText to newsletter pipeline"
```

---

### Task 5: Update generate cron

**Files:**
- Modify: `app/api/cron/generate/route.ts`

The cron must now:
1. Generate `preview_token` (UUID) and `preview_token_expires_at` (72h from now)
2. Mark previous unresolved drafts as `status = 'skipped'`
3. Insert draft with new columns including `approval_status = 'pending_approval'` and `preview_text`
4. Send Telegram draft notification

- [ ] **Step 1: Update `app/api/cron/generate/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { searchHealthAINews } from '@/lib/ai/perplexity'
import { generateNewsletter } from '@/lib/ai/pipeline'
import { createServerClient } from '@/lib/supabase-server'
import { sendDraftNotification, sendErrorNotification } from '@/lib/telegram'
import { randomUUID } from 'crypto'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  try {
    // Mark any unresolved previous drafts as skipped
    await supabase
      .from('emails')
      .update({ status: 'skipped', approval_status: 'skipped' })
      .in('approval_status', ['pending_approval', 'pending_feedback'])

    const news = await searchHealthAINews()
    const result = await generateNewsletter(news)

    const previewToken = randomUUID()
    const previewTokenExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

    const { data, error: insertError } = await supabase
      .from('emails')
      .insert({
        content_html: result.winningContent,
        subject: result.subject,
        preview_text: result.previewText,
        winning_model: result.winningModel,
        evaluator_justification: result.justification,
        model_outputs: result.allOutputs,
        status: 'draft',
        approval_status: 'pending_approval',
        preview_token: previewToken,
        preview_token_expires_at: previewTokenExpiresAt,
      })
      .select('id')
      .single()

    if (insertError) throw insertError

    const telegramMessageId = await sendDraftNotification({
      subject: result.subject,
      previewText: result.previewText,
      previewToken: previewToken,
    })

    await supabase
      .from('emails')
      .update({ telegram_message_id: telegramMessageId })
      .eq('id', data.id)

    return NextResponse.json({ ok: true, winningModel: result.winningModel, id: data.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await sendErrorNotification('gerar newsletter', message).catch(() => {})
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Manual smoke test (optional — requires real env vars)**

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/generate
```
Expected: `{"ok":true,"winningModel":"...","id":"..."}` and a Telegram message arrives.

- [ ] **Step 3: Commit**

```bash
git add app/api/cron/generate/route.ts
git commit -m "feat: update generate cron with approval state and Telegram notification"
```

---

## Chunk 3: Send Cron

### Task 6: Create Monday send cron

**Files:**
- Create: `app/api/cron/send/route.ts`

This cron runs Monday at 12:00 UTC (09:00 BRT). It looks for an email with `status = 'scheduled'`. If found, sends it. If not, sends a Telegram missed-send notification and sets `send_immediately = true` on the pending draft.

- [ ] **Step 1: Create `app/api/cron/send/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { sendNewsletter } from '@/lib/newsletter-sender'
import {
  sendMissedSendNotification,
  sendErrorNotification,
} from '@/lib/telegram'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  // Find the scheduled email
  const { data: email } = await supabase
    .from('emails')
    .select('id')
    .eq('status', 'scheduled')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (email) {
    try {
      const result = await sendNewsletter(email.id)
      await supabase
        .from('emails')
        .update({ approval_status: 'sent' })
        .eq('id', email.id)
      return NextResponse.json({ ok: true, ...result })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      // Already sent (e.g. admin panel sent it manually) — no-op, no notification
      if (message === 'Newsletter already sent') {
        return NextResponse.json({ ok: true, sent: 0, alreadySent: true })
      }
      await sendErrorNotification('enviar newsletter', message).catch(() => {})
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  // No scheduled email — notify editor and mark pending draft as send_immediately.
  // Check both pending_approval and pending_feedback so the flag is set even if
  // a regeneration cycle is underway (editor will send immediately on next approval).
  const { data: pendingEmail } = await supabase
    .from('emails')
    .select('id')
    .in('approval_status', ['pending_approval', 'pending_feedback'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (pendingEmail) {
    await supabase
      .from('emails')
      .update({ send_immediately: true })
      .eq('id', pendingEmail.id)
  }

  await sendMissedSendNotification().catch(() => {})

  return NextResponse.json({ ok: true, sent: 0, notified: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/cron/send/route.ts
git commit -m "feat: add Monday send cron with missed-send Telegram notification"
```

---

## Chunk 4: Telegram Webhook

### Task 7: Telegram webhook — state machine

**Files:**
- Create: `app/api/telegram/webhook/route.ts`

This is the core state machine. It handles:
- `callback_query` with `data = 'approve'` → approve or send immediately
- `callback_query` with `data = 'reject'` → enter feedback collection
- `message` text while `approval_status = 'pending_feedback'` → trigger async regeneration via `after()`

**Important:** `after()` from `next/server` keeps the function alive after the HTTP 200 response is sent. `maxDuration = 300` is required (Vercel Pro plan; on Hobby plan the limit is 60s which may be tight).

- [ ] **Step 1: Create `app/api/telegram/webhook/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { sendNewsletter } from '@/lib/newsletter-sender'
import { searchHealthAINews } from '@/lib/ai/perplexity'
import { generateNewsletter } from '@/lib/ai/pipeline'
import {
  sendTelegramMessage,
  sendDraftNotification,
  answerCallbackQuery,
  removeInlineKeyboard,
  sendErrorNotification,
} from '@/lib/telegram'
import { randomUUID } from 'crypto'

export const maxDuration = 300

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    chat: { id: number }
    text?: string
  }
  callback_query?: {
    id: string
    message: { message_id: number; chat: { id: number } }
    data: string
  }
}

function getActiveDraft(supabase: ReturnType<typeof createServerClient>) {
  return supabase
    .from('emails')
    .select('id, approval_status, send_immediately, telegram_message_id, subject, preview_text, approval_feedback')
    .in('approval_status', ['pending_approval', 'pending_feedback'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
}

export async function POST(request: NextRequest) {
  // Validate Telegram webhook secret
  const secret = request.headers.get('x-telegram-bot-api-secret-token')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const update: TelegramUpdate = await request.json()
  const expectedChatId = Number(process.env.TELEGRAM_CHAT_ID)

  // Determine chat ID from update type and validate
  const chatId = update.callback_query?.message.chat.id ?? update.message?.chat.id
  if (chatId !== expectedChatId) {
    return NextResponse.json({ ok: true }) // Ignore silently
  }

  const supabase = createServerClient()

  // ── APPROVE / REJECT (inline button) ─────────────────────────────────
  if (update.callback_query) {
    const cbq = update.callback_query
    await answerCallbackQuery(cbq.id)

    const { data: email } = await getActiveDraft(supabase)
    if (!email) {
      return NextResponse.json({ ok: true })
    }

    if (cbq.data === 'approve') {
      // Only approve from pending_approval state — not from pending_feedback
      if (email.approval_status !== 'pending_approval') {
        return NextResponse.json({ ok: true })
      }
      if (email.send_immediately) {
        // Send immediately
        await sendTelegramMessage('✅ Newsletter aprovada! Enviando agora...')
        try {
          await sendNewsletter(email.id)
          await supabase
            .from('emails')
            .update({ approval_status: 'sent', status: 'sent' })
            .eq('id', email.id)
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error'
          await sendErrorNotification('enviar newsletter', msg)
        }
      } else {
        // Schedule for Monday send cron
        await supabase
          .from('emails')
          .update({ approval_status: 'approved', status: 'scheduled' })
          .eq('id', email.id)
        await sendTelegramMessage('✅ Newsletter aprovada! Será enviada segunda às 9h.')
      }
    }

    if (cbq.data === 'reject') {
      // Remove buttons from old message so editor can't re-click
      if (email.telegram_message_id) {
        await removeInlineKeyboard(email.telegram_message_id).catch(() => {})
      }
      await supabase
        .from('emails')
        .update({ approval_status: 'pending_feedback' })
        .eq('id', email.id)
      await sendTelegramMessage('Quais são as melhorias a serem feitas?')
    }

    return NextResponse.json({ ok: true })
  }

  // ── FEEDBACK TEXT ────────────────────────────────────────────────────
  if (update.message?.text) {
    const { data: email } = await getActiveDraft(supabase)

    if (!email || email.approval_status !== 'pending_feedback') {
      return NextResponse.json({ ok: true }) // Ignore — not expecting feedback
    }

    const feedback = update.message.text
    await sendTelegramMessage('Recebido! Gerando nova versão...')

    // After responding 200, run regeneration asynchronously
    after(async () => {
      try {
        const news = await searchHealthAINews()
        const result = await generateNewsletter(news, feedback)

        const previewToken = randomUUID()
        const previewTokenExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

        await supabase
          .from('emails')
          .update({
            content_html: result.winningContent,
            subject: result.subject,
            preview_text: result.previewText,
            winning_model: result.winningModel,
            evaluator_justification: result.justification,
            model_outputs: result.allOutputs,
            approval_feedback: feedback,
            approval_status: 'pending_approval',
            preview_token: previewToken,
            preview_token_expires_at: previewTokenExpiresAt,
          })
          .eq('id', email.id)

        const newMessageId = await sendDraftNotification({
          subject: result.subject,
          previewText: result.previewText,
          previewToken: previewToken,
        })

        await supabase
          .from('emails')
          .update({ telegram_message_id: newMessageId })
          .eq('id', email.id)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        await sendErrorNotification('regenerar newsletter', msg)
        // Reset so editor can try again
        await supabase
          .from('emails')
          .update({ approval_status: 'pending_feedback' })
          .eq('id', email.id)
      }
    })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/telegram/webhook/route.ts
git commit -m "feat: add Telegram webhook with approval state machine"
```

---

## Chunk 5: Preview Page + Vercel Config + Webhook Registration

### Task 8: Public preview page

**Files:**
- Create: `app/preview/[token]/page.tsx`

No login required. Token validated against `emails.preview_token`. Returns 404 if invalid or expired.

- [ ] **Step 1: Create `app/preview/[token]/page.tsx`**

```typescript
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'

interface Props {
  params: Promise<{ token: string }>
}

export default async function PreviewPage({ params }: Props) {
  const { token } = await params
  const supabase = createServerClient()

  const { data: email } = await supabase
    .from('emails')
    .select('content_html, preview_token_expires_at, subject')
    .eq('preview_token', token)
    .single()

  if (!email) notFound()

  const expired = new Date(email.preview_token_expires_at) < new Date()
  if (expired) notFound()

  return (
    <div style={{ margin: 0, padding: 0 }}>
      <iframe
        srcDoc={email.content_html}
        style={{
          width: '100%',
          height: '100vh',
          border: 'none',
          display: 'block',
        }}
        title={`Preview: ${email.subject ?? 'Newsletter'}`}
        sandbox="allow-same-origin"
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify 404 behavior**

With a real token in the DB, open the preview URL in browser — newsletter HTML should render.
With an invalid token: `http://localhost:3000/preview/invalid-token` → should return Next.js 404 page.

- [ ] **Step 3: Commit**

```bash
git add app/preview/
git commit -m "feat: add public preview page with token-based access"
```

---

### Task 9: Update vercel.json

**Files:**
- Modify: `vercel.json`

Replace the existing Monday cron with two new crons.

- [ ] **Step 1: Update `vercel.json`**

```json
{
  "crons": [
    { "path": "/api/cron/generate", "schedule": "0 23 * * 0" },
    { "path": "/api/cron/send",     "schedule": "0 12 * * 1" }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat: update cron schedules — generate Sunday 20h BRT, send Monday 9h BRT"
```

---

### Task 10: Register Telegram webhook

This is a one-time setup that must be run after deploying to production.

- [ ] **Step 1: Create `scripts/setup-telegram-webhook.sh`**

```bash
#!/bin/bash
# Run once after deploying to production to register the webhook URL with Telegram.
# Usage: TELEGRAM_BOT_TOKEN=xxx WEBHOOK_SECRET=yyy BASE_URL=https://yourdomain.com bash scripts/setup-telegram-webhook.sh

set -e

if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$WEBHOOK_SECRET" ] || [ -z "$BASE_URL" ]; then
  echo "Usage: TELEGRAM_BOT_TOKEN=xxx WEBHOOK_SECRET=yyy BASE_URL=https://yourdomain.com bash $0"
  exit 1
fi

WEBHOOK_URL="${BASE_URL}/api/telegram/webhook"

echo "Registering webhook: $WEBHOOK_URL"

curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${WEBHOOK_URL}\", \"secret_token\": \"${WEBHOOK_SECRET}\"}" \
  | python3 -m json.tool

echo ""
echo "Done. Verify with:"
echo "  curl https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

- [ ] **Step 2: Run setup script after deploying to production**

```bash
chmod +x scripts/setup-telegram-webhook.sh
TELEGRAM_BOT_TOKEN=<token> WEBHOOK_SECRET=<your-webhook-secret> BASE_URL=https://yourdomain.com.br \
  bash scripts/setup-telegram-webhook.sh
```

Expected output: `{"ok":true,"result":true,"description":"Webhook was set"}`

Verify:
```bash
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```
Should show `"url": "https://yourdomain.com.br/api/telegram/webhook"` and `"pending_update_count": 0`.

- [ ] **Step 3: Commit**

```bash
git add scripts/setup-telegram-webhook.sh
git commit -m "feat: add Telegram webhook setup script"
```

---

### Task 11: End-to-end verification checklist

After deploying all changes, verify the full flow manually:

- [ ] **Generate draft:** Trigger `GET /api/cron/generate` with `Authorization: Bearer <CRON_SECRET>` → Telegram message arrives with ✅/❌ buttons and preview link
- [ ] **Preview link:** Click preview link → newsletter renders correctly, no login required
- [ ] **Token expiry:** Change `preview_token_expires_at` to a past timestamp in DB → preview link returns 404
- [ ] **Approve flow:** Click ✅ in Telegram → bot replies "Será enviada segunda às 9h." → `emails.status = 'scheduled'`
- [ ] **Send cron:** Trigger `GET /api/cron/send` → newsletter sent, `status = 'sent'`
- [ ] **Reject + feedback:** Click ❌ → bot asks for improvements → send feedback text → bot replies "Gerando..." → after ~30-60s, new Telegram message with new draft and fresh buttons
- [ ] **Missed send:** Set `status = 'draft'` (no scheduled email) → trigger send cron → Telegram notification arrives → `send_immediately = true` set on record → click ✅ → newsletter sent immediately
- [ ] **Sunday supersedes old draft:** With a `pending_approval` draft in DB, trigger generate cron → old record becomes `status = 'skipped'`, new draft created and Telegram message sent
- [ ] **Webhook security:** Send a POST to `/api/telegram/webhook` with no `X-Telegram-Bot-Api-Secret-Token` header → must return 401. Send with a wrong secret → must also return 401.
- [ ] **Double-approve idempotency:** After approving a draft (status becomes `scheduled`), simulate clicking ✅ again → no error, no state change, no duplicate send
