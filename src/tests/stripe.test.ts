import { describe, it, expect } from 'vitest';
import {
  validateQuantity,
  validateTierActive,
  validateTierType,
  validateStock,
  validateStripeConfig,
  type TicketTier,
} from '../lib/validation';
import {
  calculateRefundStatus,
  calculateTicketsToReturn,
} from '../lib/refund';

// ---------------------------------------------------------------------------
// Helper — build a default tier, override specific fields
// ---------------------------------------------------------------------------

function makeTier(overrides: Partial<TicketTier> = {}): TicketTier {
  return {
    id: '1',
    name: 'General',
    tier_type: 'online',
    price: 25,
    stripe_price_id: 'price_123',
    max_stock: 100,
    sold_count: 10,
    is_active: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Checkout Validation
// ---------------------------------------------------------------------------

describe('Checkout Validation', () => {
  describe('validateQuantity', () => {
    it('accepts quantity of 1', () => {
      expect(validateQuantity(1)).toEqual({ valid: true });
    });

    it('accepts quantity of 10', () => {
      expect(validateQuantity(10)).toEqual({ valid: true });
    });

    it('accepts quantity of 5', () => {
      expect(validateQuantity(5)).toEqual({ valid: true });
    });

    it('rejects quantity of 0', () => {
      expect(validateQuantity(0)).toEqual({
        valid: false,
        error: 'Quantity must be between 1 and 10',
      });
    });

    it('rejects quantity of 11', () => {
      expect(validateQuantity(11)).toEqual({
        valid: false,
        error: 'Quantity must be between 1 and 10',
      });
    });

    it('rejects negative quantity', () => {
      expect(validateQuantity(-1)).toEqual({
        valid: false,
        error: 'Quantity must be between 1 and 10',
      });
    });
  });

  describe('validateTierActive', () => {
    it('accepts active tier', () => {
      expect(validateTierActive(makeTier())).toEqual({ valid: true });
    });

    it('rejects inactive tier', () => {
      expect(validateTierActive(makeTier({ is_active: false }))).toEqual({
        valid: false,
        error: 'This ticket tier is not available',
      });
    });
  });

  describe('validateTierType', () => {
    it('accepts online tier', () => {
      expect(validateTierType(makeTier())).toEqual({ valid: true });
    });

    it('rejects door tier', () => {
      expect(
        validateTierType(makeTier({ tier_type: 'door', stripe_price_id: null, max_stock: null, sold_count: 0 }))
      ).toEqual({
        valid: false,
        error: 'This ticket is only available at the door',
      });
    });
  });

  describe('validateStock', () => {
    it('accepts when stock is available', () => {
      expect(validateStock(makeTier({ sold_count: 90 }), 5)).toEqual({ valid: true });
    });

    it('accepts when stock is unlimited (max_stock is null)', () => {
      expect(validateStock(makeTier({ max_stock: null, sold_count: 1000 }), 10)).toEqual({
        valid: true,
      });
    });

    it('rejects when sold out', () => {
      expect(validateStock(makeTier({ sold_count: 100 }), 1)).toEqual({
        valid: false,
        error: 'This ticket tier is sold out',
      });
    });

    it('rejects when not enough stock', () => {
      expect(validateStock(makeTier({ sold_count: 97 }), 5)).toEqual({
        valid: false,
        error: 'Only 3 tickets remaining',
      });
    });

    // --- Stock boundary tests ---

    it('accepts buying exactly the remaining stock', () => {
      expect(validateStock(makeTier({ max_stock: 100, sold_count: 95 }), 5)).toEqual({
        valid: true,
      });
    });

    it('rejects buying one more than remaining stock', () => {
      expect(validateStock(makeTier({ max_stock: 100, sold_count: 96 }), 5)).toEqual({
        valid: false,
        error: 'Only 4 tickets remaining',
      });
    });

    it('rejects immediately when max_stock=0', () => {
      expect(validateStock(makeTier({ max_stock: 0, sold_count: 0 }), 1)).toEqual({
        valid: false,
        error: 'This ticket tier is sold out',
      });
    });

    it('reports sold out (not crash) when sold_count > max_stock', () => {
      expect(validateStock(makeTier({ max_stock: 100, sold_count: 105 }), 1)).toEqual({
        valid: false,
        error: 'This ticket tier is sold out',
      });
    });
  });

  describe('validateStripeConfig', () => {
    it('accepts tier with stripe_price_id', () => {
      expect(validateStripeConfig(makeTier())).toEqual({ valid: true });
    });

    it('rejects tier without stripe_price_id', () => {
      expect(validateStripeConfig(makeTier({ stripe_price_id: null }))).toEqual({
        valid: false,
        error: 'Ticket not configured for online purchase',
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Refund Calculations
// ---------------------------------------------------------------------------

describe('Refund Calculations', () => {
  describe('calculateRefundStatus', () => {
    it('returns refunded for full refund', () => {
      expect(calculateRefundStatus(100, 100)).toBe('refunded');
    });

    it('returns refunded when refund exceeds original', () => {
      expect(calculateRefundStatus(110, 100)).toBe('refunded');
    });

    it('returns partially_refunded for partial refund', () => {
      expect(calculateRefundStatus(50, 100)).toBe('partially_refunded');
    });

    it('returns partially_refunded for small refund', () => {
      expect(calculateRefundStatus(1, 100)).toBe('partially_refunded');
    });
  });

  describe('calculateTicketsToReturn', () => {
    it('returns all tickets for full refund', () => {
      expect(calculateTicketsToReturn(100, 100, 4, true)).toBe(4);
    });

    it('returns proportional tickets for partial refund', () => {
      expect(calculateTicketsToReturn(50, 100, 4, false)).toBe(2);
    });

    it('floors partial ticket returns', () => {
      expect(calculateTicketsToReturn(33, 100, 4, false)).toBe(1);
    });

    it('returns 0 for tiny refunds', () => {
      expect(calculateTicketsToReturn(5, 100, 4, false)).toBe(0);
    });

    // --- Real-money edge cases ---

    it('3 tickets at $13.99: refund $13.99 → 1 ticket', () => {
      // 13.99 / 41.97 * 3 = 1.0 exactly in IEEE 754
      expect(calculateTicketsToReturn(13.99, 41.97, 3, false)).toBe(1);
    });

    it('2 tickets at $27.50: refund $27.50 → 1 ticket', () => {
      expect(calculateTicketsToReturn(27.50, 55.00, 2, false)).toBe(1);
    });

    it('repeating decimal: $33.33 of $99.99 for 3 tickets → 1', () => {
      // 33.33 / 99.99 * 3 = 1.0 exactly in IEEE 754
      expect(calculateTicketsToReturn(33.33, 99.99, 3, false)).toBe(1);
    });

    it('floating point that actually rounds down: $10 of $30.01 for 3 tickets', () => {
      // 10 / 30.01 * 3 = 0.9996... → floor = 0
      expect(calculateTicketsToReturn(10, 30.01, 3, false)).toBe(0);
    });

    it('full refund at $41.97 returns all 3 tickets', () => {
      expect(calculateTicketsToReturn(41.97, 41.97, 3, true)).toBe(3);
    });

    it('documents sequential refund over-decrement behavior', () => {
      // Stripe's amount_refunded is cumulative. Each webhook recalculates
      // from scratch — no memory of previous returns.
      // First refund: $13.99 of $41.97 → 1 ticket
      // Second refund: $27.98 of $41.97 (cumulative) → 2 tickets
      // But the first webhook already returned 1, so net effect is
      // decrementing sold_count by 1 + 2 = 3 total (all tickets),
      // even though only $27.98 of $41.97 was refunded.
      const firstRefund = calculateTicketsToReturn(13.99, 41.97, 3, false);
      const secondRefund = calculateTicketsToReturn(27.98, 41.97, 3, false);

      expect(firstRefund).toBe(1);
      expect(secondRefund).toBe(2);
    });
  });
});
