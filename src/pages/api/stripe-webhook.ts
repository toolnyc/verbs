import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';
import { verifyWebhookSignature, stripe } from '../../lib/stripe';
import { sendTicketConfirmation } from '../../lib/resend';

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

      const eventId = session.metadata?.event_id;
      const tierId = session.metadata?.ticket_tier_id;
      const quantity = parseInt(session.metadata?.quantity || '1', 10);

      if (!eventId || !tierId) {
        console.error('Missing metadata in checkout session');
        return new Response('Missing metadata', { status: 400 });
      }

      // Insert order (idempotent on stripe_session_id)
      const { data: orderData, error: orderError } = await supabaseAdmin
        .from('orders')
        .upsert(
          {
            event_id: eventId,
            ticket_tier_id: tierId,
            stripe_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent,
            customer_email: session.customer_details?.email || session.customer_email,
            customer_name: session.customer_details?.name,
            quantity,
            amount_paid: session.amount_total / 100, // Convert from cents
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
        { tier_id: tierId, qty: quantity }
      );

      // If RPC doesn't exist, do it manually
      if (updateError) {
        const { data: tier } = await supabaseAdmin
          .from('ticket_tiers')
          .select('sold_count')
          .eq('id', tierId)
          .single();

        if (tier) {
          await supabaseAdmin
            .from('ticket_tiers')
            .update({ sold_count: tier.sold_count + quantity })
            .eq('id', tierId);
        }
      }

      // Send confirmation email
      try {
        const { data: eventData } = await supabaseAdmin
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();

        const { data: tierData } = await supabaseAdmin
          .from('ticket_tiers')
          .select('name')
          .eq('id', tierId)
          .single();

        if (eventData && tierData && session.customer_details?.email) {
          await sendTicketConfirmation({
            to: session.customer_details.email,
            customerName: session.customer_details.name,
            eventTitle: eventData.title,
            eventDate: new Date(eventData.date),
            eventTimezone: eventData.timezone,
            venueName: eventData.venue_name,
            venueCity: eventData.venue_city,
            tierName: tierData.name,
            quantity,
            amountPaid: session.amount_total / 100,
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
      const paymentIntentId = charge.payment_intent;
      const refundedAmount = charge.amount_refunded / 100; // Convert from cents

      // Find the order
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();

      if (orderError || !order) {
        console.error('Order not found for refund:', paymentIntentId);
        return new Response('Order not found', { status: 404 });
      }

      // Determine status
      const isFullRefund = refundedAmount >= order.amount_paid;
      const newStatus = isFullRefund ? 'refunded' : 'partially_refunded';

      // Calculate tickets to return
      const ticketsToReturn = isFullRefund
        ? order.quantity
        : Math.floor((refundedAmount / order.amount_paid) * order.quantity);

      // Update order
      await supabaseAdmin
        .from('orders')
        .update({
          status: newStatus,
          refunded_amount: refundedAmount,
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
              sold_count: Math.max(0, tier.sold_count - ticketsToReturn),
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
