ALTER TABLE events ADD COLUMN door_tier_id UUID REFERENCES ticket_tiers(id) ON DELETE SET NULL;
COMMENT ON COLUMN events.door_tier_id IS 'Specific tier to use for door sales checkout';
