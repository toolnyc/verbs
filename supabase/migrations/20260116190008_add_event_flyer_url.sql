-- Add flyer_url field to events table
-- This stores the URL for event flyers used in the "etch" visual effect on the homepage
ALTER TABLE events ADD COLUMN flyer_url TEXT;
