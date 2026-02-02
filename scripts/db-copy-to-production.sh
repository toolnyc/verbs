#!/bin/bash
set -e

# Postgres tools (Homebrew path, adjust if needed)
PG_DUMP="${PG_DUMP:-/opt/homebrew/opt/postgresql@15/bin/pg_dump}"
PSQL="${PSQL:-/opt/homebrew/opt/postgresql@15/bin/psql}"

# Database connection strings - set these environment variables before running
# Get from: Supabase Dashboard > Project Settings > Database > Connection string (URI)
PREVIEW_DB_URL="${PREVIEW_DB_URL:?Set PREVIEW_DB_URL env var}"
PRODUCTION_DB_URL="${PRODUCTION_DB_URL:?Set PRODUCTION_DB_URL env var}"

# Tables to copy (order matters for foreign key constraints)
# djs first (no deps), events (refs nothing), event_djs (refs both), site_content (no deps)
TABLES="djs events event_djs site_content"

DUMP_FILE="supabase/dump-$(date +%Y%m%d-%H%M%S).sql"

echo "=== Dumping preview database ==="
echo "Tables: $TABLES"
$PG_DUMP "$PREVIEW_DB_URL" \
  --data-only \
  --disable-triggers \
  --no-owner \
  --no-privileges \
  -t public.djs \
  -t public.events \
  -t public.event_djs \
  -t public.site_content \
  > "$DUMP_FILE"

echo "Dump saved to: $DUMP_FILE"
echo ""
echo "=== WARNING: About to overwrite production data ==="
echo "Tables: $TABLES"
read -p "Type 'yes' to continue: " confirm
if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

echo "=== Truncating production tables (in FK order) ==="
$PSQL "$PRODUCTION_DB_URL" -c "
  TRUNCATE event_djs, events, djs, site_content CASCADE;
"

echo "=== Restoring to production ==="
$PSQL "$PRODUCTION_DB_URL" < "$DUMP_FILE"

echo "=== Verifying row counts ==="
for table in $TABLES; do
  echo -n "$table: "
  $PSQL "$PRODUCTION_DB_URL" -t -c "SELECT COUNT(*) FROM $table;"
done

echo "=== Done ==="
