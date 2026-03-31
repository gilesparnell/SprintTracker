#!/usr/bin/env bash
set -euo pipefail

DB_NAME="sprint-tracker"
LOCAL_DB="data/tracker.db"
BACKUP_DIR="data/backups"

echo "==> Snapshotting production DB: $DB_NAME"

# Create backup of existing local DB if it exists and has data
if [ -s "$LOCAL_DB" ]; then
  mkdir -p "$BACKUP_DIR"
  backup_file="$BACKUP_DIR/tracker-$(date +%Y%m%d-%H%M%S).db"
  cp "$LOCAL_DB" "$backup_file"
  echo "    Backed up existing local DB to $backup_file"
fi

# Dump production and pipe into a fresh local DB
echo "==> Dumping production data..."
rm -f "$LOCAL_DB" "$LOCAL_DB-wal" "$LOCAL_DB-shm"

turso db shell "$DB_NAME" ".dump" | sqlite3 "$LOCAL_DB"

# Verify
row_count=$(sqlite3 "$LOCAL_DB" "SELECT COUNT(*) FROM tasks;" 2>/dev/null || echo "0")
echo "==> Done. Local DB has $row_count tasks."
echo "    Run 'npm run dev' to use local data."
