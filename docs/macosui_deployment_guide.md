# MacOSUI デプロイメント・運用管理ガイド (v2.0.0)

本ドキュメントは、MacOSUIのコンテナデプロイ、運用管理、データベース（SQLite）の管理、将来のRDBMS（MySQL/PostgreSQL等）への移行ガイド、およびデータモデルの定義についてまとめた運用管理者向けのシステムマニュアルです。

---

## 1. コンテナ構成と GitHub Actions によるデプロイ

MacOSUIは、コンテナ技術（Docker / Docker Compose）を用いて構築されており、GitHub Actions による CI/CD パイプラインを介して自動的にビルドおよびデプロイが行われます。

### ① システム構成 (Docker Compose)
本システムは通常、以下の2コンテナ構成で動作します。
* **`nginx` コンテナ**: 外部からのリクエストを受信し、SSL暗号化（Let's Encrypt / Certbot）を終端した上で、内部のWebコンテナへリバースプロキシします。
* **`web` コンテナ**: Express バックエンドおよび Vite でビルドされた静的フロントエンドをホストします。

### ② GitHub Actions CI/CD フロー
1. 開発者がコードを特定のブランチに `git push` します。
   - `staging` ブランチへのプッシュ ➔ ステージング環境（`macosui.example.com`）へデプロイ。
   - `main` ブランチへのプッシュ ➔ 本番環境へデプロイ。
2. GitHub Actions が起動し、以下の処理を実行します。
   - **ビルド**: Dockerイメージの構築。
   - **パッケージングと保管**: GitHub Container Registry (GHCR) へDockerイメージを自動プッシュ。
   - **プロビジョニング**: SSH経由で対象VPS（さくらVPSなど）へ接続し、最新イメージをプルした上で `docker compose up -d` を実行してコンテナを再起動。

> [!NOTE]
> 自動デプロイを実行するには、GitHub のリポジトリ設定にて以下の Secret が正しく設定されている必要があります。
> * `STAGING_HOST_IP` / `PRODUCTION_HOST_IP`
> * `STAGING_USER` / `PRODUCTION_USER`
> * `STAGING_SSH_PRIVATE_KEY` / `PRODUCTION_SSH_PRIVATE_KEY`
> * `GHCR_PAT` (GitHub Personal Access Token)

---

## 2. データベース構成と SQLite 運用

本システムは、軽量かつサーバーレスで動作する **SQLite** をデフォルトデータベースとして採用しています。

### ① データベースファイルと配置
Expressアプリケーション内の `server/db.cjs` にて、以下のデータベースが初期化されます。
* **アプリケーション用メインDB**: `/app/server/database.sqlite`
  ユーザー情報、チャットメッセージ、ナレッジ、リサーチ履歴、設定などをすべて保持します。
* **ZTA監査ログ用DB**: `/app/server/audit_database.sqlite`
  セキュリティ監査イベント、アクセストリガーログを記録します。

### ② データの永続化
コンテナ再起動時にデータが消失しないよう、ホストマシンのディレクトリをコンテナ内にバインドマウント（Bind Mount）します。
```yaml
# docker-compose.yml の設定例
services:
  web:
    image: ghcr.io/minoru61/macosui-web:latest
    volumes:
      - /home/debian/MacOSUI/server/database.sqlite:/app/server/database.sqlite
      - /home/debian/MacOSUI/server/audit_database.sqlite:/app/server/audit_database.sqlite
```

### ③ SQLite のバックアップ
SQLiteは単一のファイルであるため、運用中のホットバックアップは単純なファイルコピー、または `.backup` コマンドで安全に実行できます。
```bash
# 稼働中のデータベースのバックアップ例
sqlite3 /path/to/database.sqlite ".backup '/path/to/backup/database_$(date +%F).sqlite'"
```

---

## 3. 将来のデータベース移行 (SQLite ➔ MySQL/PostgreSQL) ガイド

将来的に同時接続数の増加や冗長化対応のため、SQLite から MySQL などの外部RDBMSへ移行する際の手順と注意点です。

### ① SQLite に直接依存しているコード
現在、データベース接続およびクエリ実行は、`server/db.cjs` において Node.js の `sqlite3` モジュールを直接呼び出す形でハードコードされています。
```javascript
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(dbPath);
db.run("CREATE TABLE IF NOT EXISTS ... ");
```

### ② MySQL 等への移行ステップ
1. **ORM (Object-Relational Mapping) の導入**:
   SQL方言をコードから排除するため、**Prisma** または **Sequelize** などのORMへの移行を強く推奨します。これにより、コード側の接続ドライバの書き換えだけで MySQL や PostgreSQL へ切り替えられます。
2. **DDLとSQL方言の修正**:
   SQLite 固有の構文を MySQL 互換に書き換えます。
   - `INTEGER PRIMARY KEY AUTOINCREMENT` ➔ `INT AUTO_INCREMENT PRIMARY KEY`
   - `INSERT OR REPLACE` ➔ `INSERT ... ON DUPLICATE KEY UPDATE`
   - `datetime('now', '-10 minutes')` (SQLite関数) ➔ `NOW() - INTERVAL 10 MINUTE` (MySQL関数)
3. **データ移行**:
   既存の SQLite データをダンプし、データ型を調整した上で MySQL に流し込みます。`pgloader` などの移行ツールや、カスタムスクリプトを活用します。

---

## 4. データモデル定義 (主要テーブル構造)

主要なテーブルの定義と役割です。すべての重要なデータは、ZTAの設計に基づき、必要に応じて暗号化または論理隔離（`pod_id`）が施されています。

### ① `users` (ユーザー情報)
ユーザーのアカウント情報と、アシスタント用の個人就業ルールを保持します。
* `id`: ユーザーID (INTEGER, 主キー)
* `google_id`: Google OAuth識別子 (TEXT, ユニーク)
* `email`: メールアドレス (TEXT)
* `name`: 表示名 (TEXT)
* `role`: RBAC権限ロール (`admin`, `researcher`, `user` など)
* `assistant_work_start`: アシスタント就業開始時間 (TEXT, デフォルト '09:00')
* `assistant_work_end`: アシスタント就業終了時間 (TEXT, デフォルト '17:30')
* `assistant_meeting_buffer`: 会議の終了前バッファ分 (INTEGER, デフォルト 30)

### ② `dm_messages` (チャットメッセージ)
ユーザー同士、およびAIアシスタントとのDM履歴を保持します。
* `id`: メッセージID (INTEGER, 主キー)
* `sender_id` / `receiver_id`: 送信者/受信者ユーザーID (INTEGER)
* `sender_type`: 送信者種別 (`user` または `assistant`)
* `text`: 本文 (TEXT)
* `is_read`: 既読フラグ (INTEGER, 0または1)

### ③ `pods` (個人データストア/隔離用空間)
「最小権限の原則」を担保するため、データを論理的に隔離するためのテナント（空間）情報を定義します。
* `id`: Pod ID (TEXT, 主キー)
* `name`: 空間名 (TEXT)

### ④ `knowledge_articles` (ナレッジベース記事)
RAGで活用されるナレッジ記事を保存します。`pod_id` により特定のPod（個人ストア）に紐づけられて隔離されます。
* `id`: 記事ID (INTEGER, 主キー)
* `title`: タイトル (TEXT)
* `content`: 本文 (TEXT)
* `author_id`: 著者ユーザーID (INTEGER, 外国キー)
* `pod_id`: 属するPod ID (TEXT)

### ⑤ `deep_research_workflows` & `deep_research_workflow_definitions` (リサーチ定義と履歴)
AIが自走的に実行するリサーチ計画のワークフロー定義と、その調査実行履歴を保持します。
* **`deep_research_workflow_definitions` (定義)**:
  * `id`: 定義ID (TEXT, 主キー)
  * `name` / `description`: ワークフロー名称/説明
  * `output_type`: レポート出力形式 (`html`, `infographic` など)
* **`deep_research_workflows` (実行履歴)**:
  * `id`: 実行ID (TEXT, 主キー)
  * `query_text`: ユーザーの指示（調査クエリ）
  * `status`: 進行状況 (`processing`, `completed` など)
  * `report_text`: 生成されたマークダウン形式の調査結果

### ⑥ `settings` (システム設定と暗号化)
システム全体の環境設定（APIキーや認証情報）を保持します。
* `key`: 設定キー (TEXT, 主キー)
* `value`: 暗号化された設定値 (TEXT)
  - `GEMINI_API_KEY`, `GOOGLE_CLIENT_SECRET` などの機密データは、保存時に `crypto.cjs` を介してAES-256で自動暗号化され、読み込み時に自動復号されます。

### ⑦ `mcp_servers` (外部連携MCPサーバー)
Geminiに動的アタッチされる外部MCPサーバーの連携情報を保持します。
* `id`: サーバーID (INTEGER, 主キー)
* `name`: サーバー表示名
* `endpoint_url`: SSE通信用の接続URL (例: `http://.../api/mcp/sse`)
* `client_id` / `client_secret`: A2A用の認証クレデンシャル (暗号化保存)
