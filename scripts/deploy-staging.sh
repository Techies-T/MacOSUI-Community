#!/usr/bin/env bash
# ==============================================================================
# Built-in Quality Automated Deployment Script for Staging (Sakura VPS)
# ==============================================================================
set -e

echo "🔒 [Step 1/4] Node.js Package Security Check (npm audit)..."
npm audit --audit-level=critical

echo "🐳 [Step 2/4] Docker Scout Container Vulnerability Scan..."
docker build --no-cache -t macosui-staging-test .
docker scout cves macosui-staging-test --exit-code --only-severity critical

echo "🚀 [Step 3/4] Pushing to Staging Branch..."
git push origin staging

echo "⏳ [Step 4/4] Verifying Remote Container Recreation & Health Check..."
sleep 45
TARGET_HOST="${STAGING_HOST_IP:-YOUR_SERVER_IP}"
ssh -i "${SSH_KEY_PATH:-~/.ssh/id_ed25519_vps}" -o StrictHostKeyChecking=no "debian@${TARGET_HOST}" "docker ps"
curl -s "https://${STAGING_DOMAIN:-macosui-staging.techiespod.co.jp}/api/health"
echo ""
echo "✅ [SUCCESS] Deployment pipeline completed successfully with verified security checks!"
