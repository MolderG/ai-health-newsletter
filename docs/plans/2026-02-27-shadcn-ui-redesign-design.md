# Design Doc: shadcn/ui Redesign — AI Health Newsletter

**Date:** 2026-02-27
**Status:** Implemented

---

## Objective

Redesign the public-facing home page and `/obrigado` page for the AI Health Newsletter, targeting B2B healthcare managers. Migrate from Tailwind v4 to Tailwind v3 and adopt shadcn/ui for consistent, production-grade components.

---

## Design Direction

**Aesthetic:** Clean & corporate — refined minimalism suited to hospital decision-makers.
**Tone:** Trustworthy, professional, authoritative.
**Key differentiator:** Asymmetric hero with sticky form card for high conversion.

---

## Architecture

### Tech Stack Changes
- Tailwind CSS: v4 → v3.4
- New: shadcn/ui (default style, zinc base color, CSS variables)
- New: lucide-react (icons)
- New: clsx + tailwind-merge (via lib/utils.ts)

### New Components

| File | Purpose |
|------|---------|
| `components/Header.tsx` | Sticky header: logo, "Gratuita" badge, CTA button |
| `components/Footer.tsx` | Brand, privacy link, unsubscribe link, copyright |
| `components/SocialProof.tsx` | Institution name strip under hero |
| `components/HeroSection.tsx` | Asymmetric 3fr/2fr grid: copy left, form card right |
| `components/ValueProps.tsx` | 3-column card grid: "Por que assinar?" section |
| `components/ui/*` | shadcn components: button, input, label, select, card, badge, alert, separator |

### Modified Files

| File | Change |
|------|--------|
| `package.json` | Removed tailwind v4, added v3 + autoprefixer + postcss |
| `tailwind.config.js` | New v3 config with shadcn color tokens |
| `postcss.config.mjs` | Migrated to tailwindcss + autoprefixer plugins |
| `app/globals.css` | Tailwind v3 directives + shadcn CSS variables |
| `components/SubscribeForm.tsx` | Refactored with shadcn Input/Label/Select/Button/Alert |
| `app/page.tsx` | Rebuilt with new component composition |
| `app/obrigado/page.tsx` | Rebuilt with Card, MailCheck icon, Header/Footer |

---

## Layout — Home Page

```
┌─────────────────────────────────────────────────────┐
│ Header (sticky)  Logo   [Gratuita]  [Assinar grátis] │
├─────────────────────────────────────────────────────┤
│ HeroSection                                          │
│ ┌──────────────────────┐  ┌───────────────────────┐ │
│ │ Badge "semanal"       │  │ Card (shadow-lg)      │ │
│ │ H1 (tracking-tight)  │  │ SubscribeForm         │ │
│ │ Subtitle             │  │ (Input/Select/Button) │ │
│ │ ✓ Bullet 1           │  └───────────────────────┘ │
│ │ ✓ Bullet 2           │                             │
│ │ ✓ Bullet 3           │                             │
│ │ 👥 500 líderes        │                             │
│ └──────────────────────┘                             │
├─────────────────────────────────────────────────────┤
│ SocialProof  "Lido por gestores..." + instituições   │
├─────────────────────────────────────────────────────┤
│ ValueProps — Por que assinar?                        │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│ │ 🧠 Brain  │  │ 📊 Chart │  │ ✉ Mail  │            │
│ └──────────┘  └──────────┘  └──────────┘            │
├─────────────────────────────────────────────────────┤
│ Footer  Logo  Privacidade | Cancelar  © 2025         │
└─────────────────────────────────────────────────────┘
```

---

## Confirmation States (/?confirmed=)

| State | Rendering |
|-------|-----------|
| `confirmed=true` | Green Alert with CheckCircle2 in hero right column |
| `confirmed=error` | Destructive Alert + form below in hero right column |
| Default | Form card in hero right column |

---

## `/obrigado` Page

Full-height flex layout with Header + centered Card + Footer.
Card contains: MailCheck icon (blue, large), title, instructions, spam note, "Voltar" outline button.
