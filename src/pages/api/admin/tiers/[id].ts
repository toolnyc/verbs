import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../../lib/supabase';
import { updatePrice, updateProductName } from '../../../../lib/stripe';

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  try {
    // Check authentication
    const accessToken = cookies.get('sb-access-token')?.value;
    if (!accessToken || !supabaseAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tierId = params.id;
    if (!tierId) {
      return new Response(
        JSON.stringify({ error: 'Missing tier ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { name, price, max_stock } = body;

    // Fetch current tier
    const { data: currentTier, error: fetchError } = await supabaseAdmin
      .from('ticket_tiers')
      .select('*, event:events!ticket_tiers_event_id_fkey(title)')
      .eq('id', tierId)
      .single();

    if (fetchError || !currentTier) {
      return new Response(
        JSON.stringify({ error: 'Tier not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build update object with only provided fields
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (price !== undefined) updates.price = parseFloat(price);
    if (max_stock !== undefined) updates.max_stock = max_stock === '' || max_stock === null ? null : parseInt(max_stock);

    if (Object.keys(updates).length === 0) {
      return new Response(
        JSON.stringify({ success: true, tier: currentTier }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update database
    const { data: updatedTier, error: updateError } = await supabaseAdmin
      .from('ticket_tiers')
      .update(updates)
      .eq('id', tierId)
      .select()
      .single();

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stripeErrors: string[] = [];

    // Sync name change to Stripe if product exists
    if (name !== undefined && name !== currentTier.name && currentTier.stripe_product_id) {
      try {
        await updateProductName({
          productId: currentTier.stripe_product_id,
          eventTitle: currentTier.event?.title || 'Event',
          tierName: name,
        });
      } catch (stripeErr: any) {
        stripeErrors.push(`Name sync: ${stripeErr.message}`);
      }
    }

    // Sync price change to Stripe if price exists
    const newPrice = parseFloat(price);
    if (price !== undefined && newPrice !== currentTier.price && currentTier.stripe_product_id && currentTier.stripe_price_id) {
      try {
        const newPriceId = await updatePrice({
          productId: currentTier.stripe_product_id,
          oldPriceId: currentTier.stripe_price_id,
          newPrice: newPrice,
          eventId: currentTier.event_id,
          tierId: tierId,
        });

        // Update the tier with new price ID
        await supabaseAdmin
          .from('ticket_tiers')
          .update({ stripe_price_id: newPriceId })
          .eq('id', tierId);
      } catch (stripeErr: any) {
        stripeErrors.push(`Price sync: ${stripeErr.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        tier: updatedTier,
        stripeErrors: stripeErrors.length > 0 ? stripeErrors : undefined,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error updating tier:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
