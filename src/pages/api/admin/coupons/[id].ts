import type { APIRoute } from 'astro';
import { deleteCoupon, deactivatePromotionCode } from '../../../../lib/stripe';

export const DELETE: APIRoute = async ({ params, request }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Missing ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is a promotion code or coupon based on query param
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'coupon';

    if (type === 'promo') {
      await deactivatePromotionCode(id);
    } else {
      await deleteCoupon(id);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Coupon delete error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to delete' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
