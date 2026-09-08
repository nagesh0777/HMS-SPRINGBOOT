#!/usr/bin/env bash
# ==============================================================================
# Trikaar Production - Unified Multi-Database & Media Backup Script
# Backs up:
#   1. trikaar-db (MySQL: trikaar_emr)
#   2. doculearn-db (PostgreSQL: doculearn)
#   3. trikaar-website-db (PostgreSQL: trikaar_db)
#   4. HMS uploads volume (photos, QR codes, logos)
# ==============================================================================

set -uo pipefail

BACKUP_DIR="/root/backups"
LOG_FILE="$BACKUP_DIR/backup.log"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Starting Nightly Backup ($TIMESTAMP) ==="

# 1. Back up HMS MySQL
if docker ps --format '{{.Names}}' | grep -q '^trikaar-db$'; then
    log "Dumping MySQL: trikaar_emr..."
    MYSQL_FILE="$BACKUP_DIR/hms_mysql_${TIMESTAMP}.sql.gz"
    if docker exec trikaar-db mysqldump -uroot -p'Tr1kaar@DB#2026' --routines --triggers trikaar_emr 2>/dev/null | gzip > "$MYSQL_FILE"; then
        if gzip -t "$MYSQL_FILE" 2>/dev/null; then
            log "SUCCESS: MySQL trikaar_emr ($(du -h "$MYSQL_FILE" | cut -f1))"
        else
            log "ERROR: MySQL backup file corrupted!"
        fi
    else
        log "ERROR: mysqldump command failed for trikaar_emr"
    fi
else
    log "SKIP: trikaar-db container is not running"
fi

# 2. Back up DocuLearn PostgreSQL
if docker ps --format '{{.Names}}' | grep -q '^doculearn-db$'; then
    log "Dumping PostgreSQL: doculearn..."
    DOCU_FILE="$BACKUP_DIR/doculearn_pg_${TIMESTAMP}.sql.gz"
    if docker exec -e PGPASSWORD='qfyjim2iihOUwDu977O7i08aHADJYHcJ' doculearn-db pg_dump -U doculearn doculearn 2>/dev/null | gzip > "$DOCU_FILE"; then
        if gzip -t "$DOCU_FILE" 2>/dev/null; then
            log "SUCCESS: Postgres doculearn ($(du -h "$DOCU_FILE" | cut -f1))"
        else
            log "ERROR: DocuLearn backup file corrupted!"
        fi
    else
        log "ERROR: pg_dump command failed for doculearn"
    fi
else
    log "SKIP: doculearn-db container is not running"
fi

# 3. Back up Trikaar Website PostgreSQL
if docker ps --format '{{.Names}}' | grep -q '^trikaar-website-db$'; then
    log "Dumping PostgreSQL: trikaar_db..."
    WEB_FILE="$BACKUP_DIR/website_pg_${TIMESTAMP}.sql.gz"
    if docker exec -e PGPASSWORD='Tr1k4arWebProd2026Secure' trikaar-website-db pg_dump -U trikaar trikaar_db 2>/dev/null | gzip > "$WEB_FILE"; then
        if gzip -t "$WEB_FILE" 2>/dev/null; then
            log "SUCCESS: Postgres trikaar_db ($(du -h "$WEB_FILE" | cut -f1))"
        else
            log "ERROR: Website DB backup file corrupted!"
        fi
    else
        log "ERROR: pg_dump command failed for trikaar_website"
    fi
else
    log "SKIP: trikaar-website-db container is not running"
fi

# 4. Back up HMS Uploads Volume
UPLOADS_VOL="/var/lib/docker/volumes/hms-springboot_uploads_data/_data"
if [ -d "$UPLOADS_VOL" ]; then
    log "Backing up HMS uploads volume..."
    UPLOADS_TAR="$BACKUP_DIR/hms_uploads_${TIMESTAMP}.tar.gz"
    if tar -czf "$UPLOADS_TAR" -C "$UPLOADS_VOL" . 2>/dev/null; then
        log "SUCCESS: Uploads archive ($(du -h "$UPLOADS_TAR" | cut -f1))"
    else
        log "WARNING: Could not create uploads archive"
    fi
fi

# 5. Prune backups older than 7 days
log "Pruning backups older than 7 days..."
find "$BACKUP_DIR" -type f \( -name "*.sql.gz" -o -name "*.tar.gz" \) -mtime +7 -delete

log "=== Backup Finished Successfully ==="
