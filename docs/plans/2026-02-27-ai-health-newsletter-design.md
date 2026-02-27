# AI Health Newsletter — Design Document

**Data:** 2026-02-27
**Status:** Aprovado

---

## Visão Geral

Newsletter semanal sobre IA na saúde com foco em educação de mercado e geração de leads qualificados para a **WeKnow HealthTech** — empresa de Business Intelligence especializada em saúde que integra dados de sistemas hospitalares (Tasy, MV, Philips) em dashboards acionáveis.

**Objetivo principal:** converter assinantes em clientes da WeKnow HealthTech, educando gestores hospitalares sobre dados e IA antes de uma abordagem comercial consultiva.

**Objetivo secundário:** construir autoridade como referência em IA + gestão hospitalar no Paraná.

---

## Público-Alvo

- Gestores hospitalares
- Profissionais de TI atuando dentro de hospitais
- Diretores com poder de decisão em hospitais, clínicas e operadoras de saúde

---

## Arquitetura Geral

```
┌─────────────────────────────────────────────────────────┐
│                    SISTEMA AI HEALTH NEWSLETTER          │
├──────────────────┬──────────────────┬───────────────────┤
│   Landing Page   │   Admin Panel    │   Pipeline de IA  │
│   (Next.js)      │   (Next.js)      │                   │
│                  │                  │ • Perplexity API  │
│ • Hero + CTA     │ • Lista de leads │   busca notícias  │
│ • Formulário     │ • Lead scoring   │                   │
│ • Confirmação    │ • Editar/aprovar │ • OpenRouter      │
│                  │ • Analytics      │   3 modelos       │
│                  │                  │ • Gemini avalia   │
└────────┬─────────┴────────┬─────────┴────────┬──────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                    SUPABASE                             │
│  subscribers │ emails │ email_events │ (outputs salvos) │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
                    ┌──────────┐
                    │  RESEND  │
                    │  envio + │
                    │  webhooks│
                    └──────────┘
```

---

## Modelo de Dados

### `subscribers`
```sql
id            uuid primary key
email         text unique not null
name          text
role          text  -- Diretor / Gestor / TI / Outro
hospital      text
city          text
state         text
source        text  -- utm_source do anúncio
status        text  -- active / unsubscribed / bounced
lead_score    int default 0
created_at    timestamptz default now()
```

### `emails`
```sql
id            uuid primary key
subject       text
preview_text  text
content_html  text
content_json  jsonb  -- outputs dos 3 modelos + vencedor
status        text   -- draft / scheduled / sent
scheduled_at  timestamptz
sent_at       timestamptz
created_at    timestamptz default now()
```

### `email_events`
```sql
id              uuid primary key
subscriber_id   uuid references subscribers
email_id        uuid references emails
event_type      text  -- open / click / unsubscribe / bounce
url_clicked     text
created_at      timestamptz default now()
```

---

## Lead Scoring

| Evento | Pontos |
|---|---|
| Abertura de email | +2 |
| Clique em qualquer link | +5 |
| Clique em link com tag `cta-comercial` | +15 |
| Resposta ao email (reply) | +20 |
| 3 aberturas consecutivas (bônus) | +10 |

### Thresholds
- `0–20` — Frio (nutrindo)
- `21–50` — Morno (monitorar)
- `51+` — Quente 🔥 — notificação para abordagem comercial

---

## Pipeline de IA

### Fluxo de Geração de Conteúdo

```
1. BUSCA (Perplexity API)
   → Notícias sobre IA na saúde dos últimos 7 dias
   → Retorna 5–8 artigos com título, resumo e fonte

2. GERAÇÃO PARALELA (OpenRouter — Promise.all)
   → minimax/minimax-m2.5      → Output A
   → deepseek/deepseek-v3.2    → Output B
   → x-ai/grok-4.1-fast        → Output C

   Cada output contém:
   • Editorial de abertura (tom consultivo)
   • 3–5 notícias comentadas
   • Seção "O que isso significa para seu hospital"
   • CTA final tagueado como cta-comercial

3. AVALIAÇÃO (OpenRouter — google/gemini-3-flash-preview)
   Critérios:
   • Clareza e tom consultivo
   • Relevância para gestores hospitalares
   • Qualidade do CTA
   • Precisão das informações
   → Retorna: output vencedor + justificativa

4. ADMIN PANEL
   → Exibe rascunho vencedor + modelo que gerou + justificativa
   → Os 3 outputs ficam salvos no Supabase para auditoria
   → Você edita, aprova e agenda o envio
```

### Disparo do Pipeline
- **Manual:** botão "Gerar nova edição" no Admin Panel
- **Agendado:** Vercel Cron Job semanal gera rascunho automaticamente

### Resiliência
- Se um modelo falhar, pipeline continua com os 2 restantes e exibe aviso no Admin

---

## Landing Page

```
HERO
  Headline: "IA na Saúde — O que todo gestor hospitalar precisa saber antes de decidir"
  Sub: Newsletter semanal gratuita para líderes do setor
  CTA: [Quero receber gratuitamente]

FORMULÁRIO
  • Nome completo
  • Email corporativo
  • Cargo (Diretor / Gestor / TI / Outro)
  • Hospital / Instituição
  • Cidade / Estado

PROVA SOCIAL
  Sobre a newsletter, exemplos de edições anteriores
```

**Fluxo pós-cadastro:**
1. Lead salvo no Supabase com `utm_source` da URL
2. Resend envia email de confirmação (double opt-in)
3. Após confirmação → status `active`, lead_score = 0
4. Página de obrigado com expectativa do próximo envio

---

## Admin Panel

### 1. Dashboard de Leads
- Tabela ordenável por lead_score
- Filtros: score, cargo, hospital, cidade, data
- Leads com score 51+ destacados com botão "Iniciar abordagem"
- Clique no lead abre histórico completo de comportamento

### 2. Gestão de Edições
- Lista de edições por status (rascunho / agendada / enviada)
- Botão "Gerar nova edição" → dispara pipeline completo
- Editor com preview em tempo real
- Campos: assunto, preview text, data/hora de envio
- Botão "Aprovar e Agendar"

### 3. Analytics
- Taxa de abertura e clique por edição
- Evolução do lead_score agregado
- Origem dos leads por `utm_source`
- Crescimento da base ao longo do tempo

---

## Infraestrutura e Deploy

| Componente | Tecnologia | Onde |
|---|---|---|
| Landing Page + Admin | Next.js 15 (App Router) | Vercel |
| Banco de dados | Supabase (Postgres) | Supabase Cloud |
| Envio de email | Resend | Resend Cloud |
| Pipeline de IA | Server Actions / API Routes | Vercel Functions |
| Cron semanal | Vercel Cron Jobs | Vercel |

### Variáveis de Ambiente
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
RESEND_WEBHOOK_SECRET
OPENROUTER_API_KEY
PERPLEXITY_API_KEY
ADMIN_SECRET
```

### Entregabilidade
- SPF, DKIM e DMARC configurados no DNS do domínio
- Domínio dedicado no Resend
- Double opt-in obrigatório
- Unsubscribe com 1 clique

### Custos Estimados Iniciais
| Serviço | Custo |
|---|---|
| Vercel Hobby | R$ 0 |
| Supabase Free | R$ 0 |
| Resend Free (3k/mês) | R$ 0 |
| OpenRouter (por edição) | ~R$ 2–5 |
| Perplexity API (por busca) | ~R$ 0,50 |
| **Total estimado** | **< R$ 30/mês** |
