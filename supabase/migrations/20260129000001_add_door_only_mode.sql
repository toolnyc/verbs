-- Add door_only_mode field to events table
ALTER TABLE events ADD COLUMN door_only_mode BOOLEAN DEFAULT false;

-- Comment explaining the field
COMMENT ON COLUMN events.door_only_mode IS 'When enabled, shows QR code for simplified mobile door checkout';
