# VERBS — Agent Instructions

## Critical Rules

**BEFORE writing any code or making changes**, check:
1. Am I on `master`? If yes, STOP and create a worktree first
2. Never commit directly to master — all feature work requires a worktree

```bash
git worktree add -b feature/<name> ../verbs-<name>
cd ../verbs-<name>
pnpm install
```

## Commands

```bash
pnpm run dev       # Start dev server + Stripe webhooks (auto-injects secret)
pnpm run dev:only  # Start dev server only (no Stripe)
pnpm run build     # Build for production
pnpm run preview   # Preview production build
```

### Database (Supabase CLI)

```bash
supabase migration new <name>  # Create a new migration file
supabase db push               # Push migrations to remote
supabase migration list        # Check migration status
```

## Git Workflow

**Always use worktrees for feature work.**

```bash
git worktree add -b feature/my-feature ../verbs-my-feature
cd ../verbs-my-feature
pnpm install

git push -u origin feature/my-feature
cd ../verbs
git worktree remove ../verbs-my-feature
```

**Database environments:**
- `verb-web` (preview) — linked by default, safe for testing migrations
- `verb-web-prod` (production) — only push migrations after PR is merged

## Architecture

VERBS is an event ticketing site built with Astro 5 in full SSR mode (`output: 'server'`), deployed to Vercel.

### Stack
- **Frontend**: Astro 5 with hybrid SSR
- **Database**: Supabase Postgres with Row Level Security
- **Auth**: Supabase Auth (admin-only, no public signup)
- **Storage**: Vercel Blob for images and audio
- **Payments**: Stripe Checkout
- **Email**: Resend for transactional and newsletters

### Directory Structure
- `src/lib/` — Service clients (supabase, stripe, resend, blob) and TypeScript interfaces
- `src/pages/` — Astro pages and API routes
- `src/pages/api/` — API endpoints (checkout, stripe-webhook, newsletter, upload)
- `src/pages/admin/` — Protected admin dashboard (SSR)
- `src/components/public/` — Public-facing components
- `src/components/admin/` — Admin components
- `src/layouts/` — Base.astro (public), Admin.astro (admin)
- `supabase/migrations/` — Database migrations

### Key Patterns

**Supabase clients** (`src/lib/supabase.ts`):
- `supabase` — Public client with anon key, respects RLS
- `supabaseAdmin` — Service key client, bypasses RLS (server-side only)

**Auth middleware** (`src/middleware.ts`): Protects `/admin/*`, cookie-based sessions.

**Stripe flow**: POST `/api/checkout` -> Stripe Checkout session -> `/api/stripe-webhook` handles completion/refunds. Orders use `stripe_session_id` as idempotency key.

### Data Model

Core tables: `events`, `ticket_tiers`, `djs`, `event_djs`, `orders`, `mixes`, `newsletter_subscribers`, `newsletter_campaigns`

- Events: draft | published | archived
- Ticket tiers: online | door
- Orders: completed | refunded | partially_refunded

### Design

Reference 1: https://bottlingfruit.co.uk/ — endless scroll, bold text, horizontal layout, image treatments
Reference 2: https://body-without-organs.netlify.app/ — hover effects
Current: https://www.verbsaroundthe.world/

### Hover Flyer Previews — Known Pitfalls

The cursor-following flyer preview (`src/lib/animations.ts` `createHoverPreview` + `VerbGrid.astro`) has three interacting systems: **Lenis smooth scroll**, **GSAP tweens**, and **Astro ViewTransitions**.

- **Lenis + scroll listeners**: Lenis fires native scroll events for ~1.2s after input. Hide logic must check cursor position, not just scroll events.
- **GSAP tween races**: Use `overwrite: 'auto'` on both show/hide tweens to prevent orphaned visible flyers.
- **ViewTransition cleanup**: `astro:before-preparation` force-hides flyers; `initVerbGridAnimations` removes orphans on re-init.

### PostgREST — Multiple Foreign Keys

When adding a second FK between two tables, disambiguate all existing queries:
```typescript
// Explicit FK name required
.select(`*, ticket_tiers!ticket_tiers_event_id_fkey (*)`)
```
