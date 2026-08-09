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
| **AWS ACM (SSL/TLS 証明書)** | ✅ **自動構築** | `terraform` により無料証明書を自動発行・ALB 443 に自動バインド |
| **Route 53 / 外部 DNS** | ✅ **自動構築** | ACM 検証用レコードおよび ALB への A レコード (Alias) を自動マッピング |

---

### 🔍 デプロイ完了時のインフラ正常性チェック（CLI 検証コマンド）

顧客企業や他社エンジニアが Terraform または GitHub Actions 経由でデプロイを終えた際、全インフラが正常にプロビジョニングされたかを以下のワンライナーコマンドで手元から確認できます：

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
    GitHubActions -->|Terraform 自動構築 & Rollout| Fargate
```

> **💡 なぜ Fargate では SSH 鍵や Host IP の登録が不要なのか？**
> EC2 時代のように `EC2_HOST_IP` や `SSH_PRIVATE_KEY` などの秘密鍵を GitHub Secrets に登録する必要は**一切ありません**。
> GitHub Actions は AWS 公式の IAM クレデンシャル（`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`）を使用して AWS API を直接呼び出し、コンテナのビルド・ECR プッシュ・タスク定義の更新・ALB ターゲットグループへの自動バインドまでを安全に完結させます。

---

## 🛠 デプロイメント＆構築ワークフロー

MacOSUI OSS版では、安定した運用とトラブルシューティングの容易さを考慮し、**「①インフラの初期構築」**と**「②アプリケーションの継続的デプロイ (CI/CD)」**を完全に分離した設計を採用しています。

### Step 1: インフラの初期構築 (3つのパターンから選択)

MacOSUI-oss では、用途や予算に合わせて **3つのインフラデプロイメントパターン** を用意しています。
まずは、本リポジトリを **Fork** し、お手元の環境に **Clone** してください。

#### Pattern A: ローカル開発・検証用 (MacOS / Local Docker)
Mac上やお手元のPCで最も手軽に起動・検証するための構成です。ローカルのソースコードからビルドされ、DBにはSQLiteが使用されます。
1. `docker-compose up -d` を実行します（初回はビルドが走ります）。
2. ブラウザで `http://localhost:8080` にアクセスし、アクティベーションを行います。

#### Pattern B: 超低コストスタート構成 (Single AWS EC2)
最小コストでインターネット上に本番環境を公開したい小規模向けの構成です。
1. `cd terraform/aws-ec2`
2. `terraform init` && `terraform apply` を実行します。
3. 起動したEC2インスタンス内で自動的にリポジトリがCloneされ、ソースコードからコンテナがビルド・起動します（DBはSQLite）。
4. **GitHub Actions** を設定することで、以降のPush時に自動デプロイが可能です。

#### Pattern C: クラウドネイティブ・サーバーレス構成 (AWS Fargate + RDS)
運用保守をなくし、トラフィックに応じて自動スケールさせる本格的なエンタープライズ構成です。
1. `cd terraform/aws-fargate`
2. `bash ../../scripts/setup-infra.sh` または手動で `terraform apply` を実行します。
3. FargateコンテナとPostgreSQL(RDS)が構築されます。
4. **GitHub Actions** を設定することで、以降のPush時に自動デプロイ（ECRプッシュ＆ローリングアップデート）が可能です。

### Step 2: GitHub Actions 連携とデプロイ (CI/CD)
インフラ構築が完了したら、日々のアプリケーション更新は GitHub Actions に任せます。

1. **GitHub Secrets の設定**:
   フォークしたリポジトリの **[Settings] ➔ [Secrets and variables] ➔ [Actions]** に以下を設定します。
   - `AWS_ACCESS_KEY_ID` (IAM ユーザーのアクセスキー)
   - `AWS_SECRET_ACCESS_KEY` (IAM ユーザーのシークレットキー)
2. **自動デプロイ**:
   `main` ブランチにコードを Push すると自動で GitHub Actions が走り、Docker イメージのビルド、監査、ECR へのプッシュ、ECS コンテナの無停止ローリングアップデートを行います。

### Step 3: (オプション) 本番向け HTTPS (SSL証明書) の有効化
独自ドメインを取得し、HTTPS で通信を暗号化する場合の追加設定です。

1. `terraform/variables.tf` を開き、以下の変数を `true` に変更します。
   ```hcl
   variable "enable_https_listener" {
     default = true
   }
   variable "domain_name" {
     default = "macosui.your-domain.com"
   }
   ```
2. 再度 `bash scripts/setup-infra.sh` を実行します。
3. 出力された CNAME レコード（ACM 検証用）を、ご利用のドメイン管理サービス（Route 53, お名前.com など）に登録します。
4. 検証が完了すると、自動的に ALB の 443 番ポート（HTTPS）が開放されます。

---

## 🚑 トラブルシューティングガイド

GitHub Actions のデプロイは「成功（グリーン）」になっているのに、サイトにアクセスすると **`503 Service Temporarily Unavailable`** エラーが出る場合、AWS (ECS) 側でコンテナの起動に失敗している可能性が高いです。

以下の手順で原因（停止理由）を特定してください：

1. AWS コンソールの検索窓で **`ECS`** と検索し、Elastic Container Service を開きます。
2. **`MacOSUI-Cluster`** ➔ サービス **`MacOSUI-Service`** の順にクリックします。
3. **[タスク] (Tasks)** タブを開きます。
4. ステータスのフィルタを「RUNNING」から **`STOPPED` (停止済み)** に変更します。
5. 一覧から一番新しいタスクの ID (青いリンク) をクリックして詳細画面を開きます。
6. 画面中央の **「停止理由 (Stopped reason)」** を確認します。
   - 例: `CannotPullContainerError` (ECR からイメージを取得できない)
   - 例: `unable to assume the role` (IAM ロールの設定ミス)
7. コンテナ内の Node.js アプリケーションがクラッシュしている場合は、**[ログ] (Logs)** タブに `Error: ...` などの詳細なクラッシュログが出力されます。

---

## ⚙️ 事前準備とアクティベーション

初回起動時には **MacOSUI アクティベーション** 画面が表示されます。手動で `.env` ファイルを設定する必要はありませんが、以下の API 設定が **必須** となります。

### 1. Google Cloud コンソールの設定
- **Google Calendar API**: バーチャルオフィスの予定調整に使用。
- **Google Drive API**: RAG（File Search）機能で使用。
- **OAuth 2.0 クライアント ID**: 認証に使用。

### 2. アクティベーション手順
ブラウザで `https://<あなたのドメイン>` または `http://localhost:8080` にアクセスし、画面の指示に従って Google OAuth Client ID/Secret および Gemini API キーを入力してアクティベートします。

### 🔐 セキュリティ・通信暗号化 (HTTPS / HTTP) とクッキー仕様

MacOSUI では、Zero Trust Architecture (ZTA) に基づき、堅牢な認証・暗号化機構を搭載しています：

1. **アクティベーションと HTTPS / HTTP 仕様**:
   - **本番環境 (Fargate等)**: 通信盗聴を防ぐため、外部インターネットからの HTTP 経由のアクセスではアクティベーションが安全にブロックされます（本番運用では HTTPS 接続が必須です）。
   - **ローカル開発環境 (`localhost` / `127.0.0.1`)**: 開発・検証の利便性を考慮し、`localhost` または `127.0.0.1` 接続に限り、HTTP 通信でもアクティベーションおよび全機能が利用できるように特別に許可されています。

2. **認証クッキー (`Secure` 属性) の動的コントロール**:
   - セッション認証クッキー (`token`) の `Secure` 属性（HTTPS限定送信フラグ）は、実際の通信プロトコルを動的に判定します。
   - `HTTPS` 通信時は自動的に `Secure` 属性が有効化され、`HTTP (localhost)` 通信時はブラウザ側でクッキーが拒否・破棄されないよう柔軟にコントロールされるため、ローカル開発環境でもセッションが切れずにスムーズに動作します。

3. **データベースの暗号化と自動キー生成 (`DB_ENCRYPTION_KEY`)**:
   - Gemini API キーや Google OAuth Client Secret などの機密設定値は、データベース（SQLite / PostgreSQL）内で **AES-256-GCM により暗号化** されて保存されます。
   - 暗号化キー (`DB_ENCRYPTION_KEY`) は、ローカル環境 (`docker-compose up -d`) の初回起動時にプログラムが全自動で生成し、永続ボリューム (`data/development.env`) に安全に保存するため、ユーザーが手動で暗号キーを発行・管理する手間は一切ありません。

---

## 📄 ライセンス
[Apache License 2.0](LICENSE) - 商用利用、改変、再配布、および個別カスタマイズが自由に行えます。
