/**
 * Pure data-parsing functions extracted from the Stripe webhook handler.
 * These transform raw Stripe objects into typed domain data.
 * No DB calls, no side effects — just parsing + validation.
 */

export interface CheckoutData {
  eventId: string;
  tierId: string;
  quantity: number;
  checkoutType: 'online' | 'door';
  sessionId: string;
  paymentIntentId: string | null;
  customerEmail: string | null;
  customerName: string | null;
  amountPaid: number;
  discountAmount: number;
}

export interface RefundData {
  paymentIntentId: string;
  refundedAmount: number;
}

/**
 * Parse a Stripe checkout.session.completed event's data object
 * into domain data for order creation.
 *
 * Throws if required metadata (event_id, ticket_tier_id) is missing.
 */
export function parseCheckoutSession(session: Record<string, any>): CheckoutData {
  const eventId = session.metadata?.event_id;
  const tierId = session.metadata?.ticket_tier_id;

  if (!eventId || !tierId) {
    throw new Error(
      `Missing required metadata in session ${session.id}: event_id=${eventId}, ticket_tier_id=${tierId}`
    );
  }

  const rawQuantity = parseInt(session.metadata?.quantity || '1', 10);
  const quantity = Number.isNaN(rawQuantity) ? 1 : rawQuantity;

  const checkoutType = session.metadata?.checkout_type === 'door' ? 'door' : 'online';

  const discountAmount = session.total_details?.amount_discount
    ? session.total_details.amount_discount / 100
    : 0;

  return {
    eventId,
    tierId,
    quantity,
    checkoutType,
    sessionId: session.id,
    paymentIntentId: session.payment_intent ?? null,
    customerEmail: session.customer_details?.email || session.customer_email || null,
    customerName: session.customer_details?.name ?? null,
    amountPaid: (session.amount_total ?? 0) / 100,
    discountAmount,
  };
}

/**
 * Parse a Stripe charge.refunded event's data object
 * into the fields needed for refund processing.
 *
 * Throws if payment_intent is missing (can't look up order without it).
 */
export function parseRefundCharge(charge: Record<string, any>): RefundData {
  const paymentIntentId = charge.payment_intent;
  if (!paymentIntentId) {
    throw new Error(`Missing payment_intent on charge ${charge.id}`);
  }

  return {
    paymentIntentId,
    refundedAmount: (charge.amount_refunded ?? 0) / 100,
  };
}

/**
 * Clamp sold_count so it never goes negative.
 * Protects against data corruption where ticketsToReturn > currentCount.
 */
export function clampSoldCount(currentCount: number, ticketsToReturn: number): number {
  return Math.max(0, currentCount - ticketsToReturn);
}
