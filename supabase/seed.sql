-- VERBS Seed Data
-- Based on https://www.verbsaroundthe.world/

-- Clear existing data (in correct order for foreign keys)
TRUNCATE newsletter_campaigns, newsletter_subscribers, orders, event_djs, mixes, djs, ticket_tiers, events CASCADE;

-- ============================================
-- DJs
-- ============================================
INSERT INTO djs (id, name, instagram_url, soundcloud_url) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'Satori', 'https://instagram.com/satori', 'https://soundcloud.com/satori'),
  ('d2000000-0000-0000-0000-000000000002', 'Carlita', 'https://instagram.com/carlitamusic', 'https://soundcloud.com/carlitamusic'),
  ('d3000000-0000-0000-0000-000000000003', 'Parallells', 'https://instagram.com/parallellsmusic', 'https://soundcloud.com/parallells'),
  ('d4000000-0000-0000-0000-000000000004', 'Calussa', 'https://instagram.com/calussa', 'https://soundcloud.com/calussa'),
  ('d5000000-0000-0000-0000-000000000005', 'Maga', 'https://instagram.com/magamusic', 'https://soundcloud.com/magamusic'),
  ('d6000000-0000-0000-0000-000000000006', 'Sainte Vie', 'https://instagram.com/saintevie', 'https://soundcloud.com/saintevie'),
  ('d7000000-0000-0000-0000-000000000007', 'Yulia Niko', 'https://instagram.com/yulianiko', 'https://soundcloud.com/yulianiko'),
  ('d8000000-0000-0000-0000-000000000008', 'Zazou', NULL, 'https://soundcloud.com/zazoumiami');

-- ============================================
-- Events
-- ============================================

-- Upcoming Event: February 7, 2026 (from website)
INSERT INTO events (id, title, description, date, time_end, venue_name, venue_city, venue_link, image_url, status) VALUES
  ('e1000000-0000-0000-0000-000000000001',
   'WANDER',
   'Each VERBS event focuses on a unique verb, transforming unconventional spaces into an intimate dance floor. We book artists who create a surprise & delight experience. 21+ only. No phones on the dance floor.',
   '2026-02-07 23:00:00-05',
   '2026-02-08 05:00:00-05',
   'Secret Location',
   'Miami',
   NULL,
   NULL,
   'published');

-- Past Event: December 2025
INSERT INTO events (id, title, description, date, time_end, venue_name, venue_city, venue_link, image_url, status) VALUES
  ('e2000000-0000-0000-0000-000000000002',
   'DISSOLVE',
   'A night of deep, hypnotic sounds in an unexpected Miami warehouse space. Let go and dissolve into the music.',
   '2025-12-13 23:00:00-05',
   '2025-12-14 05:00:00-05',
   'Warehouse District',
   'Miami',
   NULL,
   NULL,
   'archived');

-- Past Event: October 2025
INSERT INTO events (id, title, description, date, time_end, venue_name, venue_city, venue_link, image_url, status) VALUES
  ('e3000000-0000-0000-0000-000000000003',
   'DRIFT',
   'An evening of organic and melodic house, drifting through sound in an intimate rooftop setting.',
   '2025-10-18 22:00:00-04',
   '2025-10-19 04:00:00-04',
   'Rooftop Wynwood',
   'Miami',
   NULL,
   NULL,
   'archived');

-- Draft Event: March 2026
INSERT INTO events (id, title, description, date, time_end, venue_name, venue_city, venue_link, image_url, status) VALUES
  ('e4000000-0000-0000-0000-000000000004',
   'EMERGE',
   'Spring awakening. Details coming soon.',
   '2026-03-21 23:00:00-04',
   '2026-03-22 05:00:00-04',
   'TBA',
   'Miami',
   NULL,
   NULL,
   'draft');

-- ============================================
-- Ticket Tiers
-- ============================================

-- WANDER (Feb 2026) - upcoming
INSERT INTO ticket_tiers (id, event_id, name, tier_type, price, max_stock, sold_count, sort_order, is_active) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'Early Bird', 'online', 35.00, 50, 50, 1, false),
  ('a2000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'General Admission', 'online', 45.00, 100, 23, 2, true),
  ('a3000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', 'Door', 'door', 55.00, NULL, 0, 3, true);

-- DISSOLVE (Dec 2025) - past
INSERT INTO ticket_tiers (id, event_id, name, tier_type, price, max_stock, sold_count, sort_order, is_active) VALUES
  ('a4000000-0000-0000-0000-000000000004', 'e2000000-0000-0000-0000-000000000002', 'Early Bird', 'online', 30.00, 40, 40, 1, false),
  ('a5000000-0000-0000-0000-000000000005', 'e2000000-0000-0000-0000-000000000002', 'General Admission', 'online', 40.00, 80, 80, 2, false),
  ('a6000000-0000-0000-0000-000000000006', 'e2000000-0000-0000-0000-000000000002', 'Door', 'door', 50.00, NULL, 15, 3, false);

-- DRIFT (Oct 2025) - past
INSERT INTO ticket_tiers (id, event_id, name, tier_type, price, max_stock, sold_count, sort_order, is_active) VALUES
  ('a7000000-0000-0000-0000-000000000007', 'e3000000-0000-0000-0000-000000000003', 'General Admission', 'online', 35.00, 60, 60, 1, false),
  ('a8000000-0000-0000-0000-000000000008', 'e3000000-0000-0000-0000-000000000003', 'Door', 'door', 45.00, NULL, 12, 2, false);

-- EMERGE (Mar 2026) - draft
INSERT INTO ticket_tiers (id, event_id, name, tier_type, price, max_stock, sold_count, sort_order, is_active) VALUES
  ('a9000000-0000-0000-0000-000000000009', 'e4000000-0000-0000-0000-000000000004', 'Early Bird', 'online', 35.00, 50, 0, 1, false),
  ('aa000000-0000-0000-0000-000000000010', 'e4000000-0000-0000-0000-000000000004', 'General Admission', 'online', 45.00, 100, 0, 2, false);

-- ============================================
-- Event DJs (lineups)
-- ============================================

-- WANDER lineup
INSERT INTO event_djs (event_id, dj_id, slot_start, slot_end, sort_order) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', '23:00', '01:00', 1),
  ('e1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000002', '01:00', '03:00', 2),
  ('e1000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000003', '03:00', '05:00', 3);

-- DISSOLVE lineup
INSERT INTO event_djs (event_id, dj_id, slot_start, slot_end, sort_order) VALUES
  ('e2000000-0000-0000-0000-000000000002', 'd4000000-0000-0000-0000-000000000004', '23:00', '01:00', 1),
  ('e2000000-0000-0000-0000-000000000002', 'd5000000-0000-0000-0000-000000000005', '01:00', '03:00', 2),
  ('e2000000-0000-0000-0000-000000000002', 'd6000000-0000-0000-0000-000000000006', '03:00', '05:00', 3);

-- DRIFT lineup
INSERT INTO event_djs (event_id, dj_id, slot_start, slot_end, sort_order) VALUES
  ('e3000000-0000-0000-0000-000000000003', 'd7000000-0000-0000-0000-000000000007', '22:00', '00:00', 1),
  ('e3000000-0000-0000-0000-000000000003', 'd8000000-0000-0000-0000-000000000008', '00:00', '02:00', 2),
  ('e3000000-0000-0000-0000-000000000003', 'd4000000-0000-0000-0000-000000000004', '02:00', '04:00', 3);

-- ============================================
-- Mixes
-- ============================================
INSERT INTO mixes (id, title, description, audio_url, cover_image_url, duration_seconds, status) VALUES
  ('b1000000-0000-0000-0000-000000000001',
   'VERBS Vol. 1 - Opening Hours',
   'A selection of warm-up tracks that set the tone for a VERBS night. Deep, hypnotic, and inviting.',
   'https://example.com/mixes/verbs-vol-1.mp3',
   NULL,
   3600,
   'published'),
  ('b2000000-0000-0000-0000-000000000002',
   'VERBS Vol. 2 - Peak Time',
   'The heart of the night. Driving rhythms and melodic journeys.',
   'https://example.com/mixes/verbs-vol-2.mp3',
   NULL,
   4200,
   'published'),
  ('b3000000-0000-0000-0000-000000000003',
   'VERBS Vol. 3 - After Hours',
   'When the sun starts to rise. Ethereal and transcendent.',
   'https://example.com/mixes/verbs-vol-3.mp3',
   NULL,
   3900,
   'draft');

-- ============================================
-- Sample Orders (for past events)
-- ============================================
INSERT INTO orders (id, event_id, ticket_tier_id, stripe_session_id, stripe_payment_intent_id, customer_email, customer_name, quantity, amount_paid, status) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000002', 'a4000000-0000-0000-0000-000000000004', 'cs_test_sample001', 'pi_test_sample001', 'dancer1@example.com', 'Alex Rivera', 2, 60.00, 'completed'),
  ('c2000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000002', 'a5000000-0000-0000-0000-000000000005', 'cs_test_sample002', 'pi_test_sample002', 'nightowl@example.com', 'Jordan Chen', 1, 40.00, 'completed'),
  ('c3000000-0000-0000-0000-000000000003', 'e3000000-0000-0000-0000-000000000003', 'a7000000-0000-0000-0000-000000000007', 'cs_test_sample003', 'pi_test_sample003', 'housemusic@example.com', 'Sam Taylor', 4, 140.00, 'completed'),
  ('c4000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'cs_test_sample004', 'pi_test_sample004', 'miami.vibes@example.com', 'Chris Morgan', 2, 90.00, 'completed');

-- ============================================
-- Newsletter Subscribers
-- ============================================
INSERT INTO newsletter_subscribers (id, email, source, subscribed_at) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'fan1@example.com', 'website', '2025-09-15 10:30:00-04'),
  ('f2000000-0000-0000-0000-000000000002', 'fan2@example.com', 'event_signup', '2025-10-18 23:45:00-04'),
  ('f3000000-0000-0000-0000-000000000003', 'fan3@example.com', 'website', '2025-11-02 14:20:00-04'),
  ('f4000000-0000-0000-0000-000000000004', 'fan4@example.com', 'instagram', '2025-12-01 09:15:00-05'),
  ('f5000000-0000-0000-0000-000000000005', 'fan5@example.com', 'event_signup', '2025-12-13 22:30:00-05');

-- ============================================
-- Newsletter Campaigns
-- ============================================
INSERT INTO newsletter_campaigns (id, subject, html_content, status, sent_count, sent_at) VALUES
  ('ca000000-0000-0000-0000-000000000001',
   'WANDER - February 7th',
   '<h1>WANDER</h1><p>Our next journey begins February 7th, 2026. Early bird tickets available now.</p><p>21+ | No phones on the dance floor | Miami</p>',
   'sent',
   5,
   '2026-01-10 12:00:00-05');
