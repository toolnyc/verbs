-- Add timezone column to events table
ALTER TABLE events
ADD COLUMN timezone TEXT NOT NULL DEFAULT 'America/New_York';

-- Add comment for clarity
COMMENT ON COLUMN events.timezone IS 'IANA timezone identifier (e.g., America/New_York, Europe/London)';
