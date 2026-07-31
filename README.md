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

## 📊 インフラコンポーネント構成・ステータス一覧

本システムがデプロイ・全自動構築する AWS インフラの構成要素およびステータス一覧です。

| インフラコンポーネント | ステータス | 役割と詳細説明 |
| :--- | :--- | :--- |
| **AWS ECS (Fargate) クラスタ** | ✅ **自動構築** | `MacOSUI-Cluster`: ホスト OS 不要のサーバーレスコンテナ実行環境 |
| **AWS ECS (Fargate) サービス** | ✅ **自動構築** | `MacOSUI-Service`: 最新アプリケーションコンテナの実行・ロールアウト管理 |
| **AWS ECR リポジトリ** | ✅ **自動構築** | `macosui-oss`: Docker コンテナイメージの保存・脆弱性スキャン |
| **AWS DynamoDB テーブル** | ✅ **自動構築** | `MacOSUI-KnowledgeArticles`: ナレッジベース用オンデマンド DB (月額 0円〜) |
| **AWS VPC / サブネット / SG** | ✅ **自動構築** | 2AZ パブリックサブネット (10.0.1.0/24, 10.0.2.0/24) ＆ セキュリティグループ |
| **AWS ALB (Load Balancer)** | ✅ **自動構築** | HTTP:80 トラフィックの受信・ターゲットグループへの安全な転送 |
| **AWS ACM (SSL/TLS 証明書)** | ⏳ **独自設定** | 独自ドメイン決定後、ACM コンソールにて無料証明書を発行・ALB 443 に適用 |
| **Route 53 / 外部 DNS** | ⏳ **独自設定** | 独自ドメイン決定後、A レコード (Alias) または CNAME で ALB の DNS 名へマッピング |

---

### 🔍 デプロイ完了時のインフラ正常性チェック（CLI 検証コマンド）

顧客企業や他社エンジニアが `cloudformation.yaml` または GitHub Actions 経由でデプロイを終えた際、全インフラが正常にプロビジョニングされたかを以下のワンライナーコマンドで手元から確認できます：

```bash
# AWS インフラ自動チェックコマンド (AWS CLI)
aws ecs describe-clusters --clusters MacOSUI-Cluster --region ap-northeast-1 --query "clusters[0].status" --output text && \
aws ecs describe-services --cluster MacOSUI-Cluster --services MacOSUI-Service --region ap-northeast-1 --query "services[0].status" --output text && \
aws dynamodb describe-table --table-name MacOSUI-KnowledgeArticles --region ap-northeast-1 --query "Table.TableStatus" --output text
```

> **期待される出力**: `ACTIVE`, `ACTIVE`, `ACTIVE` （すべて ACTIVE と表示されれば全インフラ構築が 100% 成功しています）

---

## 🏗 本番インフラ・アーキテクチャ図

本システムの標準構成（AWS ECS Fargate ＋ ALB ＋ DynamoDB ゼロコストデータ分離）の構造図です。

```mermaid
graph TD
    User([🌐 ユーザー / ブラウザ]) -->|HTTPS: 443| Route53[Route 53 / 独自ドメイン]
    Route53 -->|A レコード (Alias)| ALB[Application Load Balancer / ACM 無料SSL証明書]
    
    subgraph AWS VPC (10.0.0.0/16)
        subgraph Public Subnets (2AZ)
            ALB -->|HTTP: 8080 ヘルスチェック & 転送| Fargate[AWS ECS Fargate コンテナ (macosui-web)]
        end
    end
    
    Fargate -->|暗号化キー取得 / Zeroization| SecretsManager[AWS Secrets Manager / KMS]
    Fargate -->|ナレッジ保存 (月額0円〜)| DynamoDB[(AWS DynamoDB: MacOSUI-KnowledgeArticles)]
    Fargate -->|コンテナイメージ取得| ECR[(Amazon ECR: macosui-oss)]
    
    GitHubActions[🐙 GitHub Actions CI/CD] -->|100% 鍵不要 API デプロイ| ECR
    GitHubActions -->|CloudFormation 自動構築 & Rollout| Fargate
```

> **💡 なぜ Fargate では SSH 鍵や Host IP の登録が不要なのか？**
> EC2 時代のように `EC2_HOST_IP` や `SSH_PRIVATE_KEY` などの秘密鍵を GitHub Secrets に登録する必要は**一切ありません**。
> GitHub Actions は AWS 公式の IAM クレデンシャル（`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`）を使用して AWS API を直接呼び出し、コンテナのビルド・ECR プッシュ・タスク定義の更新・ALB ターゲットグループへの自動バインドまでを安全に完結させます。

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
