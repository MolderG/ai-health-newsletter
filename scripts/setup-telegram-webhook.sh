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
