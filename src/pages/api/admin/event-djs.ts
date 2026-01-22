import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
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

    const body = await request.json();
    const { event_id, dj_id, new_dj_name, slot_start, slot_end } = body;

    if (!event_id) {
      return new Response(
        JSON.stringify({ error: 'Missing event_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!dj_id && !new_dj_name) {
      return new Response(
        JSON.stringify({ error: 'Must provide either dj_id or new_dj_name' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let targetDjId = dj_id;
    let newDj = null;

    // Create new DJ if specified
    if (new_dj_name) {
      const { data: createdDj, error: djError } = await supabaseAdmin
        .from('djs')
        .insert({ name: new_dj_name })
        .select()
        .single();

      if (djError) {
        return new Response(
          JSON.stringify({ error: djError.message }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      targetDjId = createdDj.id;
      newDj = createdDj;
    }

    // Get current count for sort order
    const { count } = await supabaseAdmin
      .from('event_djs')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event_id);

    // Add DJ to event
    const { data: eventDj, error: insertError } = await supabaseAdmin
      .from('event_djs')
      .insert({
        event_id,
        dj_id: targetDjId,
        slot_start: slot_start || null,
        slot_end: slot_end || null,
        sort_order: count || 0,
      })
      .select('*, dj:djs(*)')
      .single();

    if (insertError) {
      // Check for unique constraint violation
      if (insertError.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'DJ is already in the lineup' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        eventDj,
        newDj, // Include if a new DJ was created
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error adding DJ:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
