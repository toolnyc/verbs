-- Update existing OpenStreetMap links to Google Maps
UPDATE events
SET venue_link = REPLACE(
  venue_link,
  'https://www.openstreetmap.org/search?query=',
  'https://www.google.com/maps/search/?api=1&query='
)
WHERE venue_link LIKE 'https://www.openstreetmap.org/%';
