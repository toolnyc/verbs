import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../../lib/supabase';

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

    const eventDjId = params.id;
    if (!eventDjId) {
      return new Response(
        JSON.stringify({ error: 'Missing event_dj ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { slot_start, slot_end } = body;

    // Build update object
    const updates: Record<string, any> = {};
    if (slot_start !== undefined) updates.slot_start = slot_start || null;
    if (slot_end !== undefined) updates.slot_end = slot_end || null;

    if (Object.keys(updates).length === 0) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update database
    const { data: updatedEventDj, error: updateError } = await supabaseAdmin
      .from('event_djs')
      .update(updates)
      .eq('id', eventDjId)
      .select('*, dj:djs(*)')
      .single();

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        eventDj: updatedEventDj,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error updating event DJ:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
