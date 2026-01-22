import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';
import { createCheckoutSession } from '../../lib/stripe';

export const POST: APIRoute = async ({ request }) => {
  try {
    if (!supabaseAdmin) {
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { event_id, ticket_tier_id, quantity = 1 } = body;

    // Validate required fields
    if (!event_id || !ticket_tier_id) {
      return new Response(
        JSON.stringify({ error: 'Missing event_id or ticket_tier_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate quantity
    if (quantity < 1 || quantity > 10) {
      return new Response(
        JSON.stringify({ error: 'Quantity must be between 1 and 10' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch ticket tier
    const { data: tier, error: tierError } = await supabaseAdmin
      .from('ticket_tiers')
      .select('*, event:events(*)')
      .eq('id', ticket_tier_id)
      .single();

    if (tierError || !tier) {
      return new Response(
        JSON.stringify({ error: 'Ticket tier not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate tier
    if (!tier.is_active) {
      return new Response(
        JSON.stringify({ error: 'This ticket tier is not available' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (tier.tier_type === 'door') {
      return new Response(
        JSON.stringify({ error: 'This ticket is only available at the door' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check stock
    if (tier.max_stock !== null) {
      const available = tier.max_stock - tier.sold_count;
      if (available < quantity) {
        return new Response(
          JSON.stringify({
            error: available <= 0
              ? 'This ticket tier is sold out'
              : `Only ${available} tickets remaining`
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check Stripe price ID exists
    if (!tier.stripe_price_id) {
      return new Response(
        JSON.stringify({ error: 'Ticket not configured for online purchase' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Stripe checkout session
    const siteUrl = (import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321').replace(/\/$/, '');
    const successUrl = `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${siteUrl}/events/${event_id}`;

    const session = await createCheckoutSession({
      priceId: tier.stripe_price_id,
      eventId: event_id,
      tierId: ticket_tier_id,
      quantity,
      successUrl,
      cancelUrl,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Checkout error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create checkout session' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
