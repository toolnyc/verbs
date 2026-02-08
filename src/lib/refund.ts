/**
 * Refund calculation logic extracted from the webhook handler.
 * Pure functions — no DB calls, no side effects.
 */

export function calculateRefundStatus(
  refundedAmount: number,
  originalAmount: number
): 'refunded' | 'partially_refunded' {
  return refundedAmount >= originalAmount ? 'refunded' : 'partially_refunded';
}

export function calculateTicketsToReturn(
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
