# さくらのVPS ステージング環境 構築・デプロイ手順書

今回構築した「完全HTTPS対応（Docker Compose + NGINX）」のシステムを、さくらのVPSにデプロイしてステージング/デモ環境を動かすための手順です。

## 1. さくらのVPSの契約・サーバー作成
デモ用途であれば、最も安価なプラン（メモリ1GB または 2GB）で十分稼働します。

- **OSの選択**: `Ubuntu 24.04 (または 22.04 / 20.04)` を強くおすすめします。Dockerのインストールなどの情報が圧倒的に多いためです。
- **管理用パスワードの設定**: パスワード認証、または「公開鍵（SSHキー）」を設定してサーバーを作成します。

作成後、コントロールパネルで「サーバーのIPアドレス（例: `198.51.100.23`）」を確認します。

## 2. DNSの Aレコード設定（重要）
証明書の取得と同等に重要です。取得したサーバーのIPアドレスに対し、ご契約のドメイン管理画面（Route53等）で **Aレコード** を設定します。

- レコード名: `macosui-stage` （あるいはそのまま `xxx` など）
- レコードタイプ: `A`
- 値（IPアドレス）: `さくらのVPSのIPアドレス`

## 3. サーバーへの接続とDockerの導入
ご自身のMacのターミナルから、さくらのVPSにSSH接続します。

```bash
# Macのターミナルで実行
ssh ubuntu@<さくらのVPSのIPアドレス>
```

サーバーに入れたら、以下のコマンドを順番にコピペして「Docker」と「Docker Compose」をインストールします。

```bash
# パッケージの更新
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Docker公式のGPGキーを追加
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# リポジトリを追加
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker本体のインストール
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# sudoなしでdockerを実行できるようにする（実行後、一度ログアウトして再接続してください）
sudo usermod -aG docker $USER
```

## 4. プロジェクトのソースコードを配置
サーバー上でソースコードを配置します。開発中のレポジトリがGithubのプライベートリポジトリ等の場合、VPS上で `git clone` するのが最も簡単です。

```bash
# （VPSサーバー上で実行）
git clone <皆さんのGithubリポジトリURL>
cd MacOSUI
```

## 5. ステージング用の環境変数の設定
プロジェクトのルートディレクトリに、ステージング専用の `.env.stage` を作成します。

```bash
# （VPSサーバー上で実行）
nano .env.stage
```
以下を記述して保存します。
```env
DOMAIN_NAME=macosui-stage.techiespod.co.jp
# 他に必要な環境変数があればここに追記
```

## 6. Let's Encrypt証明書の取得
ローカル環境と同じ手順です！！

```bash
# （VPSサーバー上で実行）
./scripts/get-letsencrypt.sh
```
プロンプトが表示されたら、指定された TXT レコード (`_acme-challenge.macosui-stage.techiespod.co.jp`) をDNS管理画面で設定し、Enterを押して証明書を発行します。

## 7. コンテナの起動！
最後に、ローカルと全く同じコマンド（ただし読み込むenvファイルを変えるだけ）で起動します。

```bash
# （VPSサーバー上で実行）
docker compose --env-file .env.stage up -d --build
```

これで、さくらのVPS上で完全なステージング環境が稼働します。ブラウザから `https://macosui-stage.techiespod.co.jp` にアクセスし、デモや検証を思う存分行うことができます！
