# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
supabase db pull               # Pull remote schema (requires Docker)
supabase db diff               # Diff local vs remote (requires Docker)
```

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
- `src/lib/` - Service clients (supabase, stripe, resend, blob) and TypeScript interfaces
- `src/pages/` - Astro pages and API routes
- `src/pages/api/` - API endpoints (checkout, stripe-webhook, newsletter, upload)
- `src/pages/admin/` - Protected admin dashboard (SSR)
- `src/components/public/` - Public-facing components (Hero, EventCard, MixPlayer, etc.)
- `src/components/admin/` - Admin components (FileUpload)
- `src/layouts/` - Base.astro (public), Admin.astro (admin)
- `supabase/migrations/` - Database migrations (managed via Supabase CLI)

### Key Patterns

**Supabase clients** (`src/lib/supabase.ts`):
- `supabase` - Public client with anon key, respects RLS
- `supabaseAdmin` - Service key client, bypasses RLS (server-side only)

**Auth middleware** (`src/middleware.ts`):
- Protects all `/admin/*` routes except `/admin/login`
- Uses cookie-based sessions (`sb-access-token`, `sb-refresh-token`)
- Stores authenticated user in `context.locals.user`

**Stripe flow**:
1. POST `/api/checkout` creates Stripe Checkout session
2. `/api/stripe-webhook` handles `checkout.session.completed` and `charge.refunded`
3. Orders use `stripe_session_id` as idempotency key

### Data Model

Core tables: `events`, `ticket_tiers`, `djs`, `event_djs`, `orders`, `mixes`, `newsletter_subscribers`, `newsletter_campaigns`

- Events have status: draft | published | archived
- Ticket tiers have tier_type: online | door
- Orders have status: completed | refunded | partially_refunded
- Mixes have status: draft | published

### Design

Reference 1: https://bottlingfruit.co.uk/
- like how it feels like an endless scroll, like the bold text and horizontal layout, like the image treatments, like the hover effects

Reference 2: https://body-without-organs.netlify.app/ 
- Like the hover effects

Current site design: https://www.verbsaroundthe.world/