# VERBS

Event ticketing site for a music collective.

## Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Astro 5 (hybrid SSR) | SPA-style homepage + SSR admin |
| Database | Supabase Postgres + RLS | All persistent data |
| Auth | Supabase Auth | Admin sessions (public signup disabled) |
| Storage | Vercel Blob | Event images, mix audio |
| Payments | Stripe Checkout | Ticketing |
| Email | Resend | Transactional + newsletters |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in:

```bash
# Supabase
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Vercel Blob
BLOB_READ_WRITE_TOKEN=

# Resend
RESEND_API_KEY=

# App
PUBLIC_SITE_URL=https://www.verbsaroundthe.world/
```

### 3. Run database schema

Execute `supabase/schema.sql` in your Supabase SQL Editor. This creates all tables, enums, indexes, and RLS policies.

### 4. Create admin user

In Supabase Dashboard → Authentication → Users → Add user

### 5. Configure Stripe webhook

Point webhook to `https://your-domain/api/stripe-webhook` with events:
- `checkout.session.completed`
- `charge.refunded`

### 6. Deploy

```bash
npx vercel
```

## Routes

### Public

| Route | Purpose |
|-------|---------|
| `/` | Homepage: hero event, events list, mixes, newsletter |
| `/unsubscribe?token=xxx` | Newsletter unsubscribe |

### API

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/checkout` | POST | Create Stripe Checkout session |
| `/api/stripe-webhook` | POST | Handle Stripe events |
| `/api/newsletter/subscribe` | POST | Add subscriber |
| `/api/upload` | POST | Upload files to Vercel Blob |

### Admin

| Route | Purpose |
|-------|---------|
| `/admin` | Dashboard with stats |
| `/admin/login` | Authentication |
| `/admin/events` | Events list + CRUD |
| `/admin/events/[id]` | Event editor (tiers, DJs, image) |
| `/admin/events/[id]/orders` | Orders with refund actions |
| `/admin/djs` | DJs CRUD |
| `/admin/mixes` | Mixes CRUD with audio upload |
| `/admin/newsletter` | Subscribers, compose, send campaigns |

## Data Model

### events
- `id`, `title`, `description`, `date`, `time_end`
- `venue_name`, `venue_city`, `venue_link`, `image_url`
- `status`: draft | published | archived

### ticket_tiers
- `event_id`, `name`, `tier_type`: online | door
- `price`, `stripe_product_id`, `stripe_price_id`
- `max_stock` (null = unlimited), `sold_count`, `is_active`

### djs
- `id`, `name`, `instagram_url`, `soundcloud_url`

### event_djs (junction)
- `event_id`, `dj_id`, `slot_start`, `slot_end`, `sort_order`

### orders
- `event_id`, `ticket_tier_id`, `stripe_session_id` (unique)
- `customer_email`, `customer_name`, `quantity`, `amount_paid`
- `status`: completed | refunded | partially_refunded

### mixes
- `title`, `description`, `audio_url`, `cover_image_url`
- `duration_seconds`, `status`: draft | published

### newsletter_subscribers
- `email` (unique), `source`, `unsubscribe_token` (unique)
- `subscribed_at`, `unsubscribed_at`

### newsletter_campaigns
- `subject`, `html_content`, `status`: draft | sending | sent
- `sent_count`, `failed_count`, `sent_at`

## Key Flows

### Checkout
1. User clicks "Buy" → POST `/api/checkout`
2. Server validates tier availability
3. Creates Stripe Checkout Session
4. Redirects to Stripe

### Webhook: checkout.session.completed
1. Validate signature
2. Insert order (idempotent on `stripe_session_id`)
3. Increment `sold_count`
4. Send confirmation email

### Webhook: charge.refunded
1. Lookup order by `payment_intent_id`
2. Update `refunded_amount` and status
3. Decrement `sold_count`

## Security

### Row Level Security

| Table | Public Read | Auth Write |
|-------|-------------|------------|
| events | status = 'published' | Yes |
| ticket_tiers | active + published event | Yes |
| djs, event_djs | Yes | Yes |
| mixes | status = 'published' | Yes |
| orders | No | Yes |
| newsletter_* | No | Yes |

### API Protection
- Stripe webhook: signature validation
- Newsletter subscribe: rate limited (5/hour per IP)

## File Uploads

- **Images**: jpg, png, webp up to 5MB
- **Audio**: mp3, aiff, wav (Vercel Blob limits: 500MB Hobby, 5GB Pro)

## Commands

```bash
npm run dev      # Start dev server at localhost:4321
npm run build    # Build for production
npm run preview  # Preview production build
```
