-- VERBS Event Ticketing - Database Schema
-- Run this in your Supabase SQL Editor

-- Enums
CREATE TYPE event_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE ticket_tier_type AS ENUM ('online', 'door');
CREATE TYPE order_status AS ENUM ('completed', 'refunded', 'partially_refunded');
CREATE TYPE mix_status AS ENUM ('draft', 'published');
CREATE TYPE campaign_status AS ENUM ('draft', 'sending', 'sent');

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  time_end TIMESTAMPTZ,
  venue_name TEXT NOT NULL,
  venue_city TEXT NOT NULL,
  venue_link TEXT,
  image_url TEXT,
  status event_status DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ticket Tiers (multiple per event)
CREATE TABLE ticket_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tier_type ticket_tier_type DEFAULT 'online',
  price NUMERIC NOT NULL,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  max_stock INT,
  sold_count INT DEFAULT 0,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- DJs (reusable across events)
CREATE TABLE djs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  instagram_url TEXT,
  soundcloud_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Event-DJ junction (many-to-many)
CREATE TABLE event_djs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  dj_id UUID REFERENCES djs(id) ON DELETE CASCADE,
  slot_start TIME,
  slot_end TIME,
  sort_order INT DEFAULT 0,
  UNIQUE(event_id, dj_id)
);

-- Orders (ticket purchases)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  ticket_tier_id UUID REFERENCES ticket_tiers(id),
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent_id TEXT,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  quantity INT NOT NULL,
  amount_paid NUMERIC NOT NULL,
  status order_status DEFAULT 'completed',
  refunded_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Mixes
CREATE TABLE mixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  cover_image_url TEXT,
  duration_seconds INT,
  status mix_status DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Newsletter Subscribers
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  source TEXT,
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ,
  unsubscribe_token TEXT UNIQUE DEFAULT gen_random_uuid()
);

-- Newsletter Campaigns
CREATE TABLE newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  status campaign_status DEFAULT 'draft',
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_ticket_tiers_event ON ticket_tiers(event_id);
CREATE INDEX idx_orders_event ON orders(event_id);
CREATE INDEX idx_orders_session ON orders(stripe_session_id);
CREATE INDEX idx_orders_payment_intent ON orders(stripe_payment_intent_id);
CREATE INDEX idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX idx_newsletter_subscribers_token ON newsletter_subscribers(unsubscribe_token);

-- Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE djs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_djs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE mixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_campaigns ENABLE ROW LEVEL SECURITY;

-- Events: public read for published
CREATE POLICY "Public can view published events"
  ON events FOR SELECT
  USING (status = 'published');

CREATE POLICY "Authenticated users have full access to events"
  ON events FOR ALL
  USING (auth.role() = 'authenticated');

-- Ticket tiers: public read for active tiers of published events
CREATE POLICY "Public can view active tiers of published events"
  ON ticket_tiers FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM events
      WHERE events.id = ticket_tiers.event_id
      AND events.status = 'published'
    )
  );

CREATE POLICY "Authenticated users have full access to ticket_tiers"
  ON ticket_tiers FOR ALL
  USING (auth.role() = 'authenticated');

-- DJs: public read
CREATE POLICY "Public can view DJs"
  ON djs FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users have full access to DJs"
  ON djs FOR ALL
  USING (auth.role() = 'authenticated');

-- Event DJs: public read
CREATE POLICY "Public can view event DJs"
  ON event_djs FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users have full access to event_djs"
  ON event_djs FOR ALL
  USING (auth.role() = 'authenticated');

-- Orders: no public access
CREATE POLICY "Authenticated users have full access to orders"
  ON orders FOR ALL
  USING (auth.role() = 'authenticated');

-- Service role bypass for webhooks
CREATE POLICY "Service role can manage orders"
  ON orders FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Mixes: public read for published
CREATE POLICY "Public can view published mixes"
  ON mixes FOR SELECT
  USING (status = 'published');

CREATE POLICY "Authenticated users have full access to mixes"
  ON mixes FOR ALL
  USING (auth.role() = 'authenticated');

-- Newsletter subscribers: no public access
CREATE POLICY "Authenticated users have full access to newsletter_subscribers"
  ON newsletter_subscribers FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage subscribers"
  ON newsletter_subscribers FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Newsletter campaigns: no public access
CREATE POLICY "Authenticated users have full access to newsletter_campaigns"
  ON newsletter_campaigns FOR ALL
  USING (auth.role() = 'authenticated');

-- Helper function to increment sold count (optional, used by webhook)
CREATE OR REPLACE FUNCTION increment_sold_count(tier_id UUID, qty INT)
RETURNS void AS $$
BEGIN
  UPDATE ticket_tiers
  SET sold_count = sold_count + qty
  WHERE id = tier_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
