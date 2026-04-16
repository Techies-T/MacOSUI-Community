# VPSセキュリティ ベストプラクティスガイド

さくらのVPSをはじめとするIaaS（ベアメタル・VPS）環境を安全に運用するための必須セキュリティ設定をまとめています。
ステージング環境であっても、インターネットに公開されている限りボットからの自動攻撃を受けます。最低限以下の対策を実施してください。

---

## 1. コントロールパネルの「パケットフィルター」設定（最重要）
さくらのVPSには、サーバーOS内（UFW）のファイアウォールとは別に、**インフラ側のネットワークレイヤーで通信を遮断するパケットフィルター機能**があります。
管理画面から以下のように設定し、不要なポートを開かないようにします。

- **許可するポート**:
  - `TCP 22` (SSH: 接続元のIPを社内などの固定IPに絞れればさらに強固です)
  - `TCP 80` (HTTP: NGINX / Certbot用)
  - `TCP 443` (HTTPS: 暗号化通信用)
- 上記以外は「すべて拒否（Drop）」とする。

## 2. OSファイアウォール（UFW）の有効化
Ubuntuであれば標準で `ufw` コマンドが用意されています。パケットフィルターとあわせてOS側でも二重に防御します。

```bash
# UFWを有効化する前に、自分が締め出されないようにSSH(22)を許可する
sudo ufw allow 22/tcp

# NGINX用のWebポートを許可する
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# デフォルト ルールの徹底（外からの接続は拒否、中からの接続は許可）
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 有効化（Yを聞かれるので y を入力）
sudo ufw enable

# 状態を確認
sudo ufw status
```

## 3. SSHの堅牢化（rootログインとパスワード認証の無効化）
世界中のボットが `root` ユーザーと「よくあるパスワード」の組み合わせでSSHログインを試行してきます。これを防ぎます。

1. **SSHキー（公開鍵認証）でのみログインできる状態であることを確認**します。
2. その後、SSH設定ファイルを開きます。
   ```bash
   sudo nano /etc/ssh/sshd_config
   ```
3. 以下の項目を探し、無ければ追記、あれば設定値を変更（コメントアウトされている `#` があれば外す）します。
   ```text
   # rootユーザーでの直接ログインを禁止
   PermitRootLogin no
   
   # パスワード認証を禁止（確実に鍵認証で入れることを確認してから！）
   PasswordAuthentication no
   ```
4. SSHサービスを再起動して設定を適用します。
   ```bash
   sudo systemctl restart sshd
   ```

## 4. 自動セキュリティパッチの設定 (Unattended-Upgrades)
Ubuntu環境で深刻なセキュリティの脆弱性が発見された際、自動でセキュリティアップデートのみを適用する仕組みです。

```bash
# パッケージのインストール
sudo apt-get install -y unattended-upgrades update-notifier-common

# 自動更新を有効にするための設定画面を開く（画面が出たら Yes を選択）
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

## 5. 悪意のあるボットの自動遮断 (Fail2Ban)
パスワード総当たり（ブルートフォースアタック）などを検知して、攻撃者のIPアドレスを一定時間自動的にブロックするツールです。

```bash
# インストール（インストールするだけでデフォルトでSSHへの攻撃保護が有効になります）
sudo apt update
sudo apt install -y fail2ban

# 有効化と起動
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

### デプロイ前のチェックリスト
- [ ] パケットフィルター（さくらのVPS管理画面）で `22, 80, 443` 以外を遮断したか
- [ ] サーバー内で `sudo ufw status` が `active` になっているか
- [ ] `root` ユーザーでのログインが禁止されているか
- [ ] （可能であれば）SSHのポート番号をデフォルトの22から別番号（例: 50022）に変更したか
