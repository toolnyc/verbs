import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';
import { verifyWebhookSignature, stripe, getPromotionCodeDetails } from '../../lib/stripe';
import { sendTicketConfirmation } from '../../lib/resend';
import { parseCheckoutSession, parseRefundCharge, clampSoldCount } from '../../lib/webhook';

export const POST: APIRoute = async ({ request }) => {
  try {
    const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret || !stripe || !supabaseAdmin) {
      return new Response('Webhook not configured', { status: 500 });
    }

    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return new Response('Missing signature', { status: 400 });
    }

    let event;
    try {
      event = verifyWebhookSignature(payload, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response('Invalid signature', { status: 400 });
    }

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;

      let checkout;
      try {
        checkout = parseCheckoutSession(session);
      } catch (err) {
        console.error('Checkout session parsing failed:', err);
        return new Response('Missing metadata', { status: 400 });
      }

      // Fetch discount code from Stripe API (side effect, stays in handler)
      let discountCode: string | null = null;
      if (session.discounts && session.discounts.length > 0) {
        const promoCodeId = session.discounts[0]?.promotion_code;
        if (promoCodeId && typeof promoCodeId === 'string') {
          try {
            const promoDetails = await getPromotionCodeDetails(promoCodeId);
            discountCode = promoDetails.code;
          } catch (e) {
            console.error('Failed to fetch promo code details:', e);
          }
        }
      }

      // Insert order (idempotent on stripe_session_id)
      const { data: orderData, error: orderError } = await supabaseAdmin
        .from('orders')
        .upsert(
          {
            event_id: checkout.eventId,
            ticket_tier_id: checkout.tierId,
            stripe_session_id: checkout.sessionId,
            stripe_payment_intent_id: checkout.paymentIntentId,
            customer_email: checkout.customerEmail,
            customer_name: checkout.customerName,
            quantity: checkout.quantity,
            amount_paid: checkout.amountPaid,
            discount_amount: checkout.discountAmount,
            discount_code: discountCode,
            status: 'completed',
          },
          {
            onConflict: 'stripe_session_id',
            ignoreDuplicates: false,
          }
        )
        .select('order_number')
        .single();

      if (orderError) {
        console.error('Error inserting order:', orderError);
        // Don't return error - might be duplicate
      }

      const orderNumber = orderData?.order_number || null;

      // Increment sold_count
      const { error: updateError } = await supabaseAdmin.rpc(
        'increment_sold_count',
        { tier_id: checkout.tierId, qty: checkout.quantity }
      );

      // If RPC doesn't exist, do it manually
      if (updateError) {
        const { data: tier } = await supabaseAdmin
          .from('ticket_tiers')
          .select('sold_count')
          .eq('id', checkout.tierId)
          .single();

        if (tier) {
          await supabaseAdmin
            .from('ticket_tiers')
            .update({ sold_count: tier.sold_count + checkout.quantity })
            .eq('id', checkout.tierId);
        }
      }

      // Send confirmation email
      try {
        const { data: eventData } = await supabaseAdmin
          .from('events')
          .select('*')
          .eq('id', checkout.eventId)
          .single();

        const { data: tierData } = await supabaseAdmin
          .from('ticket_tiers')
          .select('name')
          .eq('id', checkout.tierId)
          .single();

        if (eventData && tierData && checkout.customerEmail) {
          await sendTicketConfirmation({
            to: checkout.customerEmail,
            customerName: checkout.customerName,
            eventTitle: eventData.title,
            eventDate: new Date(eventData.date),
            eventTimezone: eventData.timezone,
            venueName: eventData.venue_name,
            venueAddress: eventData.venue_address,
            tierName: tierData.name,
            quantity: checkout.quantity,
            amountPaid: checkout.amountPaid,
            orderNumber,
          });
        }
      } catch (emailErr) {
        console.error('Failed to send confirmation email:', emailErr);
        // Don't fail the webhook for email errors
      }

      return new Response('OK', { status: 200 });
    }

    // Handle charge.refunded
    if (event.type === 'charge.refunded') {
      const charge = event.data.object as any;

      let refund;
      try {
        refund = parseRefundCharge(charge);
      } catch (err) {
        console.error('Refund charge parsing failed:', err);
        return new Response('Missing payment intent', { status: 400 });
      }

      // Find the order
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('stripe_payment_intent_id', refund.paymentIntentId)
        .single();

      if (orderError || !order) {
        console.error('Order not found for refund:', refund.paymentIntentId);
        return new Response('Order not found', { status: 404 });
      }

      // Determine status
      const isFullRefund = refund.refundedAmount >= order.amount_paid;
      const newStatus = isFullRefund ? 'refunded' : 'partially_refunded';

      // Calculate tickets to return
      // NOTE: Known issue — Stripe's amount_refunded is cumulative, but this code
      // treats it as if each webhook is the first refund. On a second partial refund,
      // ticketsToReturn will be recalculated from the cumulative total, potentially
      // returning more tickets than intended. Fixing this requires tracking
      // previously-returned tickets in the orders table.
      const ticketsToReturn = isFullRefund
        ? order.quantity
        : Math.floor((refund.refundedAmount / order.amount_paid) * order.quantity);

      // Update order
      await supabaseAdmin
        .from('orders')
        .update({
          status: newStatus,
          refunded_amount: refund.refundedAmount,
        })
        .eq('id', order.id);

      // Decrement sold_count
      if (ticketsToReturn > 0) {
        const { data: tier } = await supabaseAdmin
          .from('ticket_tiers')
          .select('sold_count')
          .eq('id', order.ticket_tier_id)
          .single();

        if (tier) {
          await supabaseAdmin
            .from('ticket_tiers')
            .update({
              sold_count: clampSoldCount(tier.sold_count, ticketsToReturn),
            })
            .eq('id', order.ticket_tier_id);
        }
      }

      return new Response('OK', { status: 200 });
    }

    // Unhandled event type
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Webhook error', { status: 500 });
  }
};
