-- Make venue_name optional (nullable)
ALTER TABLE events ALTER COLUMN venue_name DROP NOT NULL;
