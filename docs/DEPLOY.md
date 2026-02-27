# Deploy Guide

## 1. Push para GitHub

```bash
git remote add origin https://github.com/SEU_USUARIO/ai-health-newsletter.git
git push -u origin main
```

## 2. Importar no Vercel

1. Acesse https://vercel.com/new
2. Importe o repositório GitHub
3. Framework: Next.js (detectado automaticamente)

## 3. Variáveis de Ambiente no Vercel

Adicione todas as variáveis abaixo em Settings → Environment Variables:

| Variável | Onde obter |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `RESEND_API_KEY` | Resend → API Keys |
| `RESEND_FROM_EMAIL` | Ex: `newsletter@seudominio.com.br` |
| `RESEND_WEBHOOK_SECRET` | Resend → Webhooks (ao criar o webhook) |
| `OPENROUTER_API_KEY` | OpenRouter → Keys |
| `PERPLEXITY_API_KEY` | Perplexity → Settings → API |
| `ADMIN_SECRET` | Gere: `openssl rand -hex 32` |
| `CRON_SECRET` | Gere: `openssl rand -hex 32` |
| `NEXT_PUBLIC_BASE_URL` | Ex: `https://newsletter.seudominio.com.br` |

## 4. Configurar Resend para Entregabilidade

1. No Resend, vá em **Domains → Add Domain**
2. Adicione `seudominio.com.br`
3. Copie os registros DNS fornecidos (SPF, DKIM, DMARC)
4. Adicione no seu registrador de domínio
5. Aguarde verificação (até 48h)

Registros necessários no DNS:
- **SPF** (TXT record): `v=spf1 include:amazonses.com ~all`
- **DKIM** (CNAME records): fornecidos pelo Resend
- **DMARC** (TXT record): `v=DMARC1; p=none; rua=mailto:dmarc@seudominio.com.br`

## 5. Configurar Webhook do Resend

1. No Resend → Webhooks → Add Endpoint
2. URL: `https://newsletter.seudominio.com.br/api/webhooks/resend`
3. Eventos: `email.opened`, `email.clicked`, `email.unsubscribed`, `email.bounced`
4. Copie o **Signing Secret** e adicione como `RESEND_WEBHOOK_SECRET` no Vercel

## 6. Executar Migration do Supabase

No Supabase → SQL Editor, execute o conteúdo de:
`supabase/migrations/001_initial_schema.sql`

## 7. Verificar Deploy

- [ ] Landing page abre: `https://newsletter.seudominio.com.br`
- [ ] Formulário de inscrição funciona (email de confirmação chega)
- [ ] Admin acessível: `https://newsletter.seudominio.com.br/admin`
- [ ] "Gerar nova edição" funciona com APIs configuradas
- [ ] Vercel Cron aparece em Settings → Crons (roda segundas 8h UTC = 5h Brasília)
