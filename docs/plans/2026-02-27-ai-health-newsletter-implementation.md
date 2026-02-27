# AI Health Newsletter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-stack newsletter platform that captures leads from hospital managers, nurtures them with AI-generated content about IA na saúde, scores them by behavior, and signals when they're ready for a commercial approach.

**Architecture:** Next.js 15 App Router with TypeScript on Vercel, Supabase (Postgres) as the single source of truth, Resend for email delivery and behavior tracking via webhooks. AI pipeline uses Perplexity for news search, three OpenRouter models in parallel for content generation, and Gemini as evaluator.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Supabase, Resend, OpenRouter API, Perplexity API, Vitest for unit tests.

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json` (via scaffold)
- Create: `.env.local`
- Create: `.env.example`
- Create: `vitest.config.ts`

**Step 1: Scaffold Next.js 15 app**

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

**Step 2: Install additional dependencies**

```bash
npm install @supabase/supabase-js resend
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

**Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

**Step 4: Create `vitest.setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

**Step 5: Create `.env.example`**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
OPENROUTER_API_KEY=
PERPLEXITY_API_KEY=
ADMIN_SECRET=
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**Step 6: Copy to `.env.local` and fill in values**

```bash
cp .env.example .env.local
```

**Step 7: Add test script to `package.json`**

In `package.json` scripts, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 8: Verify app starts**

```bash
npm run dev
```
Expected: app running at http://localhost:3000

**Step 9: Commit**

```bash
git init
git add .
git commit -m "chore: initial Next.js 15 scaffold with Vitest"
```

---

## Task 2: Supabase Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `lib/supabase.ts`
- Create: `lib/supabase-server.ts`
- Test: `lib/__tests__/supabase.test.ts`

**Step 1: Create `supabase/migrations/001_initial_schema.sql`**

```sql
-- Subscribers: one row per lead captured
create table subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  role text,
  hospital text,
  city text,
  state text,
  source text,
  status text not null default 'pending', -- pending / active / unsubscribed / bounced
  lead_score int not null default 0,
  confirmation_token uuid default gen_random_uuid(),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Emails: one row per newsletter edition
create table emails (
  id uuid primary key default gen_random_uuid(),
  subject text,
  preview_text text,
  content_html text,
  model_outputs jsonb, -- stores all 3 model outputs + evaluator justification
  winning_model text,
  evaluator_justification text,
  status text not null default 'draft', -- draft / scheduled / sent
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- Email events: one row per open/click/unsubscribe/bounce
create table email_events (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references subscribers(id) on delete cascade,
  email_id uuid references emails(id) on delete cascade,
  event_type text not null, -- open / click / unsubscribe / bounce
  url_clicked text,
  created_at timestamptz not null default now()
);

-- Indexes for common queries
create index on subscribers(lead_score desc);
create index on subscribers(status);
create index on email_events(subscriber_id);
create index on email_events(email_id);
create index on email_events(event_type);
```

**Step 2: Run migration in Supabase dashboard**

Go to Supabase → SQL Editor → paste and run the migration.

**Step 3: Create `lib/supabase.ts` (client-side)**

```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**Step 4: Create `lib/supabase-server.ts` (server-side with service role)**

```typescript
import { createClient } from '@supabase/supabase-js'

export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

**Step 5: Write failing test for `lib/__tests__/supabase.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { supabase } from '../supabase'

describe('supabase client', () => {
  it('creates a client instance', () => {
    expect(supabase).toBeDefined()
    expect(typeof supabase.from).toBe('function')
  })
})
```

**Step 6: Run test to verify it fails**

```bash
npm test
```
Expected: FAIL — environment variables not set in test environment.

**Step 7: Fix by adding env vars to vitest config**

In `vitest.config.ts`, add:
```typescript
test: {
  environment: 'jsdom',
  setupFiles: ['./vitest.setup.ts'],
  globals: true,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
  },
},
```

**Step 8: Run test to verify it passes**

```bash
npm test
```
Expected: PASS

**Step 9: Commit**

```bash
git add .
git commit -m "feat: supabase schema and client setup"
```

---

## Task 3: Lead Scoring Service

**Files:**
- Create: `lib/lead-scoring.ts`
- Test: `lib/__tests__/lead-scoring.test.ts`

**Step 1: Write failing tests**

Create `lib/__tests__/lead-scoring.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calculateScoreDelta, getLeadTemperature } from '../lead-scoring'

describe('calculateScoreDelta', () => {
  it('returns 2 for open event', () => {
    expect(calculateScoreDelta('open', null)).toBe(2)
  })

  it('returns 5 for click on regular link', () => {
    expect(calculateScoreDelta('click', 'https://example.com/article')).toBe(5)
  })

  it('returns 15 for click on cta-comercial link', () => {
    expect(calculateScoreDelta('click', 'https://weknow.com/demo?ref=cta-comercial')).toBe(15)
  })

  it('returns 20 for reply event', () => {
    expect(calculateScoreDelta('reply', null)).toBe(20)
  })

  it('returns 0 for bounce', () => {
    expect(calculateScoreDelta('bounce', null)).toBe(0)
  })
})

describe('getLeadTemperature', () => {
  it('returns cold for score 0-20', () => {
    expect(getLeadTemperature(0)).toBe('cold')
    expect(getLeadTemperature(20)).toBe('cold')
  })

  it('returns warm for score 21-50', () => {
    expect(getLeadTemperature(21)).toBe('warm')
    expect(getLeadTemperature(50)).toBe('warm')
  })

  it('returns hot for score 51+', () => {
    expect(getLeadTemperature(51)).toBe('hot')
    expect(getLeadTemperature(200)).toBe('hot')
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm test
```
Expected: FAIL — module not found

**Step 3: Create `lib/lead-scoring.ts`**

```typescript
const CTA_COMMERCIAL_TAG = 'cta-comercial'

export function calculateScoreDelta(eventType: string, urlClicked: string | null): number {
  if (eventType === 'open') return 2
  if (eventType === 'reply') return 20
  if (eventType === 'click') {
    if (urlClicked?.includes(CTA_COMMERCIAL_TAG)) return 15
    return 5
  }
  return 0
}

export type LeadTemperature = 'cold' | 'warm' | 'hot'

export function getLeadTemperature(score: number): LeadTemperature {
  if (score <= 20) return 'cold'
  if (score <= 50) return 'warm'
  return 'hot'
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test
```
Expected: PASS (7 tests)

**Step 5: Commit**

```bash
git add .
git commit -m "feat: lead scoring logic with tests"
```

---

## Task 4: Admin Authentication Middleware

**Files:**
- Create: `middleware.ts`
- Create: `app/admin/login/page.tsx`
- Create: `app/api/admin/login/route.ts`
- Create: `app/api/admin/logout/route.ts`

**Step 1: Create `middleware.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/admin')) return NextResponse.next()
  if (pathname === '/admin/login') return NextResponse.next()

  const adminToken = request.cookies.get('admin_token')?.value
  if (adminToken !== process.env.ADMIN_SECRET) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

**Step 2: Create `app/api/admin/login/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  if (password !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('admin_token', process.env.ADMIN_SECRET!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
  return response
}
```

**Step 3: Create `app/api/admin/logout/route.ts`**

```typescript
import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('admin_token')
  return response
}
```

**Step 4: Create `app/admin/login/page.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/admin')
    } else {
      setError('Senha incorreta')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow w-80 space-y-4">
        <h1 className="text-xl font-semibold">Admin</h1>
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" className="w-full bg-blue-600 text-white rounded px-3 py-2">
          Entrar
        </button>
      </form>
    </div>
  )
}
```

**Step 5: Test login manually**

```bash
npm run dev
```
Visit http://localhost:3000/admin → should redirect to /admin/login.
Enter ADMIN_SECRET value → should redirect to /admin (404 for now, that's fine).

**Step 6: Commit**

```bash
git add .
git commit -m "feat: admin authentication with cookie middleware"
```

---

## Task 5: Subscribe API + Double Opt-In

**Files:**
- Create: `app/api/subscribe/route.ts`
- Create: `app/api/confirm/route.ts`
- Create: `lib/email-templates.ts`
- Test: `app/api/__tests__/subscribe.test.ts`

**Step 1: Create `lib/email-templates.ts`**

```typescript
export function confirmationEmail(name: string, confirmUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2>Confirme seu cadastro</h2>
      <p>Olá, ${name}!</p>
      <p>Clique no botão abaixo para confirmar sua assinatura da <strong>AI Health Newsletter</strong>.</p>
      <a href="${confirmUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0;">
        Confirmar assinatura
      </a>
      <p style="color:#666;font-size:14px;">Se você não se cadastrou, ignore este email.</p>
    </div>
  `
}
```

**Step 2: Write failing test for `app/api/__tests__/subscribe.test.ts`**

```typescript
import { describe, it, expect, vi } from 'vitest'

// Mock supabase and resend before importing route
vi.mock('@/lib/supabase-server', () => ({
  createServerClient: () => ({
    from: () => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
}))

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn().mockResolvedValue({ data: { id: 'test' }, error: null }) },
  })),
}))

describe('POST /api/subscribe', () => {
  it('rejects missing email', async () => {
    const { POST } = await import('../subscribe/route')
    const request = new Request('http://localhost/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(400)
  })
})
```

**Step 3: Run test to verify it fails**

```bash
npm test
```
Expected: FAIL — module not found

**Step 4: Create `app/api/subscribe/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerClient } from '@/lib/supabase-server'
import { confirmationEmail } from '@/lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, email, role, hospital, city, state } = body

  if (!email || !name) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  const source = request.nextUrl.searchParams.get('utm_source') ?? 'direct'
  const supabase = createServerClient()

  // Check if already subscribed
  const { data: existing } = await supabase
    .from('subscribers')
    .select('id, status')
    .eq('email', email)
    .single()

  if (existing?.status === 'active') {
    return NextResponse.json({ error: 'Already subscribed' }, { status: 409 })
  }

  // Insert or get existing pending subscriber
  let subscriberId: string
  let confirmationToken: string

  if (existing) {
    subscriberId = existing.id
    const { data } = await supabase
      .from('subscribers')
      .select('confirmation_token')
      .eq('id', existing.id)
      .single()
    confirmationToken = data?.confirmation_token
  } else {
    const { data, error } = await supabase
      .from('subscribers')
      .insert({ name, email, role, hospital, city, state, source })
      .select('id, confirmation_token')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to save subscriber' }, { status: 500 })
    }
    subscriberId = data.id
    confirmationToken = data.confirmation_token
  }

  const confirmUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/confirm?token=${confirmationToken}`

  const { error: emailError } = await resend.emails.send({
    from: 'AI Health Newsletter <newsletter@seudominio.com.br>',
    to: email,
    subject: 'Confirme sua assinatura — AI Health Newsletter',
    html: confirmationEmail(name, confirmUrl),
  })

  if (emailError) {
    return NextResponse.json({ error: 'Failed to send confirmation email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

**Step 5: Create `app/api/confirm/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/?confirmed=error', request.url))
  }

  const supabase = createServerClient()
  const { error } = await supabase
    .from('subscribers')
    .update({ status: 'active', confirmed_at: new Date().toISOString() })
    .eq('confirmation_token', token)
    .eq('status', 'pending')

  if (error) {
    return NextResponse.redirect(new URL('/?confirmed=error', request.url))
  }

  return NextResponse.redirect(new URL('/?confirmed=true', request.url))
}
```

**Step 6: Run tests to verify they pass**

```bash
npm test
```
Expected: PASS

**Step 7: Commit**

```bash
git add .
git commit -m "feat: subscribe API with double opt-in confirmation"
```

---

## Task 6: Resend Webhook Handler

**Files:**
- Create: `app/api/webhooks/resend/route.ts`
- Test: `app/api/__tests__/webhook.test.ts`

**Step 1: Write failing test**

Create `app/api/__tests__/webhook.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase-server', () => ({
  createServerClient: () => ({
    from: (table: string) => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'sub-1', lead_score: 10 }, error: null }),
      update: vi.fn().mockReturnThis(),
    }),
  }),
}))

vi.mock('@/lib/lead-scoring', () => ({
  calculateScoreDelta: vi.fn().mockReturnValue(2),
}))

describe('POST /api/webhooks/resend', () => {
  it('returns 400 if no event type', async () => {
    const { POST } = await import('../webhooks/resend/route')
    const request = new Request('http://localhost/api/webhooks/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const response = await POST(request as any)
    expect(response.status).toBe(400)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test
```
Expected: FAIL

**Step 3: Create `app/api/webhooks/resend/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { calculateScoreDelta } from '@/lib/lead-scoring'

export async function POST(request: NextRequest) {
  const payload = await request.json()
  const { type, data } = payload

  if (!type) {
    return NextResponse.json({ error: 'Missing event type' }, { status: 400 })
  }

  const supabase = createServerClient()
  const email = data?.email_to?.[0] ?? data?.to?.[0]
  if (!email) return NextResponse.json({ ok: true })

  // Find subscriber
  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('id, lead_score')
    .eq('email', email)
    .single()

  if (!subscriber) return NextResponse.json({ ok: true })

  const eventType = type.replace('email.', '') // e.g. "email.opened" → "opened" → normalize
  const normalizedEvent = eventType === 'opened' ? 'open' : eventType === 'clicked' ? 'click' : eventType
  const urlClicked = data?.click?.link ?? null

  // Save event
  await supabase.from('email_events').insert({
    subscriber_id: subscriber.id,
    event_type: normalizedEvent,
    url_clicked: urlClicked,
  })

  // Update lead score
  const delta = calculateScoreDelta(normalizedEvent, urlClicked)
  if (delta > 0) {
    await supabase
      .from('subscribers')
      .update({ lead_score: subscriber.lead_score + delta })
      .eq('id', subscriber.id)
  }

  // Handle unsubscribe
  if (normalizedEvent === 'unsubscribed') {
    await supabase
      .from('subscribers')
      .update({ status: 'unsubscribed' })
      .eq('id', subscriber.id)
  }

  return NextResponse.json({ ok: true })
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test
```
Expected: PASS

**Step 5: Commit**

```bash
git add .
git commit -m "feat: resend webhook handler with lead scoring"
```

---

## Task 7: Landing Page UI

**Files:**
- Modify: `app/page.tsx`
- Create: `components/SubscribeForm.tsx`
- Create: `app/obrigado/page.tsx`

**Step 1: Create `components/SubscribeForm.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ROLES = ['Diretor', 'Gestor Hospitalar', 'TI / Tecnologia', 'Outro']

export default function SubscribeForm() {
  const [form, setForm] = useState({ name: '', email: '', role: '', hospital: '', city: '', state: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const params = new URLSearchParams(window.location.search)
    const utm = params.get('utm_source') ?? 'direct'

    const res = await fetch(`/api/subscribe?utm_source=${utm}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      router.push('/obrigado')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Erro ao realizar cadastro. Tente novamente.')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
      <input name="name" placeholder="Nome completo" required value={form.name} onChange={handleChange}
        className="w-full border rounded-lg px-4 py-3 text-sm" />
      <input name="email" type="email" placeholder="Email corporativo" required value={form.email} onChange={handleChange}
        className="w-full border rounded-lg px-4 py-3 text-sm" />
      <select name="role" required value={form.role} onChange={handleChange}
        className="w-full border rounded-lg px-4 py-3 text-sm bg-white">
        <option value="">Cargo</option>
        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
      <input name="hospital" placeholder="Hospital / Instituição" required value={form.hospital} onChange={handleChange}
        className="w-full border rounded-lg px-4 py-3 text-sm" />
      <div className="flex gap-2">
        <input name="city" placeholder="Cidade" required value={form.city} onChange={handleChange}
          className="flex-1 border rounded-lg px-4 py-3 text-sm" />
        <input name="state" placeholder="Estado" required value={form.state} onChange={handleChange}
          className="w-20 border rounded-lg px-4 py-3 text-sm" maxLength={2} />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg px-4 py-3 transition disabled:opacity-60">
        {loading ? 'Enviando...' : 'Quero receber gratuitamente'}
      </button>
      <p className="text-xs text-gray-400 text-center">Sem spam. Cancele quando quiser.</p>
    </form>
  )
}
```

**Step 2: Update `app/page.tsx`**

```typescript
import SubscribeForm from '@/components/SubscribeForm'

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-900 to-blue-700 text-white py-20 px-6">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="inline-block bg-blue-500/30 text-blue-100 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
            Newsletter Gratuita
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            IA na Saúde — O que todo gestor hospitalar precisa saber antes de decidir
          </h1>
          <p className="text-blue-100 text-lg">
            Toda semana: as principais novidades sobre Inteligência Artificial e dados na saúde,
            com análise prática para líderes do setor hospitalar.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-md mx-auto text-center space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Receba gratuitamente</h2>
            <p className="text-gray-500 mt-2">Para gestores, diretores e profissionais de TI hospitalar</p>
          </div>
          <SubscribeForm />
        </div>
      </section>

      {/* Value props */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto grid md:grid-cols-3 gap-8 text-center">
          {[
            { icon: '🧠', title: 'Curadoria inteligente', desc: 'Conteúdo filtrado por IA e revisado por especialista' },
            { icon: '📊', title: 'Foco em gestão', desc: 'Análises práticas para decisões em ambiente hospitalar' },
            { icon: '📬', title: 'Semanal', desc: 'Toda semana na sua caixa de entrada, sem ruído' },
          ].map(item => (
            <div key={item.title} className="space-y-3">
              <div className="text-4xl">{item.icon}</div>
              <h3 className="font-semibold text-gray-900">{item.title}</h3>
              <p className="text-gray-500 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
```

**Step 3: Create `app/obrigado/page.tsx`**

```typescript
export default function Obrigado() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md text-center space-y-4">
        <div className="text-5xl">📬</div>
        <h1 className="text-2xl font-bold text-gray-900">Verifique seu email</h1>
        <p className="text-gray-500">
          Enviamos um link de confirmação para o seu email.
          Clique no link para ativar sua assinatura.
        </p>
        <p className="text-sm text-gray-400">
          Não encontrou? Verifique a caixa de spam.
        </p>
      </div>
    </main>
  )
}
```

**Step 4: Test visually**

```bash
npm run dev
```
Visit http://localhost:3000 — verify hero, form and value props render correctly.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: landing page with subscribe form and thank you page"
```

---

## Task 8: AI Pipeline — Perplexity Search

**Files:**
- Create: `lib/ai/perplexity.ts`
- Test: `lib/ai/__tests__/perplexity.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect, vi } from 'vitest'

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    choices: [{
      message: {
        content: 'Article 1: AI improves diagnostics\nArticle 2: Hospital uses ML for scheduling',
      },
    }],
  }),
})

describe('searchHealthAINews', () => {
  it('returns a non-empty string with news', async () => {
    const { searchHealthAINews } = await import('../perplexity')
    const result = await searchHealthAINews()
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test
```
Expected: FAIL

**Step 3: Create `lib/ai/perplexity.ts`**

```typescript
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions'

export async function searchHealthAINews(): Promise<string> {
  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        {
          role: 'system',
          content: 'Você é um pesquisador especializado em saúde digital e IA hospitalar. Responda sempre em português.',
        },
        {
          role: 'user',
          content: `Quais são as principais notícias e avanços sobre Inteligência Artificial na saúde nos últimos 7 dias?
          Foque em: gestão hospitalar, BI hospitalar, integração de dados clínicos, automação em hospitais, IA em diagnósticos.
          Liste 5 a 8 itens com: título, resumo de 2-3 frases e fonte.`,
        },
      ],
    }),
  })

  if (!response.ok) throw new Error(`Perplexity API error: ${response.status}`)

  const data = await response.json()
  return data.choices[0].message.content as string
}
```

**Step 4: Run test to verify it passes**

```bash
npm test
```
Expected: PASS

**Step 5: Commit**

```bash
git add .
git commit -m "feat: perplexity news search service"
```

---

## Task 9: AI Pipeline — Parallel Generation + Evaluation

**Files:**
- Create: `lib/ai/openrouter.ts`
- Create: `lib/ai/pipeline.ts`
- Test: `lib/ai/__tests__/pipeline.test.ts`

**Step 1: Create `lib/ai/openrouter.ts`**

```typescript
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export async function generateWithModel(model: string, prompt: string): Promise<string> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) throw new Error(`OpenRouter error for ${model}: ${response.status}`)

  const data = await response.json()
  return data.choices[0].message.content as string
}
```

**Step 2: Write failing test for pipeline**

Create `lib/ai/__tests__/pipeline.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('../openrouter', () => ({
  generateWithModel: vi.fn()
    .mockResolvedValueOnce('Output A from minimax')
    .mockResolvedValueOnce('Output B from deepseek')
    .mockResolvedValueOnce('Output C from grok')
    .mockResolvedValueOnce(JSON.stringify({
      winner: 'A',
      justification: 'Melhor tom consultivo',
      content: 'Output A from minimax',
    })),
}))

describe('generateNewsletter', () => {
  it('returns winning content and stores all outputs', async () => {
    const { generateNewsletter } = await import('../pipeline')
    const result = await generateNewsletter('test news content')

    expect(result.winningContent).toBeDefined()
    expect(result.winningModel).toBeDefined()
    expect(result.justification).toBeDefined()
    expect(result.allOutputs).toHaveLength(3)
  })
})
```

**Step 3: Run test to verify it fails**

```bash
npm test
```
Expected: FAIL

**Step 4: Create `lib/ai/pipeline.ts`**

```typescript
import { generateWithModel } from './openrouter'

const GENERATION_MODELS = [
  'minimax/minimax-m2.5',
  'deepseek/deepseek-v3.2',
  'x-ai/grok-4.1-fast',
] as const

const EVALUATOR_MODEL = 'google/gemini-3-flash-preview'

function buildGenerationPrompt(news: string): string {
  return `Você é um especialista em gestão hospitalar e IA na saúde, escrevendo para diretores e gestores de hospitais brasileiros.

Com base nas notícias abaixo, escreva uma edição completa de newsletter semanal em HTML com:
1. Editorial de abertura: 2-3 parágrafos com perspectiva consultiva
2. 3 a 5 notícias comentadas: título + resumo + "O que isso significa para seu hospital"
3. CTA final sutil: convide o leitor a refletir sobre como dados integrados podem ajudar — inclua o texto "saiba mais" com href="https://weknow.com.br?ref=cta-comercial"

Tom: consultivo, direto, sem jargão técnico excessivo. Foco em impacto prático na gestão.

NOTÍCIAS:
${news}

Responda APENAS com o HTML da newsletter, sem explicações.`
}

function buildEvaluatorPrompt(outputs: { model: string; content: string }[]): string {
  return `Você é um especialista em comunicação para o setor de saúde. Avalie os 3 rascunhos de newsletter abaixo e escolha o melhor.

Critérios:
- Clareza e tom consultivo adequado para gestores hospitalares
- Relevância prática do conteúdo
- Qualidade e naturalidade do CTA
- Precisão e coerência das informações

${outputs.map((o, i) => `=== RASCUNHO ${String.fromCharCode(65 + i)} (${o.model}) ===\n${o.content}`).join('\n\n')}

Responda APENAS com JSON no formato:
{
  "winner": "A" | "B" | "C",
  "justification": "motivo em 2-3 frases",
  "content": "[copie aqui o HTML do rascunho vencedor exatamente como está]"
}`
}

export interface PipelineResult {
  winningContent: string
  winningModel: string
  justification: string
  allOutputs: { model: string; content: string }[]
}

export async function generateNewsletter(news: string): Promise<PipelineResult> {
  const prompt = buildGenerationPrompt(news)

  // Run 3 models in parallel — if one fails, continue with the rest
  const results = await Promise.allSettled(
    GENERATION_MODELS.map(model => generateWithModel(model, prompt))
  )

  const allOutputs = results
    .map((result, i) => ({
      model: GENERATION_MODELS[i],
      content: result.status === 'fulfilled' ? result.value : null,
    }))
    .filter(o => o.content !== null) as { model: string; content: string }[]

  if (allOutputs.length === 0) throw new Error('All generation models failed')

  // Evaluate with Gemini
  const evaluatorPrompt = buildEvaluatorPrompt(allOutputs)
  const evaluationRaw = await generateWithModel(EVALUATOR_MODEL, evaluatorPrompt)

  let evaluation: { winner: string; justification: string; content: string }
  try {
    const jsonMatch = evaluationRaw.match(/\{[\s\S]*\}/)
    evaluation = JSON.parse(jsonMatch?.[0] ?? evaluationRaw)
  } catch {
    // Fallback: use first output if parsing fails
    evaluation = { winner: 'A', justification: 'Avaliação automática falhou', content: allOutputs[0].content }
  }

  const winnerIndex = evaluation.winner.charCodeAt(0) - 65
  const winningModel = allOutputs[winnerIndex]?.model ?? allOutputs[0].model

  return {
    winningContent: evaluation.content,
    winningModel,
    justification: evaluation.justification,
    allOutputs,
  }
}
```

**Step 5: Run tests to verify they pass**

```bash
npm test
```
Expected: PASS

**Step 6: Commit**

```bash
git add .
git commit -m "feat: AI pipeline with parallel generation and Gemini evaluation"
```

---

## Task 10: Generate Edition API

**Files:**
- Create: `app/api/admin/generate/route.ts`

**Step 1: Create `app/api/admin/generate/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { searchHealthAINews } from '@/lib/ai/perplexity'
import { generateNewsletter } from '@/lib/ai/pipeline'

export async function POST(request: NextRequest) {
  const adminToken = request.cookies.get('admin_token')?.value
  if (adminToken !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Search for news
    const news = await searchHealthAINews()

    // 2. Generate with 3 models + evaluate
    const result = await generateNewsletter(news)

    // 3. Save draft to Supabase
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('emails')
      .insert({
        content_html: result.winningContent,
        winning_model: result.winningModel,
        evaluator_justification: result.justification,
        model_outputs: result.allOutputs,
        status: 'draft',
      })
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({ id: data.id, justification: result.justification, winningModel: result.winningModel })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

**Step 2: Test manually via curl**

```bash
# First login to get cookie, then:
curl -X POST http://localhost:3000/api/admin/generate \
  -H "Cookie: admin_token=YOUR_ADMIN_SECRET"
```
Expected: JSON with `id`, `justification`, `winningModel`

**Step 3: Commit**

```bash
git add .
git commit -m "feat: generate edition API endpoint"
```

---

## Task 11: Send Newsletter API

**Files:**
- Create: `app/api/admin/send/route.ts`
- Create: `lib/newsletter-sender.ts`

**Step 1: Create `lib/newsletter-sender.ts`**

```typescript
import { Resend } from 'resend'
import { createServerClient } from './supabase-server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendNewsletter(emailId: string): Promise<{ sent: number; errors: number }> {
  const supabase = createServerClient()

  // Get the email
  const { data: email } = await supabase
    .from('emails')
    .select('*')
    .eq('id', emailId)
    .single()

  if (!email) throw new Error('Email not found')
  if (!email.subject) throw new Error('Email has no subject')

  // Get all active subscribers
  const { data: subscribers } = await supabase
    .from('subscribers')
    .select('id, email, name')
    .eq('status', 'active')

  if (!subscribers?.length) return { sent: 0, errors: 0 }

  let sent = 0
  let errors = 0

  // Send in batches of 50 (Resend rate limit)
  for (let i = 0; i < subscribers.length; i += 50) {
    const batch = subscribers.slice(i, i + 50)
    const results = await Promise.allSettled(
      batch.map(sub =>
        resend.emails.send({
          from: 'AI Health Newsletter <newsletter@seudominio.com.br>',
          to: sub.email,
          subject: email.subject,
          html: email.content_html,
          headers: {
            'List-Unsubscribe': `<${process.env.NEXT_PUBLIC_BASE_URL}/api/unsubscribe?email=${sub.email}>`,
          },
        })
      )
    )
    sent += results.filter(r => r.status === 'fulfilled').length
    errors += results.filter(r => r.status === 'rejected').length
  }

  // Mark as sent
  await supabase
    .from('emails')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', emailId)

  return { sent, errors }
}
```

**Step 2: Create `app/api/admin/send/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { sendNewsletter } from '@/lib/newsletter-sender'

export async function POST(request: NextRequest) {
  const adminToken = request.cookies.get('admin_token')?.value
  if (adminToken !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { emailId } = await request.json()
  if (!emailId) return NextResponse.json({ error: 'Missing emailId' }, { status: 400 })

  try {
    const result = await sendNewsletter(emailId)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: newsletter send API with batch sending"
```

---

## Task 12: Admin Panel — Leads Dashboard

**Files:**
- Create: `app/admin/page.tsx`
- Create: `app/admin/layout.tsx`
- Create: `app/api/admin/subscribers/route.ts`

**Step 1: Create `app/api/admin/subscribers/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const adminToken = request.cookies.get('admin_token')?.value
  if (adminToken !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('subscribers')
    .select('*')
    .order('lead_score', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

**Step 2: Create `app/admin/layout.tsx`**

```typescript
import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center gap-6">
        <span className="font-semibold text-gray-900">Admin</span>
        <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900">Leads</Link>
        <Link href="/admin/editions" className="text-sm text-gray-600 hover:text-gray-900">Edições</Link>
        <Link href="/admin/analytics" className="text-sm text-gray-600 hover:text-gray-900">Analytics</Link>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}
```

**Step 3: Create `app/admin/page.tsx`**

```typescript
'use client'
import { useEffect, useState } from 'react'
import { getLeadTemperature } from '@/lib/lead-scoring'

type Subscriber = {
  id: string; name: string; email: string; role: string
  hospital: string; city: string; state: string
  lead_score: number; status: string; created_at: string
}

const TEMP_COLORS = { cold: 'text-blue-500', warm: 'text-yellow-500', hot: 'text-red-500' }
const TEMP_LABELS = { cold: '❄️ Frio', warm: '🌡️ Morno', hot: '🔥 Quente' }

export default function AdminLeads() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetch('/api/admin/subscribers').then(r => r.json()).then(setSubscribers)
  }, [])

  const filtered = subscribers.filter(s =>
    s.name?.toLowerCase().includes(filter.toLowerCase()) ||
    s.hospital?.toLowerCase().includes(filter.toLowerCase()) ||
    s.email?.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Leads ({subscribers.length})</h1>
        <input
          placeholder="Buscar por nome, email ou hospital..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-72"
        />
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              {['Nome', 'Hospital', 'Cargo', 'Cidade', 'Score', 'Status', 'Cadastro'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(s => {
              const temp = getLeadTemperature(s.lead_score)
              return (
                <tr key={s.id} className={temp === 'hot' ? 'bg-red-50' : ''}>
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.hospital}</td>
                  <td className="px-4 py-3 text-gray-600">{s.role}</td>
                  <td className="px-4 py-3 text-gray-600">{s.city}/{s.state}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${TEMP_COLORS[temp]}`}>
                      {s.lead_score} {TEMP_LABELS[temp]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.status}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(s.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: admin leads dashboard with lead temperature indicators"
```

---

## Task 13: Admin Panel — Newsletter Editor

**Files:**
- Create: `app/admin/editions/page.tsx`
- Create: `app/admin/editions/[id]/page.tsx`
- Create: `app/api/admin/emails/route.ts`
- Create: `app/api/admin/emails/[id]/route.ts`

**Step 1: Create `app/api/admin/emails/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const adminToken = request.cookies.get('admin_token')?.value
  if (adminToken !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { data } = await supabase
    .from('emails')
    .select('id, subject, status, winning_model, created_at, sent_at, scheduled_at')
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}
```

**Step 2: Create `app/api/admin/emails/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const adminToken = request.cookies.get('admin_token')?.value
  if (adminToken !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { data } = await supabase.from('emails').select('*').eq('id', params.id).single()
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const adminToken = request.cookies.get('admin_token')?.value
  if (adminToken !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const body = await request.json()
  const { data, error } = await supabase
    .from('emails')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

**Step 3: Create `app/admin/editions/page.tsx`**

```typescript
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Email = { id: string; subject: string; status: string; winning_model: string; created_at: string }

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-700',
  scheduled: 'bg-blue-100 text-blue-700',
  sent: 'bg-green-100 text-green-700',
}

export default function AdminEditions() {
  const [emails, setEmails] = useState<Email[]>([])
  const [generating, setGenerating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/admin/emails').then(r => r.json()).then(setEmails)
  }, [])

  async function handleGenerate() {
    setGenerating(true)
    const res = await fetch('/api/admin/generate', { method: 'POST' })
    const data = await res.json()
    if (data.id) router.push(`/admin/editions/${data.id}`)
    else alert('Erro ao gerar: ' + data.error)
    setGenerating(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edições</h1>
        <button onClick={handleGenerate} disabled={generating}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60">
          {generating ? 'Gerando com IA...' : '+ Gerar nova edição'}
        </button>
      </div>

      <div className="bg-white rounded-lg border divide-y">
        {emails.map(e => (
          <Link key={e.id} href={`/admin/editions/${e.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
            <div>
              <p className="font-medium text-sm">{e.subject ?? '(sem assunto)'}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Modelo: {e.winning_model} · {new Date(e.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[e.status] ?? ''}`}>
              {e.status}
            </span>
          </Link>
        ))}
        {emails.length === 0 && (
          <p className="px-4 py-8 text-center text-gray-400 text-sm">Nenhuma edição ainda. Gere a primeira!</p>
        )}
      </div>
    </div>
  )
}
```

**Step 4: Create `app/admin/editions/[id]/page.tsx`**

```typescript
'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Email = {
  id: string; subject: string; preview_text: string
  content_html: string; winning_model: string
  evaluator_justification: string; status: string
}

export default function EditEdition() {
  const { id } = useParams()
  const router = useRouter()
  const [email, setEmail] = useState<Email | null>(null)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/emails/${id}`).then(r => r.json()).then(setEmail)
  }, [id])

  async function save(updates: Partial<Email>) {
    setSaving(true)
    const res = await fetch(`/api/admin/emails/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const updated = await res.json()
    setEmail(updated)
    setSaving(false)
  }

  async function handleSend() {
    if (!confirm(`Enviar para todos os assinantes ativos?`)) return
    setSending(true)
    const res = await fetch('/api/admin/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailId: id }),
    })
    const data = await res.json()
    alert(`Enviado: ${data.sent} | Erros: ${data.errors}`)
    router.push('/admin/editions')
    setSending(false)
  }

  if (!email) return <div className="p-6 text-gray-400">Carregando...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Editar edição</h1>
        <div className="flex gap-2">
          <button onClick={() => setPreview(!preview)}
            className="border px-4 py-2 rounded-lg text-sm">
            {preview ? 'Editar' : 'Preview'}
          </button>
          <button onClick={handleSend} disabled={sending || email.status === 'sent'}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60">
            {sending ? 'Enviando...' : email.status === 'sent' ? 'Já enviado' : 'Aprovar e Enviar'}
          </button>
        </div>
      </div>

      {email.evaluator_justification && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <p className="font-medium text-blue-800">Modelo vencedor: {email.winning_model}</p>
          <p className="text-blue-600 mt-1">{email.evaluator_justification}</p>
        </div>
      )}

      <div className="space-y-3">
        <input
          placeholder="Assunto do email"
          value={email.subject ?? ''}
          onChange={e => setEmail(prev => prev ? { ...prev, subject: e.target.value } : prev)}
          onBlur={() => save({ subject: email.subject })}
          className="w-full border rounded-lg px-4 py-3 text-sm"
        />
        <input
          placeholder="Preview text (aparece após o assunto no inbox)"
          value={email.preview_text ?? ''}
          onChange={e => setEmail(prev => prev ? { ...prev, preview_text: e.target.value } : prev)}
          onBlur={() => save({ preview_text: email.preview_text })}
          className="w-full border rounded-lg px-4 py-3 text-sm"
        />
      </div>

      {preview ? (
        <div className="border rounded-lg p-6 bg-white" dangerouslySetInnerHTML={{ __html: email.content_html }} />
      ) : (
        <textarea
          value={email.content_html ?? ''}
          onChange={e => setEmail(prev => prev ? { ...prev, content_html: e.target.value } : prev)}
          onBlur={() => save({ content_html: email.content_html })}
          className="w-full border rounded-lg px-4 py-3 text-sm font-mono h-96"
        />
      )}

      {saving && <p className="text-xs text-gray-400">Salvando...</p>}
    </div>
  )
}
```

**Step 5: Commit**

```bash
git add .
git commit -m "feat: admin newsletter editor with generate, preview and send"
```

---

## Task 14: Vercel Cron Job

**Files:**
- Create: `app/api/cron/generate/route.ts`
- Create: `vercel.json`

**Step 1: Create `app/api/cron/generate/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { searchHealthAINews } from '@/lib/ai/perplexity'
import { generateNewsletter } from '@/lib/ai/pipeline'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  // Vercel Cron authenticates with CRON_SECRET header
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const news = await searchHealthAINews()
    const result = await generateNewsletter(news)

    const supabase = createServerClient()
    await supabase.from('emails').insert({
      content_html: result.winningContent,
      winning_model: result.winningModel,
      evaluator_justification: result.justification,
      model_outputs: result.allOutputs,
      status: 'draft',
    })

    return NextResponse.json({ ok: true, winningModel: result.winningModel })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

**Step 2: Add `CRON_SECRET` to `.env.example`**

```
CRON_SECRET=your-random-secret-here
```

**Step 3: Create `vercel.json`**

```json
{
  "crons": [
    {
      "path": "/api/cron/generate",
      "schedule": "0 8 * * 1"
    }
  ]
}
```

This runs every Monday at 8:00 AM UTC (5:00 AM Brasília).

**Step 4: Commit**

```bash
git add .
git commit -m "feat: weekly cron job for auto newsletter generation"
```

---

## Task 15: Analytics Dashboard

**Files:**
- Create: `app/admin/analytics/page.tsx`
- Create: `app/api/admin/analytics/route.ts`

**Step 1: Create `app/api/admin/analytics/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const adminToken = request.cookies.get('admin_token')?.value
  if (adminToken !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  const [subscribersRes, emailsRes, eventsRes] = await Promise.all([
    supabase.from('subscribers').select('id, status, source, lead_score, created_at'),
    supabase.from('emails').select('id, subject, sent_at, status'),
    supabase.from('email_events').select('email_id, event_type'),
  ])

  const subscribers = subscribersRes.data ?? []
  const emails = emailsRes.data ?? []
  const events = eventsRes.data ?? []

  const totalActive = subscribers.filter(s => s.status === 'active').length
  const hotLeads = subscribers.filter(s => s.lead_score >= 51).length

  // Open and click rates per email
  const emailStats = emails.filter(e => e.status === 'sent').map(email => {
    const emailEvents = events.filter(e => e.email_id === email.id)
    const opens = emailEvents.filter(e => e.event_type === 'open').length
    const clicks = emailEvents.filter(e => e.event_type === 'click').length
    return {
      id: email.id,
      subject: email.subject,
      sent_at: email.sent_at,
      opens,
      clicks,
      openRate: totalActive > 0 ? ((opens / totalActive) * 100).toFixed(1) : '0',
      clickRate: totalActive > 0 ? ((clicks / totalActive) * 100).toFixed(1) : '0',
    }
  })

  // Leads by source
  const sourceCount = subscribers.reduce<Record<string, number>>((acc, s) => {
    const src = s.source ?? 'direct'
    acc[src] = (acc[src] ?? 0) + 1
    return acc
  }, {})

  return NextResponse.json({ totalActive, hotLeads, emailStats, sourceCount })
}
```

**Step 2: Create `app/admin/analytics/page.tsx`**

```typescript
'use client'
import { useEffect, useState } from 'react'

type Analytics = {
  totalActive: number
  hotLeads: number
  emailStats: { id: string; subject: string; sent_at: string; opens: number; clicks: number; openRate: string; clickRate: string }[]
  sourceCount: Record<string, number>
}

export default function AdminAnalytics() {
  const [data, setData] = useState<Analytics | null>(null)

  useEffect(() => {
    fetch('/api/admin/analytics').then(r => r.json()).then(setData)
  }, [])

  if (!data) return <div className="text-gray-400">Carregando...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Analytics</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Assinantes ativos', value: data.totalActive },
          { label: 'Leads quentes 🔥', value: data.hotLeads },
        ].map(card => (
          <div key={card.label} className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-3xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Email performance */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="font-medium">Performance das edições</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              {['Assunto', 'Enviado em', 'Aberturas', 'Taxa abertura', 'Cliques', 'Taxa clique'].map(h => (
                <th key={h} className="px-4 py-2 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.emailStats.map(e => (
              <tr key={e.id}>
                <td className="px-4 py-3 font-medium">{e.subject ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{e.sent_at ? new Date(e.sent_at).toLocaleDateString('pt-BR') : '—'}</td>
                <td className="px-4 py-3">{e.opens}</td>
                <td className="px-4 py-3">{e.openRate}%</td>
                <td className="px-4 py-3">{e.clicks}</td>
                <td className="px-4 py-3">{e.clickRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lead sources */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-medium mb-3">Origem dos leads</h2>
        <div className="space-y-2">
          {Object.entries(data.sourceCount).sort((a, b) => b[1] - a[1]).map(([source, count]) => (
            <div key={source} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{source}</span>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: analytics dashboard with email stats and lead sources"
```

---

## Task 16: Deploy to Vercel

**Step 1: Create `.gitignore` (if not already created by scaffold)**

Ensure it includes:
```
.env.local
.env*.local
node_modules/
.next/
```

**Step 2: Push to GitHub**

```bash
git remote add origin https://github.com/YOUR_USERNAME/ai-health-newsletter.git
git push -u origin main
```

**Step 3: Import project in Vercel**

1. Go to https://vercel.com/new
2. Import the GitHub repository
3. Add all environment variables from `.env.example`
4. Add `CRON_SECRET` with a random value (e.g., `openssl rand -hex 32`)

**Step 4: Configure Resend domain**

1. In Resend dashboard, add your domain
2. Copy SPF, DKIM and DMARC DNS records to your domain registrar
3. Wait for verification (up to 48h)
4. Update the `from` field in `lib/email-templates.ts` and `lib/newsletter-sender.ts` with your verified domain

**Step 5: Update `NEXT_PUBLIC_BASE_URL`**

In Vercel environment variables, set:
```
NEXT_PUBLIC_BASE_URL=https://your-domain.com.br
```

**Step 6: Verify deployment**

- Visit landing page: `https://your-domain.com.br`
- Test subscribe flow end-to-end
- Visit admin: `https://your-domain.com.br/admin`
- Test "Gerar nova edição" with real API keys

---

## Final Checklist

- [ ] All unit tests pass: `npm test`
- [ ] Landing page renders and form submits
- [ ] Confirmation email arrives and activates subscriber
- [ ] Admin login works
- [ ] "Gerar nova edição" calls all 3 models + Gemini evaluator
- [ ] Newsletter editor saves changes and renders preview
- [ ] Send button dispatches to all active subscribers
- [ ] Resend webhook updates lead scores
- [ ] Analytics show correct data
- [ ] Vercel Cron configured and tested
- [ ] DNS records (SPF/DKIM/DMARC) configured
