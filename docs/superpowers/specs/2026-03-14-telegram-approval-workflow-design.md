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
| Monday 09:00 BRT (12:00 UTC) | Cron checks for scheduled email and sends; if none, notifies editor via Telegram |
| Any time after notification | Editor can still approve/reject; if approved, sends immediately |

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
| _(draft created)_ | Cron generates newsletter | `pending_approval` | Telegram message sent with buttons |
| `pending_approval` | User clicks ✅ Aprovar | `approved`, email `status = 'scheduled'` | Bot confirms scheduling |
| `pending_approval` | User clicks ❌ Reprovar | `pending_feedback` | Bot asks for improvement notes |
| `pending_feedback` | User sends feedback text | `pending_approval` | Regenerate with feedback, send new Telegram message |
| `approved` / `scheduled` | Monday 09:00 cron | `sent`, email `status = 'sent'` | Newsletter sent to all active subscribers |
| No `scheduled` email at Monday 09:00 | Monday cron finds nothing to send | _(unchanged)_ | Telegram notification sent, approval flow re-opened |
| Notified, user clicks ✅ | Already past 09:00 | `sent` | Newsletter sent immediately |
| Notified, user clicks ❌ | Already past 09:00 | `pending_feedback` | Bot asks for feedback, regenerate, send immediately on next approval |

---

## Architecture

### Approach: Webhook-stateless with Supabase state

Telegram sends all events (button clicks, text messages) to a single webhook endpoint. State is persisted in the `emails` table. Each webhook invocation reads the current state from the DB and executes the appropriate transition.

### New Vercel Crons

```json
{ "path": "/api/cron/generate", "schedule": "0 23 * * 0" }
{ "path": "/api/cron/send",     "schedule": "0 12 * * 1" }
```

### New Files

```
app/api/telegram/webhook/route.ts     # Telegram webhook — state machine
app/api/cron/send/route.ts            # Monday send cron
app/preview/[token]/page.tsx          # Public preview page (no login)
lib/telegram.ts                       # sendMessage, sendDraftMessage helpers
supabase/migrations/XXXX_telegram_approval.sql
```

---

## Database Changes

### New columns on `emails` table

| Column | Type | Description |
|---|---|---|
| `approval_status` | TEXT | `pending_approval` \| `pending_feedback` \| `approved` \| `sent` |
| `approval_feedback` | TEXT | Editor's improvement notes (used in regeneration prompt) |
| `preview_token` | UUID | Secret token for the public preview URL |
| `preview_token_expires_at` | TIMESTAMPTZ | Expires 72h after generation |

### Regeneration behavior

When the editor rejects a draft and sends feedback, the system **overwrites the existing record** (does not create a new one). Fields updated: `content_html`, `subject`, `winning_model`, `evaluator_justification`, `approval_feedback`, `approval_status`, `preview_token`, `preview_token_expires_at`. The full history of all model attempts is preserved in the existing `model_outputs` JSONB field.

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
| ✅ Aprovar (after Monday 09:00) | "✅ Newsletter aprovada! Enviando agora..." |
| ❌ Reprovar | "Quais são as melhorias a serem feitas?" |
| Feedback text received | "Recebido! Gerando nova versão..." → sends new draft message when ready |
| Monday 09:00, no approval | "⚠️ Já são 9h de segunda e a newsletter ainda não foi aprovada. O que fazer?" + ✅/❌ buttons |
| Pipeline error | "⚠️ Erro ao gerar newsletter: [error message]" |
| Regeneration error | "⚠️ Erro ao regenerar newsletter: [error message]" — `approval_status` stays `pending_feedback` |

### Webhook security

- Telegram `setWebhook` is called with a `secret_token` header value
- `/api/telegram/webhook` validates the `X-Telegram-Bot-Api-Secret-Token` header — returns 401 if invalid
- Every incoming message's `chat.id` is checked against `TELEGRAM_CHAT_ID` — bot ignores all other chats

---

## Preview Page (`/preview/[token]`)

- Route: `app/preview/[token]/page.tsx`
- No authentication required — token is the only access control
- Validates `preview_token` against `emails` table
- Checks `preview_token_expires_at` (72h TTL)
- Renders newsletter HTML inside an `<iframe>` for isolation
- Returns a simple 404 page if token is invalid or expired

---

## New Environment Variables

```
TELEGRAM_BOT_TOKEN    # Bot token from @BotFather
TELEGRAM_CHAT_ID      # Editor's personal Telegram chat ID
```

---

## Edge Cases

| Situation | Behavior |
|---|---|
| Pipeline fails on Sunday | Telegram error notification; editor can trigger manually via admin panel |
| Regeneration fails after feedback | Telegram error notification; `approval_status` stays `pending_feedback` |
| Editor sends unexpected message outside flow | Bot ignores silently |
| Preview token expired | 404 page — new token only generated on new draft creation |
| Monday cron runs but email already sent manually via admin | Cron checks `status = 'scheduled'`; if already `sent`, no-op |
| Approve button clicked multiple times | Idempotent — already `approved` state is not reprocessed |
| No active subscribers at send time | Newsletter is marked `sent` with 0 recipients; no error |
