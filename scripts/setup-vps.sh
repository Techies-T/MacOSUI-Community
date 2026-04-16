#!/bin/bash
set -e

echo "============================================="
echo "さくらのVPS (Debian) 自動セットアップを開始します"
echo "============================================="

# 1. パッケージ更新と必須ツールのインストール
echo "--> aptパッケージの更新と必須ツールのインストール"
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg ufw git

# 2. Dockerのインストール
echo "--> Dockerのインストール"
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -y -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 3. ユーザーをdockerグループに追加
sudo usermod -aG docker $USER

# 4. UFWファイアウォールの設定
echo "--> UFW(ファイアウォール)の設定"
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw --force enable

echo "============================================="
echo "初期セットアップが完了しました！！"
echo "============================================="
