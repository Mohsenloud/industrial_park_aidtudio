#!/bin/bash

# ==============================================================================
# PostgreSQL Automated Backup Script
# This script creates a database dump and keeps the last 7 days of backups.
# ==============================================================================

# Directory to store backups on your Linux server
BACKUP_DIR="/var/backups/industrial_park_db"

# Generate a timestamp for the backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/db_backup_${TIMESTAMP}.sql"

# Create the backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting backup of PostgreSQL database..."

# Use DATABASE_URL if available, otherwise default to a standard connection string
# To use this locally, you can export DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
PG_CONN_STR="${DATABASE_URL:-postgresql://industrial_admin:super_secret_password@localhost:5432/industrial_park}"

# Run the pg_dump command (ensure postgresql-client is installed on your server)
pg_dump "$PG_CONN_STR" > "$BACKUP_FILE"

# Check if the backup was successful
if [ $? -eq 0 ]; then
    echo "✅ Backup successful: $BACKUP_FILE"
    
    # Optional: Compress the backup to save space
    gzip "$BACKUP_FILE"
    echo "📦 Compressed to: ${BACKUP_FILE}.gz"

    # Delete backups older than 7 days
    find "$BACKUP_DIR" -type f -name "db_backup_*.sql.gz" -mtime +7 -exec rm {} \;
    echo "🧹 Cleaned up backups older than 7 days."
else
    echo "❌ Backup failed!"
    # If the file is empty or failed, remove it
    rm -f "$BACKUP_FILE"
fi
