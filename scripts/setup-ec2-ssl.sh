#!/bin/bash
# setup-ec2-ssl.sh
# Usage: ./setup-ec2-ssl.sh <DOMAIN> <HOSTED_ZONE_ID> <EMAIL>

DOMAIN=$1
HOSTED_ZONE_ID=$2
EMAIL=$3

if [ -z "$DOMAIN" ] || [ -z "$HOSTED_ZONE_ID" ] || [ -z "$EMAIL" ]; then
    echo "Usage: $0 <DOMAIN> <HOSTED_ZONE_ID> <EMAIL>"
    exit 1
fi

echo "Starting setup for $DOMAIN..."

# 1. Install Docker and AWS CLI (if not present)
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    if [ -n "$SUDO_USER" ]; then
        usermod -aG docker $SUDO_USER
    fi
fi

if ! command -v aws &> /dev/null; then
    echo "Installing AWS CLI..."
    apt-get update && apt-get install -y unzip
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    ./aws/install
fi

# 2. Get Public IP
IP=$(curl -s https://checkip.amazonaws.com)
echo "Public IP detected: $IP"

# 3. Update Route 53 A Record
echo "Updating Route 53 record for $DOMAIN to $IP..."
cat <<EOF > route53-change.json
{
  "Comment": "Update A record for MacOSUI setup",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "$DOMAIN",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{ "Value": "$IP" }]
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --change-batch file://route53-change.json

# 4. Prepare directories
mkdir -p certbot/conf certbot/www

# 5. Run Certbot for initial certificate (DNS-01 challenge)
echo "Requesting Let's Encrypt certificate via Route 53..."
docker run --rm \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/certbot/www:/var/lib/letsencrypt" \
    certbot/dns-route53 certonly \
    --dns-route53 \
    --email "$EMAIL" \
    --agree-tos --no-eff-email \
    -d "$DOMAIN" \
    --non-interactive

# 6. Start MacOSUI
echo "Starting MacOSUI containers..."
export DOMAIN_NAME=$DOMAIN
docker compose up -d --build

echo "Setup complete. Access MacOSUI at https://$DOMAIN"
