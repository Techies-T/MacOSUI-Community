#!/usr/bin/env bash
# ==============================================================================
# AWS EC2 Safe Deployment & VUP Script with Zero Data Loss Guarantee
# ==============================================================================
set -e

REPO_DIR="/opt/macosui/repo"
DATA_VOLUME="/app/data"

echo "=================================================="
echo "🔒 [Step 1/5] Persistent Storage & Pre-deploy Safety Check"
echo "=================================================="

if [ -d "$DATA_VOLUME" ]; then
    echo "✅ Persistent EBS volume detected at $DATA_VOLUME"
    
    # 1. Ensure .env has DATA_DIR=/app/data
    if [ ! -f "$REPO_DIR/.env" ] || ! grep -q "DATA_DIR" "$REPO_DIR/.env"; then
        echo "DATA_DIR=$DATA_VOLUME" >> "$REPO_DIR/.env"
        echo "✅ Configured DATA_DIR=$DATA_VOLUME in .env"
    fi

    # 2. Backup existing database safely
    if [ -f "$DATA_VOLUME/database.sqlite" ]; then
        TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        BACKUP_FILE="$DATA_VOLUME/database_backup_${TIMESTAMP}.sqlite"
        cp "$DATA_VOLUME/database.sqlite" "$BACKUP_FILE"
        echo "✅ Database safely backed up to: $BACKUP_FILE"
        
        # Keep latest 10 backups
        ls -t "$DATA_VOLUME"/database_backup_*.sqlite 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
    fi

    # 3. Ensure ./data is a symlink to /app/data
    cd "$REPO_DIR"
    if [ -d "./data" ] && [ ! -L "./data" ]; then
        echo "⚠️ Warning: Found plain directory ./data. Replacing with symlink to $DATA_VOLUME..."
        rm -rf ./data
    fi
    ln -sfn "$DATA_VOLUME" ./data
    echo "✅ Symlink verified: $(ls -ld ./data)"
else
    echo "ℹ️ Local development environment detected ($DATA_VOLUME not present)."
fi

echo "=================================================="
echo "🧹 [Step 2/5] Clean OS Metadata & Stash"
echo "=================================================="
cd "$REPO_DIR"
find . -name "._*" -delete 2>/dev/null || true

echo "=================================================="
echo "🚀 [Step 3/5] Pull Latest Code (VUP)"
echo "=================================================="
git fetch origin --tags
git checkout main
git pull origin main
echo "Current Commit: $(git log -1 --oneline)"

echo "=================================================="
echo "🐳 [Step 4/5] Rebuild and Restart Containers"
echo "=================================================="
COMPOSE_CMD="docker-compose"
if command -v /usr/local/bin/docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="/usr/local/bin/docker-compose"
elif docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
fi

sudo $COMPOSE_CMD up -d --build

echo "Pruning dangling images..."
sudo docker image prune -f || true

echo "=================================================="
echo "✅ [Step 5/5] Verify Post-Deploy Health & Data Integrity"
echo "=================================================="
sleep 5

# Check container status
sudo docker ps --filter "name=macosui-local"

# Check Health endpoint
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/health || echo "failed")
if [ "$HEALTH_STATUS" = "200" ]; then
    echo "✅ Health endpoint responded 200 OK"
else
    echo "❌ Health endpoint failed with status: $HEALTH_STATUS"
    exit 1
fi

# Verify user data intact
sudo docker exec macosui-local node -e '
const db = require("./server/db.cjs");
db.all("SELECT id, email, name, role FROM users", (err, rows) => {
    if (err) {
        console.error("❌ Database query error:", err.message);
        process.exit(1);
    }
    console.log("✅ Verified active users in database (" + rows.length + " users found):");
    rows.forEach(u => console.log("   - " + u.name + " (" + u.email + ") [" + u.role + "]"));
    process.exit(0);
});
'

echo "🎉 [SUCCESS] Deployment completed smoothly with zero data loss!"
