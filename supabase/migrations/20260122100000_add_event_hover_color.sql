-- Add hover_color column to events for custom hover effect colors
ALTER TABLE events ADD COLUMN hover_color VARCHAR(7) DEFAULT NULL;

-- Comment for clarity
COMMENT ON COLUMN events.hover_color IS 'Hex color code for custom hover effect (e.g. #f20519)';
