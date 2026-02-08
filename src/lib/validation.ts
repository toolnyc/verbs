/**
 * Pre-purchase validation functions extracted from checkout API routes.
 * Pure logic — no DB calls, no side effects.
 */

export interface TicketTier {
  id: string;
  name: string;
  tier_type: 'online' | 'door';
  price: number;
  stripe_price_id: string | null;
  max_stock: number | null;
  sold_count: number;
  is_active: boolean;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateQuantity(quantity: number): ValidationResult {
  if (quantity < 1 || quantity > 10) {
    return { valid: false, error: 'Quantity must be between 1 and 10' };
  }
  return { valid: true };
}

export function validateTierActive(tier: TicketTier): ValidationResult {
  if (!tier.is_active) {
    return { valid: false, error: 'This ticket tier is not available' };
  }
  return { valid: true };
}

export function validateTierType(tier: TicketTier): ValidationResult {
  if (tier.tier_type === 'door') {
    return { valid: false, error: 'This ticket is only available at the door' };
  }
  return { valid: true };
}

export function validateStock(tier: TicketTier, quantity: number): ValidationResult {
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

export function validateStripeConfig(tier: TicketTier): ValidationResult {
  if (!tier.stripe_price_id) {
    return { valid: false, error: 'Ticket not configured for online purchase' };
  }
  return { valid: true };
}
