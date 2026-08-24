#!/bin/bash
# ---------------------------------------------------------
# Let's Encrypt DNS-01 チャレンジ用証明書取得スクリプト
# ---------------------------------------------------------
set -e

# .env や .env.local があれば読み込む
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
elif [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# 引数で渡された場合は優先、なければ環境変数 DOMAIN_NAME を使用
DOMAIN=${1:-${DOMAIN_NAME}}

if [ -z "$DOMAIN" ]; then
  echo "エラー: ドメイン名が指定されていません。"
  echo "使用方法: ./scripts/get-letsencrypt.sh <ドメイン名>"
  echo "または、.env.local に DOMAIN_NAME 変数を設定してください。"
  exit 1
fi

echo "=================================================="
echo "Let's Encrypt 証明書取得 (DNS-01チャレンジ)"
echo "対象ドメイン: ${DOMAIN} および *.${DOMAIN}"
echo "=================================================="
echo "処理中に一時停止し、プロンプトに以下の情報が表示されます:"
echo "「Please deploy a DNS TXT record under the name _acme-challenge...」"
echo ""
echo "表示されたら、ご自身のDNS管理画面にて指定されたTXTレコードを登録し、"
echo "少し待ってから（DNS伝播のため数十秒〜数分）、ターミナル上で Enter を押してください。"
echo "=================================================="
echo ""

# ./certbot ディレクトリを生成してローカルPCに証明書を保存
mkdir -p ./certbot

# Certbot公式コンテナを使って実行
docker run -it --rm --name certbot \
  -v "$(pwd)/certbot:/etc/letsencrypt" \
  certbot/certbot certonly \
  --manual \
  --preferred-challenges dns \
  -d "${DOMAIN}" \
  -d "*.${DOMAIN}" \
  --agree-tos \
  --register-unsafely-without-email

echo ""
echo "=================================================="
echo "🎉 取得完了！"
echo "証明書は以下のディレクトリに保存されました。"
echo "$(pwd)/certbot/live/${DOMAIN}/fullchain.pem"
echo "$(pwd)/certbot/live/${DOMAIN}/privkey.pem"
echo "=================================================="
