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

# Create a 2GB swap file to prevent Out-Of-Memory (OOM) during Docker build on t4g.micro
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab

# Clone the repository
mkdir -p /opt/macosui
git clone https://github.com/Techies-T/MacOSUI-oss.git /opt/macosui/repo
cd /opt/macosui/repo

# Start the application using the local docker-compose.yml which builds from source
mkdir -p data

# Create an initial empty database file to ensure correct permissions
touch data/database.sqlite
chmod 666 data/database.sqlite

# Build and start the application
/usr/local/bin/docker-compose up -d --build
