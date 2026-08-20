#!/bin/bash
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
set -e

# Update and install dependencies
dnf update -y
dnf install -y docker git

# Start and enable Docker
systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user || true

# Install Docker Buildx plugin and Docker Compose
mkdir -p /usr/libexec/docker/cli-plugins /usr/local/lib/docker/cli-plugins
curl -sSL "https://github.com/docker/buildx/releases/download/v0.21.2/buildx-v0.21.2.linux-amd64" -o /usr/libexec/docker/cli-plugins/docker-buildx
chmod +x /usr/libexec/docker/cli-plugins/docker-buildx
cp /usr/libexec/docker/cli-plugins/docker-buildx /usr/local/lib/docker/cli-plugins/docker-buildx || true

curl -sSL "https://github.com/docker/compose/releases/download/v2.29.2/docker-compose-linux-x86_64" -o /usr/libexec/docker/cli-plugins/docker-compose
chmod +x /usr/libexec/docker/cli-plugins/docker-compose
ln -sf /usr/libexec/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose
ln -sf /usr/libexec/docker/cli-plugins/docker-compose /usr/bin/docker-compose

# Create a 2GB swap file using dd (required for XFS filesystem on Amazon Linux 2023)
if [ ! -f /swapfile ]; then
    dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
fi

# Clone the repository (supports both Public and Private repositories via GitHub Token)
mkdir -p /opt/macosui
if [ -n "${github_token}" ]; then
    git clone "https://${github_token}@${repo_url}" /opt/macosui/repo
else
    git clone "https://${repo_url}" /opt/macosui/repo
fi
cd /opt/macosui/repo

# Start the application using the local docker-compose.yml which builds from source
mkdir -p data
touch data/database.sqlite
chmod 666 data/database.sqlite

# Build and start the application
/usr/local/bin/docker-compose up -d --build
