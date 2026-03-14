# Design: Telegram Approval Workflow

**Date:** 2026-03-14
**Status:** Approved

## Overview

Weekly newsletter generation and delivery system with a Telegram-based human-in-the-loop approval flow. The editor reviews and approves (or requests improvements to) each draft via Telegram before it is sent to subscribers via email.

---

## Full Weekly Flow

| Time | Action |
|---|---|
| Sunday 20:00 BRT (23:00 UTC) | Cron generates draft, saves to DB, sends Telegram message with summary + preview link |
| Sunday–Monday | Editor approves or provides feedback via Telegram |
| Monday 09:00 BRT (12:00 UTC) | Cron checks for scheduled email and sends; if none found, notifies editor via Telegram |
| Any time after Monday notification | Editor can still approve/reject; if approved, sends immediately |

---

## State Machine

The `approval_status` column on the `emails` table drives the entire flow.

```
pending_approval  →  (approved)  → approved  →  sent
                  →  (rejected)  → pending_feedback  →  (feedback received)  → pending_approval
```

### State Transitions

| Current State | Trigger | Next State | Side Effect |
|---|---|---|---|
| _(draft created by cron)_ | Cron generates newsletter | `pending_approval` | `status = 'draft'`. Telegram message sent with ✅/❌ buttons. `telegram_message_id` stored. |
| `pending_approval` | Editor clicks ✅ Aprovar, before Monday 09:00 | `approved`, `status = 'scheduled'` | Bot confirms: "Será enviada segunda às 9h." |
| `pending_approval` | Editor clicks ✅ Aprovar, after Monday 09:00 | `approved`, `status = 'sent'` | Newsletter sent immediately. |
| `pending_approval` | Editor clicks ❌ Reprovar | `pending_feedback` | Old Telegram message edited to remove buttons. Bot asks for improvement notes. |
| `pending_feedback` | Editor sends feedback text | `pending_approval` | Ack sent immediately ("Gerando..."). Pipeline runs async. Old `telegram_message_id` updated. New draft overwrites record. New Telegram message sent. |
| `approved` / `status = 'scheduled'` | Monday 09:00 cron | `sent`, `status = 'sent'` | Newsletter sent to all active subscribers. |
| No `scheduled` email at Monday 09:00 | Monday cron finds nothing | `pending_approval` (re-notified) | Telegram notification sent. `send_immediately = true` set on the record. |
| Re-notified, editor clicks ✅ | Past Monday 09:00 | `sent`, `status = 'sent'` | Newsletter sent immediately. |
| Re-notified, editor clicks ❌ | Past Monday 09:00 | `pending_feedback` | Feedback loop runs. On next approval, sends immediately. |
| New Sunday cron runs | Previous draft still unresolved | Previous record marked `status = 'skipped'` | New draft created fresh. Previous draft is superseded and no longer actionable. |

### Detecting "past Monday 09:00"

The webhook determines whether to send immediately or schedule by checking whether a boolean flag `send_immediately` is present on the `emails` record. This flag is set to `true` by the Monday 09:00 cron when it sends the missed-send notification. The webhook does not perform clock comparisons.

---

## Architecture

### Approach: Webhook-stateless with Supabase state

Telegram sends all events to a single webhook endpoint. State is persisted in the `emails` table. Each webhook invocation reads the current state from the DB and executes the appropriate transition.

### Vercel Crons — `vercel.json` (full replacement)

The existing cron entry (`0 8 * * 1`) must be **replaced** entirely. The new `vercel.json` crons section:

```json
{
  "crons": [
    { "path": "/api/cron/generate", "schedule": "0 23 * * 0" },
    { "path": "/api/cron/send",     "schedule": "0 12 * * 1" }
  ]
}
```

### New Files

```
app/api/telegram/webhook/route.ts     # Telegram webhook — state machine
app/api/cron/send/route.ts            # Monday send cron
app/preview/[token]/page.tsx          # Public preview page (no login)
lib/telegram.ts                       # sendMessage, sendDraftMessage, editMessage helpers
supabase/migrations/XXXX_telegram_approval.sql
```

---

## Database Changes

### New columns on `emails` table

| Column | Type | Description |
|---|---|---|
| `approval_status` | TEXT | `pending_approval` \| `pending_feedback` \| `approved` \| `sent` \| `skipped` |
| `approval_feedback` | TEXT | Editor's improvement notes (used in regeneration prompt) |
| `preview_token` | UUID | Secret token for the public preview URL |
| `preview_token_expires_at` | TIMESTAMPTZ | Expires 72h from creation or last regeneration |
| `telegram_message_id` | BIGINT | ID of the Telegram message sent for this draft (used to edit/replace buttons) |
| `send_immediately` | BOOLEAN | `true` when set by the Monday cron missed-send notification |

### Migration SQL

The existing `emails.status` column is unconstrained TEXT (no CHECK constraint in the current schema). The new `'skipped'` value is written to `status` by the Sunday cron when superseding an unresolved draft. No schema change is needed for this — the column accepts any string. Application-level validation is sufficient.

```sql
ALTER TABLE emails
  ADD COLUMN approval_status TEXT
    CHECK (approval_status IN ('pending_approval','pending_feedback','approved','sent','skipped')),
  ADD COLUMN approval_feedback TEXT,
  ADD COLUMN preview_token UUID,
  ADD COLUMN preview_token_expires_at TIMESTAMPTZ,
  ADD COLUMN telegram_message_id BIGINT,
  ADD COLUMN send_immediately BOOLEAN NOT NULL DEFAULT FALSE;
```

### Token generation

`preview_token` (UUID v4) and `preview_token_expires_at` (NOW() + 72 hours) are generated inside the `/api/cron/generate` route at draft creation time and written in the same `INSERT` as the rest of the draft. On regeneration after feedback, both values are overwritten with fresh values (new UUID, new 72h expiry from time of regeneration).

### Regeneration behavior

When the editor rejects a draft and sends feedback, the system **overwrites the existing record** (does not create a new one). Fields updated: `content_html`, `subject`, `winning_model`, `evaluator_justification`, `approval_feedback`, `approval_status`, `preview_token`, `preview_token_expires_at`, `telegram_message_id`. The full history of all model attempts is preserved in the existing `model_outputs` JSONB field.

---

## Telegram Integration

### Message format (draft notification)

```
📰 *Newsletter — Semana de DD/MM/YYYY*

📌 *Temas:* [subject from pipeline]

📝 *Carta editorial:*
[first ~300 characters of editorial letter]

🔗 Visualizar draft completo: https://[BASE_URL]/preview/[token]
```

Inline keyboard buttons: `✅ Aprovar` | `❌ Reprovar`

### Bot response messages

| Trigger | Bot response |
|---|---|
| ✅ Aprovar (before Monday 09:00) | "✅ Newsletter aprovada! Será enviada segunda às 9h." |
| ✅ Aprovar (after Monday 09:00 / `send_immediately = true`) | "✅ Newsletter aprovada! Enviando agora..." |
| ❌ Reprovar | "Quais são as melhorias a serem feitas?" (old message buttons removed via editMessageReplyMarkup) |
| Feedback text received | "Recebido! Gerando nova versão..." (sent immediately as ack) → pipeline runs async → new draft message sent when ready |
| Monday 09:00, no approval found | "⚠️ Já são 9h de segunda e a newsletter ainda não foi aprovada. O que fazer?" + ✅/❌ buttons |
| Pipeline error | "⚠️ Erro ao gerar newsletter: [error message]" |
| Regeneration error | "⚠️ Erro ao regenerar newsletter: [error message]" — `approval_status` stays `pending_feedback` |

### Telegram update types

The webhook receives two distinct Telegram update types:

- **`callback_query`** — fired when the editor presses an inline keyboard button (✅/❌). After processing, the handler **must** call `answerCallbackQuery` with the `callback_query.id`, otherwise Telegram shows a loading spinner indefinitely on the editor's device.
- **`message`** — fired when the editor sends a text message (improvement feedback). No additional acknowledgment is required beyond the bot's reply.

Any other update types (e.g., from other chats) are ignored silently.

### Async regeneration (Vercel serverless timeout)

Telegram requires a webhook response within **5 seconds**, but the LLM pipeline takes 15–60 seconds. Fire-and-forget `fetch` is **not reliable** on Vercel Node.js runtime — the execution context is frozen or terminated immediately after the response is sent, so any detached promise will silently fail.

The correct pattern uses **`after()` from `next/server`** (available since Next.js 15, included in this project's Next.js 16). `after()` schedules work to run after the response is flushed, keeping the function alive until the callback completes (up to the route's `maxDuration`).

The webhook route must declare:
```ts
export const maxDuration = 300; // seconds — requires Vercel Pro or higher
```

Flow:
1. Webhook receives feedback text
2. Immediately: send "Recebido! Gerando nova versão..." via Telegram API
3. Immediately: call `answerCallbackQuery` if this was a `callback_query`
4. Schedule regeneration: `after(async () => { /* run pipeline, update DB, send new draft */ })`
5. Return HTTP 200 to Telegram — response is sent; `after()` block continues running

This pattern keeps all logic inside the single webhook route — no internal endpoint needed. The `after()` block handles the full regeneration: run pipeline → overwrite DB record → send new Telegram draft message. On error inside `after()`, catch and send a Telegram error notification.

> Note: `maxDuration = 300` requires Vercel Pro plan. On the Hobby plan (max 60s), the pipeline may timeout on slow model responses. If that becomes an issue, the fallback is a dedicated `/api/internal/regenerate` route (protected by `CRON_SECRET`) called via `fetch` inside the `after()` block.

### Stale message handling

When a draft is regenerated after feedback, the previous Telegram message (identified by `telegram_message_id`) is edited to remove its inline keyboard via `editMessageReplyMarkup`. This prevents the editor from accidentally approving or rejecting a superseded draft.

### Webhook security

- Telegram `setWebhook` is called with a `secret_token` parameter
- `/api/telegram/webhook` validates the `X-Telegram-Bot-Api-Secret-Token` header — returns 401 if invalid or missing
- Every incoming update's `message.chat.id` or `callback_query.message.chat.id` is checked against `TELEGRAM_CHAT_ID` — the handler returns 200 silently for any other chat (no error response, to avoid Telegram retries)

---

## Preview Page (`/preview/[token]`)

- Route: `app/preview/[token]/page.tsx`
- No authentication required — token is the only access control
- Server component: queries `emails` table by `preview_token`
- Returns 404 if token not found or `preview_token_expires_at < NOW()`
- Renders newsletter HTML inside an `<iframe>` for CSS isolation

---

## Admin Panel Interaction

The existing `/api/admin/send` route allows manual send of any email by ID. Under the new flow:

- Manual send via admin panel is still allowed and bypasses `approval_status` — this is intentional for emergency use
- The admin panel email list should display `approval_status` as an additional column for visibility

---

## New Environment Variables

```
TELEGRAM_BOT_TOKEN     # Bot token from @BotFather
TELEGRAM_CHAT_ID       # Editor's personal Telegram chat ID (numeric)
INTERNAL_API_SECRET    # Reuse CRON_SECRET for internal /api/internal/regenerate auth
```

---

## Edge Cases

| Situation | Behavior |
|---|---|
| Pipeline fails on Sunday | Telegram error notification; editor can trigger manually via admin panel |
| Regeneration fails after feedback | Telegram error notification; `approval_status` stays `pending_feedback` |
| Editor sends unexpected message outside flow | Bot ignores silently (no reply) |
| Preview token expired | 404 page — new token generated only on regeneration or new draft creation |
| Monday cron runs but email already sent manually via admin | Cron checks `status = 'scheduled'`; if already `sent`, no-op |
| Approve button clicked multiple times | Idempotent — already `approved`/`sent` state is not reprocessed |
| No active subscribers at send time | Newsletter marked `sent` with 0 recipients; no error |
| New Sunday cron runs while previous draft unresolved | Previous record set to `status = 'skipped'`; new draft created fresh |
| Infinite feedback loop | No hard cap; each Sunday cron supersedes any unresolved draft automatically |

---

## Future Considerations

- Add a maximum retry count for feedback cycles (e.g., after 3 rejections, notify editor to use admin panel directly)
- Vercel background functions (if available on plan) as a cleaner alternative to fire-and-forget `fetch` for async regeneration
- Multi-editor support (currently single `TELEGRAM_CHAT_ID`; would require conversation state table)
