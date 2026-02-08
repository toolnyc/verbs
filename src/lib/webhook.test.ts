import { describe, it, expect } from 'vitest';
import { parseCheckoutSession, parseRefundCharge, clampSoldCount } from './webhook';

// ---------------------------------------------------------------------------
// Helpers — build realistic Stripe-shaped objects
// ---------------------------------------------------------------------------

function makeSession(overrides: Record<string, any> = {}) {
  return {
    id: 'cs_test_abc123',
    payment_intent: 'pi_test_xyz789',
    amount_total: 4197, // $41.97 in cents
    customer_email: 'fallback@example.com',
    customer_details: {
      email: 'customer@example.com',
      name: 'Jane Doe',
    },
    metadata: {
      event_id: 'evt_001',
      ticket_tier_id: 'tier_001',
      quantity: '2',
      checkout_type: 'online',
    },
    total_details: {
      amount_discount: 500, // $5.00 discount
    },
    discounts: [],
    ...overrides,
  };
}

function makeCharge(overrides: Record<string, any> = {}) {
  return {
    id: 'ch_test_abc',
    payment_intent: 'pi_test_xyz789',
    amount_refunded: 10000, // $100.00 in cents
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// "Customer buys a ticket" scenarios
// ---------------------------------------------------------------------------

describe('parseCheckoutSession', () => {
  it('parses a standard purchase correctly', () => {
    const result = parseCheckoutSession(makeSession());

    expect(result).toEqual({
      eventId: 'evt_001',
      tierId: 'tier_001',
      quantity: 2,
      checkoutType: 'online',
      sessionId: 'cs_test_abc123',
      paymentIntentId: 'pi_test_xyz789',
      customerEmail: 'customer@example.com',
      customerName: 'Jane Doe',
      amountPaid: 41.97,
      discountAmount: 5,
    });
  });

  it('converts cents to dollars exactly: 4197 cents → $41.97', () => {
    const result = parseCheckoutSession(makeSession({ amount_total: 4197 }));
    expect(result.amountPaid).toBe(41.97);
  });

  it('handles zero amount', () => {
    const result = parseCheckoutSession(makeSession({ amount_total: 0 }));
    expect(result.amountPaid).toBe(0);
  });

  it('extracts discount amount in dollars', () => {
    const result = parseCheckoutSession(
      makeSession({ total_details: { amount_discount: 1250 } })
    );
    expect(result.discountAmount).toBe(12.5);
  });

  it('returns discountAmount=0 when total_details is null', () => {
    const result = parseCheckoutSession(makeSession({ total_details: null }));
    expect(result.discountAmount).toBe(0);
  });

  it('returns discountAmount=0 when amount_discount is 0', () => {
    const result = parseCheckoutSession(
      makeSession({ total_details: { amount_discount: 0 } })
    );
    expect(result.discountAmount).toBe(0);
  });

  it('throws when event_id is missing from metadata', () => {
    const session = makeSession({
      metadata: { ticket_tier_id: 'tier_001', quantity: '1' },
    });
    expect(() => parseCheckoutSession(session)).toThrow(/event_id/);
  });

  it('throws when ticket_tier_id is missing from metadata', () => {
    const session = makeSession({
      metadata: { event_id: 'evt_001', quantity: '1' },
    });
    expect(() => parseCheckoutSession(session)).toThrow(/ticket_tier_id/);
  });

  it('throws when metadata is completely missing', () => {
    const session = makeSession({ metadata: null });
    expect(() => parseCheckoutSession(session)).toThrow();
  });

  it('defaults quantity to 1 when metadata.quantity is missing', () => {
    const session = makeSession({
      metadata: { event_id: 'evt_001', ticket_tier_id: 'tier_001' },
    });
    const result = parseCheckoutSession(session);
    expect(result.quantity).toBe(1);
  });

  it('defaults quantity to 1 when metadata.quantity is malformed (NaN)', () => {
    const session = makeSession({
      metadata: {
        event_id: 'evt_001',
        ticket_tier_id: 'tier_001',
        quantity: 'abc',
      },
    });
    const result = parseCheckoutSession(session);
    expect(result.quantity).toBe(1);
  });

  it('falls back to customer_email when customer_details.email is null', () => {
    const session = makeSession({
      customer_details: { email: null, name: 'Jane' },
      customer_email: 'fallback@example.com',
    });
    const result = parseCheckoutSession(session);
    expect(result.customerEmail).toBe('fallback@example.com');
  });

  it('returns null email when both sources are missing', () => {
    const session = makeSession({
      customer_details: { email: null, name: null },
      customer_email: null,
    });
    const result = parseCheckoutSession(session);
    expect(result.customerEmail).toBeNull();
  });

  it('returns null customerName when customer_details.name is missing', () => {
    const session = makeSession({
      customer_details: { email: 'a@b.com', name: undefined },
    });
    const result = parseCheckoutSession(session);
    expect(result.customerName).toBeNull();
  });

  it('returns null paymentIntentId when payment_intent is missing', () => {
    const session = makeSession({ payment_intent: undefined });
    const result = parseCheckoutSession(session);
    expect(result.paymentIntentId).toBeNull();
  });

  it('parses checkout_type=door correctly', () => {
    const session = makeSession({
      metadata: {
        event_id: 'evt_001',
        ticket_tier_id: 'tier_001',
        checkout_type: 'door',
      },
    });
    const result = parseCheckoutSession(session);
    expect(result.checkoutType).toBe('door');
  });

  it('defaults checkout_type to online for unknown values', () => {
    const session = makeSession({
      metadata: {
        event_id: 'evt_001',
        ticket_tier_id: 'tier_001',
        checkout_type: 'something_weird',
      },
    });
    const result = parseCheckoutSession(session);
    expect(result.checkoutType).toBe('online');
  });

  it('includes session.id in error message on failure', () => {
    const session = makeSession({
      id: 'cs_SPECIFIC_ID',
      metadata: { event_id: null, ticket_tier_id: null },
    });
    expect(() => parseCheckoutSession(session)).toThrow('cs_SPECIFIC_ID');
  });
});

// ---------------------------------------------------------------------------
// "Admin refunds an order" scenarios
// ---------------------------------------------------------------------------

describe('parseRefundCharge', () => {
  it('parses a full refund: 10000 cents → $100.00', () => {
    const result = parseRefundCharge(makeCharge({ amount_refunded: 10000 }));
    expect(result).toEqual({
      paymentIntentId: 'pi_test_xyz789',
      refundedAmount: 100,
    });
  });

  it('parses a partial refund: 1399 cents → $13.99 exactly', () => {
    const result = parseRefundCharge(makeCharge({ amount_refunded: 1399 }));
    expect(result.refundedAmount).toBe(13.99);
  });

  it('handles zero refund amount', () => {
    const result = parseRefundCharge(makeCharge({ amount_refunded: 0 }));
    expect(result.refundedAmount).toBe(0);
  });

  it('handles missing amount_refunded (defaults to 0)', () => {
    const result = parseRefundCharge(makeCharge({ amount_refunded: undefined }));
    expect(result.refundedAmount).toBe(0);
  });

  it('throws when payment_intent is missing', () => {
    expect(() =>
      parseRefundCharge(makeCharge({ payment_intent: null }))
    ).toThrow(/payment_intent/);
  });

  it('throws when payment_intent is undefined', () => {
    expect(() =>
      parseRefundCharge(makeCharge({ payment_intent: undefined }))
    ).toThrow(/payment_intent/);
  });
});

// ---------------------------------------------------------------------------
// sold_count clamping
// ---------------------------------------------------------------------------

describe('clampSoldCount', () => {
  it('subtracts normally: current=10, returning=3 → 7', () => {
    expect(clampSoldCount(10, 3)).toBe(7);
  });

  it('clamps to 0 when returning exceeds current: current=2, returning=5 → 0', () => {
    expect(clampSoldCount(2, 5)).toBe(0);
  });

  it('returns 0 when both are 0', () => {
    expect(clampSoldCount(0, 0)).toBe(0);
  });

  it('returns current when returning 0 tickets', () => {
    expect(clampSoldCount(50, 0)).toBe(50);
  });

  it('returns 0 when current is 0 and returning any', () => {
    expect(clampSoldCount(0, 3)).toBe(0);
  });
});
