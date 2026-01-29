-- Site content table for editable house rules and legal pages
CREATE TABLE site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_group TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policy
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- Public can read
CREATE POLICY "Public can read site content"
  ON site_content FOR SELECT
  USING (true);

-- Authenticated users can manage
CREATE POLICY "Authenticated users can manage site content"
  ON site_content FOR ALL
  USING (auth.role() = 'authenticated');

-- Seed with current hardcoded content
INSERT INTO site_content (content_key, title, content, content_group, sort_order) VALUES
  ('house_rules_photography', 'Photography', '<ul><li>Be present — please keep phone use off the dance floor. A sticker will be placed on your phone cameras upon entry.</li><li>No professional cameras.</li><li>Please respect this policy as you''ll be respecting the space and people around you.</li><li>This policy is required for entry.</li></ul>', 'house_rules', 1),
  ('house_rules_entry', 'Entry Requirements', '<ul><li>Minimum age for entry is 21.</li><li>Outside food and alcohol is prohibited.</li><li>You will be searched at the door. If you do not agree, you will be denied entry.</li></ul>', 'house_rules', 2),
  ('house_rules_safety', 'Safety & Conduct', '<ul><li>Safety, well-being, and inclusivity is a priority. We have a zero-tolerance policy towards aggression, discrimination, harassment, or any form of violence. This means no racism, queer-phobia, bullying, sexual misconduct, anti-semitism, etc.</li><li>Open use of, possession or trade of illegal substances is prohibited and will result in immediate removal.</li><li>Possession or trade of weapons is prohibited.</li><li>Report any concerns to our security or members behind the bar.</li></ul>', 'house_rules', 3),
  ('house_rules_liability', 'Liability', '<ul><li>VERBS is not responsible for lost or stolen goods. If you lost something, email info@verbs-mia.com after the event.</li><li>VERBS does not bear responsibility for any injury or medical issues suffered onsite. If necessary, we will call first responders. Any expenses incurred will be the responsibility of the individual.</li></ul>', 'house_rules', 4),
  ('legal_privacy', 'Privacy Policy', '<p>Last updated: January 2025</p><h3>Information We Collect</h3><p>We collect information you provide when purchasing tickets, subscribing to our newsletter, or contacting us. This may include your name, email address, and payment information.</p><h3>How We Use Your Information</h3><p>We use your information to process ticket purchases, send event updates and newsletters (with your consent), and improve our services.</p><h3>Data Sharing</h3><p>We do not sell your personal information. We may share data with service providers (payment processors, email services) necessary to operate our platform.</p><h3>Contact</h3><p>For privacy inquiries, contact us at info@verbs-mia.com</p>', 'legal', 1),
  ('legal_terms', 'Terms of Service', '<h3>Ticket Purchases</h3><p>All ticket sales are final. Refunds may be issued at our discretion in case of event cancellation.</p><h3>Event Entry</h3><p>Entry to events is subject to our house rules. We reserve the right to refuse entry or remove attendees who violate these rules.</p><h3>Newsletter</h3><p>By subscribing to our newsletter, you consent to receive promotional emails. You can unsubscribe at any time.</p><h3>Changes</h3><p>We may update these terms at any time. Continued use of our services constitutes acceptance of updated terms.</p>', 'legal', 2);
