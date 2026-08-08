#!/bin/bash
set -e

# Update and install dependencies
dnf update -y
dnf install -y docker git

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create app directory
mkdir -p /opt/macosui/data
cd /opt/macosui

# Create docker-compose.yml
cat << 'EOF' > docker-compose.yml
version: '3.8'

services:
  web:
    image: ghcr.io/techies-t/macosui-oss:latest
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data
    environment:
      - PORT=8080
      - DB_TYPE=sqlite
    restart: unless-stopped
EOF

# Create an initial empty database file to ensure correct permissions
touch /opt/macosui/data/database.sqlite
chmod 666 /opt/macosui/data/database.sqlite

# Start the application
/usr/local/bin/docker-compose up -d
