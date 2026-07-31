# MacOSUI - エージェント型 AI オペレーティングシステム (OSS)

MacOSUI は、人間と AI の協調作業のために設計された、オープンソース (Apache License 2.0) のプレミアムなウェブベース・オペレーティングシステムです。MacOS 風の親しみやすいインターフェースに、リサーチ、生産性向上、ナレッジベース管理のための強力な AI エージェントツールが統合されています。

---

## 🚀 主な機能とエンタープライズ特長

- **AWS ECS (Fargate) サーバーレス設計**: ホスト OS の運用・管理を不要にし、コンテナメモリダンプ等の脅威を構造的に無力化する高度なセキュリティアーキテクチャ。
- **AWS DynamoDB 超低コストナレッジ分離**: ナレッジデータを AWS DynamoDB (オンデマンド/永久無料枠 25GB) に分離可能。**月額コスト 0円 〜 数十円** で永続データを高速・安全に外部分離保管。
- **ナレッジベース (Knowledge Base) Import/Export**: JSON パッケージによるナレッジデータのポータブルなインポート・エクスポートを完全サポート。
- **RAG (Gemini File Search)**: Google Drive やローカルファイルを **Gemini 3.6 Flash** 以上の File Search 機能で高速に検索・要約（安価なトークンコストで非常に高速・高精度な **Gemini 3.6 Flash** の使用を強く推奨します）。
- **Deep Research**: 自律型リサーチワークフローが詳細なレポート、インフォグラフィック、HTML を自動生成。
- **ZTA セキュリティ & メモリ Zeroization**: Agent-to-Agent (A2A) 認証、RBAC、および使用直後のメモリ即時破棄 (`keyBuffer.fill(0)`) を搭載。

---

## 💻 システム要件

| 項目 | 最低条件 | 推奨条件 (本番運用) |
| :--- | :--- | :--- |
| **デプロイ基盤** | **AWS ECS (Fargate) + ECR** | AWS ECS (Fargate) + ALB + CloudFront |
| **AI モデル** | **Gemini 3.5 Flash 以上** | **Gemini 3.6 Flash (最推奨・低コスト)** / Pro |
| **コンテナ構成** | 0.5 vCPU / 1 GB RAM | 1 vCPU / 2 GB RAM 以上 |
| **ライセンス** | **Apache License 2.0** | オープンソース商用利用・改変・再配布可能 |

---

## 🛠 デプロイメント構成ガイド

### 0. 【Step 0】 Fork 直後の事前準備 (AWS & Google Cloud 設定) 【必須】
顧客企業または他ユーザーが本リポジトリを Fork して独自の環境にデプロイする際、**最初に行う前提設定手順**です。

#### 1. AWS インフラ, IAM ロール & Secrets Manager の準備
- **AWS ECS タスク実行ロール (`ECSTaskExecutionRole`) の作成**:
  - IAM コンソールで以下のポリシーを持つ IAM ロールを作成します。
    - **信頼関係**: `ecs-tasks.amazonaws.com`
    - **許可ポリシー**: `AmazonECSTaskExecutionRolePolicy`, `SecretsManagerReadWrite`, `AmazonDynamoDBFullAccess`
    - **ロール名**: `ECSTaskExecutionRole`
- **AWS Secrets Manager / KMS 暗号化キーの作成**:
  - AWS Secrets Manager にて以下のシークレットを作成します：
    - **シークレット名**: `macosui/production/db-encryption-key`
    - **キー名**: `DB_ENCRYPTION_KEY`
    - **値**: 32 バイト（64 桁 Hex）のランダム文字列（`server/crypto.cjs` がオンデマンド取得＆メモリ即時抹消 Zeroization で活用します）
- **GitHub Secrets の登録**:
  - リポジトリの **[Settings] ➔ [Secrets and variables] ➔ [Actions]** で以下を設定します：
    - `AWS_ACCESS_KEY_ID`: IAM アクセスキー
    - `AWS_SECRET_ACCESS_KEY`: IAM シークレットキー
    - `AWS_REGION`: リージョン (`ap-northeast-1`)

#### 2. Google Cloud (GCP) プロジェクト & API クレデンシャルの準備
- **GCP プロジェクトの新規作成**: [Google Cloud Console](https://console.cloud.google.com/) にて新規プロジェクトを作成します。
- **必須 API の有効化**:
  - `Google Calendar API` (バーチャルオフィスの予定調整用)
  - `Google Drive API` (RAG / File Search 機能用)
- **OAuth 2.0 クライアント ID と Secret の発行**:
  - [API とサービス] ➔ [認証情報] ➔ [OAuth クライアント ID の作成] を選択。
  - アプリケーションの種類: `ウェブ アプリケーション`
  - 承認済みのリダイレクト URI: `https://<あなたのドメイン>/api/auth/google/callback`
  - 発行された **Client ID** と **Client Secret** をメモしておきます（アクティベーション時に使用）。

---

### 1. 【標準デフォルト】 AWS ECS (Fargate) + ECR 【推奨】
エンタープライズ企業・本番運用のための**標準デフォルト構成**です。OS の管理が不要で、SSH 閉塞やメモリダンプリスクの排除など最も高いセキュリティ水準を満たします。

1. **Amazon ECR リポジトリの作成**:
   - ECR コンソールにて `macosui-oss` リポジトリを作成します。
2. **GitHub Actions 自動デプロイ**:
   - `main` ブランチへ Push すると、`deploy-ecs.yml` が全自動でインフラ構築 (CloudFormation)、脆弱性チェック、ビルド、ECR Push、Fargate タスクのロールアウト、ヘルスチェックを実行します。

---

### 2. 【オプション】 個別カスタマイズ構成

- **オプション A: AWS EC2 (Docker Compose)**
  - 低コストで単一インスタンス上にテスト環境を構築する場合の手動/自動デプロイ構成。
- **オプション B: オンプレミス / 完全閉域網 (オフライン .tar 移行)**
  - 外部アクセスが一切禁止された環境向けに、ローカルで `docker save` して `.tar` パッケージを納品・デプロイする構成。

---

## ⚙️ 事前準備とアクティベーション

初回起動時には **MacOSUI アクティベーション** 画面が表示されます。手動で `.env` ファイルを設定する必要はありませんが、以下の API 設定が **必須** となります。

### 1. Google Cloud コンソールの設定
- **Google Calendar API**: バーチャルオフィスの予定調整に使用。
- **Google Drive API**: RAG（File Search）機能で使用。
- **OAuth 2.0 クライアント ID**: 認証に使用。

### 2. アクティベーション手順
ブラウザで `https://<あなたのドメイン>` または `http://localhost:8080` にアクセスし、画面の指示に従って Google OAuth Client ID/Secret および Gemini API キーを入力してアクティベートします。

---

## 📄 ライセンス
[Apache License 2.0](LICENSE) - 商用利用、改変、再配布、および個別カスタマイズが自由に行えます。
