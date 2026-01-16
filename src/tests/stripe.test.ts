import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock validation functions extracted from checkout logic
// These would typically be imported from a shared module

interface TicketTier {
  id: string;
  name: string;
  tier_type: 'online' | 'door';
  price: number;
  stripe_price_id: string | null;
  max_stock: number | null;
  sold_count: number;
  is_active: boolean;
}

// Validation functions (extracted from checkout.ts logic)
function validateQuantity(quantity: number): { valid: boolean; error?: string } {
  if (quantity < 1 || quantity > 10) {
    return { valid: false, error: 'Quantity must be between 1 and 10' };
  }
  return { valid: true };
}

function validateTierActive(tier: TicketTier): { valid: boolean; error?: string } {
  if (!tier.is_active) {
    return { valid: false, error: 'This ticket tier is not available' };
  }
  return { valid: true };
}

function validateTierType(tier: TicketTier): { valid: boolean; error?: string } {
  if (tier.tier_type === 'door') {
    return { valid: false, error: 'This ticket is only available at the door' };
  }
  return { valid: true };
}

function validateStock(tier: TicketTier, quantity: number): { valid: boolean; error?: string } {
  if (tier.max_stock !== null) {
    const available = tier.max_stock - tier.sold_count;
    if (available < quantity) {
      if (available <= 0) {
        return { valid: false, error: 'This ticket tier is sold out' };
      }
      return { valid: false, error: `Only ${available} tickets remaining` };
    }
  }
  return { valid: true };
}

function validateStripeConfig(tier: TicketTier): { valid: boolean; error?: string } {
  if (!tier.stripe_price_id) {
    return { valid: false, error: 'Ticket not configured for online purchase' };
  }
  return { valid: true };
}

// Refund calculation logic (from stripe-webhook.ts)
function calculateRefundStatus(
  refundedAmount: number,
  originalAmount: number
): 'refunded' | 'partially_refunded' {
  return refundedAmount >= originalAmount ? 'refunded' : 'partially_refunded';
}

function calculateTicketsToReturn(
  refundedAmount: number,
  originalAmount: number,
  originalQuantity: number,
  isFullRefund: boolean
): number {
  if (isFullRefund) {
    return originalQuantity;
  }
  return Math.floor((refundedAmount / originalAmount) * originalQuantity);
}

// Tests
describe('Checkout Validation', () => {
  describe('validateQuantity', () => {
    it('should accept quantity of 1', () => {
      expect(validateQuantity(1)).toEqual({ valid: true });
    });

    it('should accept quantity of 10', () => {
      expect(validateQuantity(10)).toEqual({ valid: true });
    });

    it('should accept quantity of 5', () => {
      expect(validateQuantity(5)).toEqual({ valid: true });
    });

    it('should reject quantity of 0', () => {
      expect(validateQuantity(0)).toEqual({
        valid: false,
        error: 'Quantity must be between 1 and 10',
      });
    });

    it('should reject quantity of 11', () => {
      expect(validateQuantity(11)).toEqual({
        valid: false,
        error: 'Quantity must be between 1 and 10',
      });
    });

    it('should reject negative quantity', () => {
      expect(validateQuantity(-1)).toEqual({
        valid: false,
        error: 'Quantity must be between 1 and 10',
      });
    });
  });

  describe('validateTierActive', () => {
    it('should accept active tier', () => {
      const tier: TicketTier = {
        id: '1',
        name: 'General',
        tier_type: 'online',
        price: 25,
        stripe_price_id: 'price_123',
        max_stock: 100,
        sold_count: 10,
        is_active: true,
      };
      expect(validateTierActive(tier)).toEqual({ valid: true });
    });

    it('should reject inactive tier', () => {
      const tier: TicketTier = {
        id: '1',
        name: 'General',
        tier_type: 'online',
        price: 25,
        stripe_price_id: 'price_123',
        max_stock: 100,
        sold_count: 10,
        is_active: false,
      };
      expect(validateTierActive(tier)).toEqual({
        valid: false,
        error: 'This ticket tier is not available',
      });
    });
  });

  describe('validateTierType', () => {
    it('should accept online tier', () => {
      const tier: TicketTier = {
        id: '1',
        name: 'General',
        tier_type: 'online',
        price: 25,
        stripe_price_id: 'price_123',
        max_stock: 100,
        sold_count: 10,
        is_active: true,
      };
      expect(validateTierType(tier)).toEqual({ valid: true });
    });

    it('should reject door tier', () => {
      const tier: TicketTier = {
        id: '1',
        name: 'Door',
        tier_type: 'door',
        price: 30,
        stripe_price_id: null,
        max_stock: null,
        sold_count: 0,
        is_active: true,
      };
      expect(validateTierType(tier)).toEqual({
        valid: false,
        error: 'This ticket is only available at the door',
      });
    });
  });

  describe('validateStock', () => {
    it('should accept when stock is available', () => {
      const tier: TicketTier = {
        id: '1',
        name: 'General',
        tier_type: 'online',
        price: 25,
        stripe_price_id: 'price_123',
        max_stock: 100,
        sold_count: 90,
        is_active: true,
      };
      expect(validateStock(tier, 5)).toEqual({ valid: true });
    });

    it('should accept when stock is unlimited (max_stock is null)', () => {
      const tier: TicketTier = {
        id: '1',
        name: 'General',
        tier_type: 'online',
        price: 25,
        stripe_price_id: 'price_123',
        max_stock: null,
        sold_count: 1000,
        is_active: true,
      };
      expect(validateStock(tier, 10)).toEqual({ valid: true });
    });

    it('should reject when sold out', () => {
      const tier: TicketTier = {
        id: '1',
        name: 'General',
        tier_type: 'online',
        price: 25,
        stripe_price_id: 'price_123',
        max_stock: 100,
        sold_count: 100,
        is_active: true,
      };
      expect(validateStock(tier, 1)).toEqual({
        valid: false,
        error: 'This ticket tier is sold out',
      });
    });

    it('should reject when not enough stock', () => {
      const tier: TicketTier = {
        id: '1',
        name: 'General',
        tier_type: 'online',
        price: 25,
        stripe_price_id: 'price_123',
        max_stock: 100,
        sold_count: 97,
        is_active: true,
      };
      expect(validateStock(tier, 5)).toEqual({
        valid: false,
        error: 'Only 3 tickets remaining',
      });
    });
  });

  describe('validateStripeConfig', () => {
    it('should accept tier with stripe_price_id', () => {
      const tier: TicketTier = {
        id: '1',
        name: 'General',
        tier_type: 'online',
        price: 25,
        stripe_price_id: 'price_123',
        max_stock: 100,
        sold_count: 10,
        is_active: true,
      };
      expect(validateStripeConfig(tier)).toEqual({ valid: true });
    });

    it('should reject tier without stripe_price_id', () => {
      const tier: TicketTier = {
        id: '1',
        name: 'General',
        tier_type: 'online',
        price: 25,
        stripe_price_id: null,
        max_stock: 100,
        sold_count: 10,
        is_active: true,
      };
      expect(validateStripeConfig(tier)).toEqual({
        valid: false,
        error: 'Ticket not configured for online purchase',
      });
    });
  });
});

describe('Refund Calculations', () => {
  describe('calculateRefundStatus', () => {
    it('should return refunded for full refund', () => {
      expect(calculateRefundStatus(100, 100)).toBe('refunded');
    });

    it('should return refunded when refund exceeds original (edge case)', () => {
      expect(calculateRefundStatus(110, 100)).toBe('refunded');
    });

    it('should return partially_refunded for partial refund', () => {
      expect(calculateRefundStatus(50, 100)).toBe('partially_refunded');
    });

    it('should return partially_refunded for small refund', () => {
      expect(calculateRefundStatus(1, 100)).toBe('partially_refunded');
    });
  });

  describe('calculateTicketsToReturn', () => {
    it('should return all tickets for full refund', () => {
      expect(calculateTicketsToReturn(100, 100, 4, true)).toBe(4);
    });

    it('should return proportional tickets for partial refund', () => {
      // 50% refund of 4 tickets = 2 tickets
      expect(calculateTicketsToReturn(50, 100, 4, false)).toBe(2);
    });

    it('should floor partial ticket returns', () => {
      // 33% refund of 4 tickets = 1.32 -> 1 ticket
      expect(calculateTicketsToReturn(33, 100, 4, false)).toBe(1);
    });

    it('should return 0 for tiny refunds', () => {
      // 5% refund of 4 tickets = 0.2 -> 0 tickets
      expect(calculateTicketsToReturn(5, 100, 4, false)).toBe(0);
    });
  });
});
