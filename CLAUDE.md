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

## Git Workflow

**Always use worktrees for feature work.** Do not make changes directly on `master`.

```bash
# Create worktree for new feature
git worktree add -b feature/my-feature ../verbs-my-feature

# Work in the worktree
cd ../verbs-my-feature
pnpm install  # Required - worktrees don't share node_modules

# When done, push and clean up
git push -u origin feature/my-feature
cd ../verbs
git worktree remove ../verbs-my-feature
```

**Database environments:**
- `verb-web` (preview) - linked by default, safe for testing migrations
- `verb-web-prod` (production) - only push migrations after PR is merged

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

### Hover Flyer Previews — Known Pitfalls

The cursor-following flyer preview system (`src/lib/animations.ts` `createHoverPreview` + `VerbGrid.astro`) has three interacting systems that can cause subtle bugs: **Lenis smooth scroll**, **GSAP tweens**, and **Astro ViewTransitions**. Key lessons from past debugging:

**Lenis + scroll listeners**: Lenis smooth scroll fires the native `window.scroll` event on every animation frame for ~1.2s after user input. Any scroll-based hide logic must not blindly hide on every scroll event — it needs to check whether the cursor is actually outside the trigger's bounding rect, otherwise flyers can never appear while Lenis is animating.

**GSAP tween races (overwrite: 'auto')**: The show tween (0.45s `fromTo`) and hide tween (0.3s `to`) target the same properties (opacity, scale) on the same element. GSAP 3 defaults to `overwrite: false`, meaning both tweens run simultaneously. If `hide()` is called during the show animation, the hide tween finishes first (0.3s < 0.45s), and the show tween's remaining frames push opacity back up — creating an orphaned visible flyer with `isVisible = false` (so `hide()` becomes a no-op). Fix: use `overwrite: 'auto'` on both tweens so each kills the other's overlapping properties without nuking the `quickTo` x/y tweens.

**ViewTransition cleanup**: Flyer previews are reparented from `.verb-item` to `document.body` for correct fixed positioning. On navigation, `astro:before-preparation` force-hides all `body > .flyer-preview` elements, and `initVerbGridAnimations` removes orphans on re-init. The cleanup function moves previews back into their items so the next init cycle can find them.

### PostgREST / Supabase — Multiple Foreign Keys Between Tables

**CRITICAL**: When adding a foreign key that creates a second relationship between two tables, you MUST update all existing queries that embed the related table.

Example: Adding `events.door_tier_id` → `ticket_tiers.id` created a second FK between `events` and `ticket_tiers` (the first being `ticket_tiers.event_id` → `events.id`). This caused PostgREST error `PGRST201: Could not embed because more than one relationship was found`.

**Before** (ambiguous, breaks):
```typescript
.select(`*, ticket_tiers (*)`)
```

**After** (explicit FK, works):
```typescript
.select(`*, ticket_tiers!ticket_tiers_event_id_fkey (*)`)
```

Always test queries locally after adding FKs that reference tables already linked by other FKs. The dev server console will show the PGRST201 error with hints about which FK names to use.