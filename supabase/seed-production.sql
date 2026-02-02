-- VERBS Production Seed Data
-- Run this AFTER applying migrations to production database
--
-- Usage: supabase db push && psql $DATABASE_URL -f supabase/seed-production.sql
-- Or run via Supabase Dashboard > SQL Editor

-- ============================================
-- DJs (add real DJ info - these are reusable across events)
-- ============================================
-- TODO: Add your actual DJs with their social links
INSERT INTO djs (id, name, instagram_url, soundcloud_url) VALUES
  -- Past event DJs (fill in social links if available)
  ('d0010000-0000-0000-0000-000000000001', 'DJ Name 1', NULL, NULL),
  ('d0020000-0000-0000-0000-000000000002', 'DJ Name 2', NULL, NULL),
  ('d0030000-0000-0000-0000-000000000003', 'DJ Name 3', NULL, NULL),
  ('d0040000-0000-0000-0000-000000000004', 'DJ Name 4', NULL, NULL),
  ('d0050000-0000-0000-0000-000000000005', 'DJ Name 5', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Past Events (archived)
-- ============================================
-- TODO: Fill in actual dates, venues, and image URLs for each past event

-- JAM (oldest)
INSERT INTO events (id, title, description, date, time_end, timezone, venue_name, venue_address, venue_link, image_url, flyer_url, hover_color, status) VALUES
  ('e0010000-0000-0000-0000-000000000001',
   'JAM',
   'Each VERBS event focuses on a unique verb, transforming unconventional spaces into an intimate dance floor. 21+ only. No phones on the dance floor.',
   '2024-01-01 23:00:00-05',  -- TODO: Replace with actual date
   '2024-01-02 05:00:00-05',  -- TODO: Replace with actual end time
   'America/New_York',
   'Secret Location',         -- TODO: Replace with actual venue
   'Miami',
   NULL,
   NULL,                       -- TODO: Add image_url if available
   NULL,                       -- TODO: Add flyer_url if available
   NULL,                       -- TODO: Add hover_color (e.g., '#f20519')
   'archived')
ON CONFLICT (id) DO NOTHING;

-- RESET
INSERT INTO events (id, title, description, date, time_end, timezone, venue_name, venue_address, venue_link, image_url, flyer_url, hover_color, status) VALUES
  ('e0020000-0000-0000-0000-000000000002',
   'RESET',
   'Each VERBS event focuses on a unique verb, transforming unconventional spaces into an intimate dance floor. 21+ only. No phones on the dance floor.',
   '2024-03-01 23:00:00-05',  -- TODO: Replace with actual date
   '2024-03-02 05:00:00-05',
   'America/New_York',
   'Secret Location',
   'Miami',
   NULL,
   NULL,
   NULL,
   NULL,
   'archived')
ON CONFLICT (id) DO NOTHING;

-- PLAY
INSERT INTO events (id, title, description, date, time_end, timezone, venue_name, venue_address, venue_link, image_url, flyer_url, hover_color, status) VALUES
  ('e0030000-0000-0000-0000-000000000003',
   'PLAY',
   'Each VERBS event focuses on a unique verb, transforming unconventional spaces into an intimate dance floor. 21+ only. No phones on the dance floor.',
   '2024-06-01 23:00:00-04',  -- TODO: Replace with actual date
   '2024-06-02 05:00:00-04',
   'America/New_York',
   'Secret Location',
   'Miami',
   NULL,
   NULL,
   NULL,
   NULL,
   'archived')
ON CONFLICT (id) DO NOTHING;

-- VIBRATE
INSERT INTO events (id, title, description, date, time_end, timezone, venue_name, venue_address, venue_link, image_url, flyer_url, hover_color, status) VALUES
  ('e0040000-0000-0000-0000-000000000004',
   'VIBRATE',
   'Each VERBS event focuses on a unique verb, transforming unconventional spaces into an intimate dance floor. 21+ only. No phones on the dance floor.',
   '2024-09-01 23:00:00-04',  -- TODO: Replace with actual date
   '2024-09-02 05:00:00-04',
   'America/New_York',
   'Secret Location',
   'Miami',
   NULL,
   NULL,
   NULL,
   NULL,
   'archived')
ON CONFLICT (id) DO NOTHING;

-- PRESENT (most recent past event)
INSERT INTO events (id, title, description, date, time_end, timezone, venue_name, venue_address, venue_link, image_url, flyer_url, hover_color, status) VALUES
  ('e0050000-0000-0000-0000-000000000005',
   'PRESENT',
   'Each VERBS event focuses on a unique verb, transforming unconventional spaces into an intimate dance floor. 21+ only. No phones on the dance floor.',
   '2024-12-01 23:00:00-05',  -- TODO: Replace with actual date
   '2024-12-02 05:00:00-05',
   'America/New_York',
   'Secret Location',
   'Miami',
   NULL,
   NULL,
   NULL,
   NULL,
   'archived')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Event DJs (lineups for past events)
-- ============================================
-- TODO: Add actual DJ assignments for each event
-- Example: Link DJs to events with optional time slots

-- JAM lineup
-- INSERT INTO event_djs (event_id, dj_id, slot_start, slot_end, sort_order) VALUES
--   ('e0010000-0000-0000-0000-000000000001', 'd0010000-0000-0000-0000-000000000001', '23:00', '01:00', 1),
--   ('e0010000-0000-0000-0000-000000000001', 'd0020000-0000-0000-0000-000000000002', '01:00', '03:00', 2);

-- ============================================
-- Site Content (house rules & legal pages)
-- ============================================
-- This is the actual production content - already correct
INSERT INTO site_content (content_key, title, content, content_group, sort_order) VALUES
  ('house_rules_photography', 'Photography', '<ul><li>Be present — please keep phone use off the dance floor. A sticker will be placed on your phone cameras upon entry.</li><li>No professional cameras.</li><li>Please respect this policy as you''ll be respecting the space and people around you.</li><li>This policy is required for entry.</li></ul>', 'house_rules', 1),
  ('house_rules_entry', 'Entry Requirements', '<ul><li>Minimum age for entry is 21.</li><li>Outside food and alcohol is prohibited.</li><li>You will be searched at the door. If you do not agree, you will be denied entry.</li></ul>', 'house_rules', 2),
  ('house_rules_safety', 'Safety & Conduct', '<ul><li>Safety, well-being, and inclusivity is a priority. We have a zero-tolerance policy towards aggression, discrimination, harassment, or any form of violence. This means no racism, queer-phobia, bullying, sexual misconduct, anti-semitism, etc.</li><li>Open use of, possession or trade of illegal substances is prohibited and will result in immediate removal.</li><li>Possession or trade of weapons is prohibited.</li><li>Report any concerns to our security or members behind the bar.</li></ul>', 'house_rules', 3),
  ('house_rules_liability', 'Liability', '<ul><li>VERBS is not responsible for lost or stolen goods. If you lost something, email gio@verbs-mia.com after the event.</li><li>VERBS does not bear responsibility for any injury or medical issues suffered onsite. If necessary, we will call first responders. Any expenses incurred will be the responsibility of the individual.</li></ul>', 'house_rules', 4),
  ('legal_privacy', 'Privacy Policy', '<p>Last updated: January 2025</p><h3>Information We Collect</h3><p>We collect information you provide when purchasing tickets, subscribing to our newsletter, or contacting us. This may include your name, email address, and payment information.</p><h3>How We Use Your Information</h3><p>We use your information to process ticket purchases, send event updates and newsletters (with your consent), and improve our services.</p><h3>Data Sharing</h3><p>We do not sell your personal information. We may share data with service providers (payment processors, email services) necessary to operate our platform.</p><h3>Contact</h3><p>For privacy inquiries, contact us at gio@verbs-mia.com</p>', 'legal', 1),
  ('legal_terms', 'Terms of Service', '<h3>Ticket Purchases</h3><p>All ticket sales are final. Refunds may be issued at our discretion in case of event cancellation.</p><h3>Event Entry</h3><p>Entry to events is subject to our house rules. We reserve the right to refuse entry or remove attendees who violate these rules.</p><h3>Newsletter</h3><p>By subscribing to our newsletter, you consent to receive promotional emails. You can unsubscribe at any time.</p><h3>Changes</h3><p>We may update these terms at any time. Continued use of our services constitutes acceptance of updated terms.</p>', 'legal', 2)
ON CONFLICT (content_key) DO NOTHING;

-- ============================================
-- NOTE: The following are NOT seeded for production:
-- - ticket_tiers (create via admin UI with Stripe integration)
-- - orders (transactional data)
-- - mixes (create via admin UI)
-- - newsletter_subscribers (transactional data)
-- - newsletter_campaigns (create via admin UI)
-- ============================================
