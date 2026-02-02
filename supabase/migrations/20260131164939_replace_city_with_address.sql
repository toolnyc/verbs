-- Replace venue_city with venue_address
-- venue_address is optional (nullable) and more flexible than city

-- Add venue_address column
ALTER TABLE events ADD COLUMN venue_address TEXT;

-- Copy existing city data to address (preserve existing data)
UPDATE events SET venue_address = venue_city WHERE venue_city IS NOT NULL;

-- Drop venue_city column
ALTER TABLE events DROP COLUMN venue_city;
