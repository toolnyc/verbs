import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import { addToResendAudience, sendWelcomeEmail } from '../../../lib/resend';

// Simple in-memory rate limiting (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // max requests
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour in ms

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function getNextUpcomingEvent() {
  if (!supabaseAdmin) return null;

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('title, date, timezone, venue_name, venue_city')
    .eq('status', 'published')
    .gte('date', new Date().toISOString())
    .order('date', { ascending: true })
    .limit(1)
    .single();

  if (!event) return null;

  return {
    title: event.title,
    date: new Date(event.date),
    timezone: event.timezone || 'America/New_York',
    venueName: event.venue_name,
    venueCity: event.venue_city,
  };
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    if (!supabaseAdmin) {
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit check
    const ip = clientAddress || request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { email, source = 'website' } = body;

    // Validate email
    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Please enter a valid email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if already subscribed
    const { data: existing } = await supabaseAdmin
      .from('newsletter_subscribers')
      .select('id, unsubscribed_at, unsubscribe_token')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      // If previously unsubscribed, resubscribe
      if (existing.unsubscribed_at) {
        await supabaseAdmin
          .from('newsletter_subscribers')
          .update({
            unsubscribed_at: null,
            subscribed_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        // Sync with Resend audience
        try {
          await addToResendAudience(email.toLowerCase());
        } catch (err) {
          console.warn('Failed to add to Resend audience:', err);
        }

        // Send welcome email
        try {
          const upcomingEvent = await getNextUpcomingEvent();
          await sendWelcomeEmail({
            to: email.toLowerCase(),
            unsubscribeToken: existing.unsubscribe_token,
            upcomingEvent,
          });
        } catch (err) {
          console.warn('Failed to send welcome email:', err);
        }

        return new Response(
          JSON.stringify({ message: 'Welcome back! You\'ve been resubscribed.' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ message: 'You\'re already subscribed!' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Insert new subscriber
    const { data: newSubscriber, error: insertError } = await supabaseAdmin
      .from('newsletter_subscribers')
      .insert({
        email: email.toLowerCase(),
        source,
      })
      .select('unsubscribe_token')
      .single();

    if (insertError || !newSubscriber) {
      console.error('Error inserting subscriber:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to subscribe. Please try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Sync with Resend audience
    try {
      await addToResendAudience(email.toLowerCase());
    } catch (err) {
      console.warn('Failed to add to Resend audience:', err);
    }

    // Send welcome email
    try {
      const upcomingEvent = await getNextUpcomingEvent();
      await sendWelcomeEmail({
        to: email.toLowerCase(),
        unsubscribeToken: newSubscriber.unsubscribe_token,
        upcomingEvent,
      });
    } catch (err) {
      console.warn('Failed to send welcome email:', err);
    }

    return new Response(
      JSON.stringify({ message: 'Successfully subscribed!' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
