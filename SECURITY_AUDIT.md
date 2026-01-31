# Security Audit Report

**Date:** 2026-01-30
**Scope:** Payment processing and administrative login
**Branch:** `security-audit`

---

## Executive Summary

The VERBS application implements solid security practices for payment processing and admin authentication. One high-priority issue was identified in the file upload API and has been fixed in this branch. Several medium/low priority improvements are recommended for future consideration.

---

## Payment Processing

### Stripe Checkout (`/api/checkout.ts`, `/api/door-checkout.ts`)

| Check | Status |
|-------|--------|
| Server-side session creation | ✅ Pass |
| Input validation (event_id, tier_id) | ✅ Pass |
| Quantity bounds checking (1-10) | ✅ Pass |
| Stock validation against database | ✅ Pass |
| Tier status validation (is_active) | ✅ Pass |
| Door tier restriction | ✅ Pass |
| Stripe price ID verification | ✅ Pass |

**Analysis:** Checkout sessions are created server-side using validated Stripe price IDs from the database. Users cannot manipulate prices since the `stripe_price_id` is fetched server-side and never comes from client input.

### Stripe Webhook (`/api/stripe-webhook.ts`)

| Check | Status |
|-------|--------|
| Webhook signature verification | ✅ Pass |
| Uses Stripe SDK `constructEvent()` | ✅ Pass |
| Idempotent order creation | ✅ Pass |
| Handles duplicate webhooks | ✅ Pass |

**Analysis:** The webhook correctly verifies signatures using Stripe's official SDK method. Order creation uses `stripe_session_id` as an idempotency key via upsert, preventing duplicate orders from webhook retries.

---

## Administrative Authentication

### Middleware (`/src/middleware.ts`)

| Check | Status |
|-------|--------|
| Protects all `/admin/*` routes | ✅ Pass |
| Excludes `/admin/login` from protection | ✅ Pass |
| Server-side token verification via `getUser()` | ✅ Pass |
| Token refresh implementation | ✅ Pass |
| Invalid cookie cleanup | ✅ Pass |

### Cookie Security

| Attribute | Value | Assessment |
|-----------|-------|------------|
| `httpOnly` | `true` | ✅ Prevents XSS token theft |
| `secure` | `true` in prod | ✅ HTTPS only in production |
| `sameSite` | `lax` | ✅ CSRF protection |
| `path` | `/` | ✅ Correct |

### Login Page (`/pages/admin/login.astro`)

| Check | Status |
|-------|--------|
| POST method for login | ✅ Pass |
| No password logging | ✅ Pass |
| Uses Supabase auth (hashed passwords) | ✅ Pass |
| `noindex, nofollow` meta tag | ✅ Pass |

### Logout (`/pages/admin/logout.ts`)

| Check | Status |
|-------|--------|
| POST method (not GET) | ✅ Pass |
| Clears both tokens | ✅ Pass |
| Redirects to login | ✅ Pass |

---

## Issues Found

### HIGH: Upload API Insufficient Authentication ✅ FIXED

**File:** `src/pages/api/upload.ts`

**Problem:** The upload endpoint only checked if the `sb-access-token` cookie *existed*, but did not verify it was valid with Supabase. An attacker with an expired or forged token could bypass authentication.

**Fix Applied:** Added `getUser()` verification to match the pattern used in other admin API endpoints:

```typescript
const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
if (authError || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}
```

---

### MEDIUM: No Rate Limiting

**Affected endpoints:**
- `/admin/login` - vulnerable to brute force password attacks
- `/api/checkout` - could be abused to create many Stripe sessions
- `/api/newsletter/subscribe` - email enumeration/spam

**Recommendation:** Implement rate limiting at the Vercel edge or application level. Consider:
- Login: 5 attempts per 15 minutes per IP
- Checkout: 10 requests per minute per IP
- Newsletter: 3 subscribes per hour per IP

---

### LOW: Login Form Missing CSRF Token

**File:** `src/pages/admin/login.astro:65`

While `sameSite: 'lax'` cookies provide implicit CSRF protection for POST requests from cross-origin sites, explicit CSRF tokens provide defense in depth.

**Recommendation:** Consider adding a CSRF token for the login form if extra protection is desired, though the current implementation is acceptable for most threat models.

---

## Verified Secure Patterns

1. **No client-side price handling** - All Stripe prices come from database
2. **Signed webhooks** - Cannot forge payment completion events
3. **Server-side auth verification** - Tokens validated with Supabase (except upload.ts)
4. **httpOnly cookies** - Cannot be stolen via XSS
5. **Secure cookies in production** - Transmitted only over HTTPS
6. **Row Level Security** - Database queries respect RLS policies

---

## Recommendations Summary

| Priority | Issue | Status |
|----------|-------|--------|
| **HIGH** | Upload API auth bypass | ✅ Fixed in this branch |
| MEDIUM | No rate limiting | Consider for future |
| LOW | No login CSRF token | Optional improvement |

---

## Files Reviewed

- `src/pages/api/checkout.ts`
- `src/pages/api/door-checkout.ts`
- `src/pages/api/stripe-webhook.ts`
- `src/pages/api/upload.ts`
- `src/pages/api/admin/event-djs.ts`
- `src/pages/admin/login.astro`
- `src/pages/admin/logout.ts`
- `src/middleware.ts`
- `src/lib/stripe.ts`
- `src/lib/supabase.ts`
- `src/layouts/Admin.astro`
