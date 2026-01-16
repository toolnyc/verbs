import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing PUBLIC_SUPABASE_URL environment variable');
}

// Public client - uses anon key, respects RLS
export const supabase = createClient(supabaseUrl, supabaseAnonKey || '');

// Admin client - uses service key, bypasses RLS
// Only use server-side!
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Database types
export interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time_end: string | null;
  timezone: string;
  venue_name: string;
  venue_city: string;
  venue_link: string | null;
  image_url: string | null;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface TicketTier {
  id: string;
  event_id: string;
  name: string;
  tier_type: 'online' | 'door';
  price: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  max_stock: number | null;
  sold_count: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface DJ {
  id: string;
  name: string;
  instagram_url: string | null;
  soundcloud_url: string | null;
  created_at: string;
}

export interface EventDJ {
  id: string;
  event_id: string;
  dj_id: string;
  slot_start: string | null;
  slot_end: string | null;
  sort_order: number;
  dj?: DJ;
}

export interface Order {
  id: string;
  event_id: string;
  ticket_tier_id: string;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  customer_email: string;
  customer_name: string | null;
  quantity: number;
  amount_paid: number;
  status: 'completed' | 'refunded' | 'partially_refunded';
  refunded_amount: number;
  created_at: string;
}

export interface Mix {
  id: string;
  title: string;
  description: string | null;
  audio_url: string;
  cover_image_url: string | null;
  duration_seconds: number | null;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  source: string | null;
  subscribed_at: string;
  unsubscribed_at: string | null;
  unsubscribe_token: string;
}

export interface NewsletterCampaign {
  id: string;
  subject: string;
  html_content: string;
  status: 'draft' | 'sending' | 'sent';
  sent_count: number;
  failed_count: number;
  sent_at: string | null;
  created_at: string;
}

// Helper to get event with ticket tiers and DJs
export async function getEventWithDetails(eventId: string) {
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (eventError) return { event: null, tiers: [], djs: [] };

  const { data: tiers } = await supabase
    .from('ticket_tiers')
    .select('*')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .order('sort_order');

  const { data: eventDjs } = await supabase
    .from('event_djs')
    .select('*, dj:djs(*)')
    .eq('event_id', eventId)
    .order('sort_order');

  // Map event DJs to include slot times
  const djsWithSlots = eventDjs?.map(ed => ({
    ...ed.dj,
    slot_start: ed.slot_start,
    slot_end: ed.slot_end,
  })).filter(Boolean) || [];

  return {
    event,
    tiers: tiers || [],
    djs: djsWithSlots,
  };
}

// Get all published events ordered by date
export async function getPublishedEvents() {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      ticket_tiers (*)
    `)
    .eq('status', 'published')
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }

  return data || [];
}

// Get all events (published and draft) for homepage verb grid
export async function getAllEvents() {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      ticket_tiers (*)
    `)
    .in('status', ['published', 'draft'])
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }

  return data || [];
}

// Get published mixes
export async function getPublishedMixes() {
  const { data, error } = await supabase
    .from('mixes')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching mixes:', error);
    return [];
  }

  return data || [];
}
