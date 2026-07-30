# MacOSUI - エージェント型 AI オペレーティングシステム (OSS)

MacOSUI は、人間と AI の協調作業のために設計された、オープンソース (Apache License 2.0) のプレミアムなウェブベース・オペレーティングシステムです。MacOS 風の親しみやすいインターフェースに、リサーチ、生産性向上、ナレッジベース管理のための強力な AI エージェントツールが統合されています。

---

## 🚀 主な機能とエンタープライズ特長

- **AWS ECS (Fargate) サーバーレス設計**: ホスト OS の運用・管理を不要にし、コンテナメモリダンプ等の脅威を構造的に無力化する高度なセキュリティアーキテクチャ。
- **ナレッジベース (Knowledge Base) 分離 & Import/Export**: ナレッジデータを外部インスタンスへ分離可能。JSON/Zip によるナレッジデータのポータブルなインポート・エクスポートを完全サポート。
- **RAG (Gemini File Search)**: Google Drive やローカルファイルを Gemini 3.5 Flash 以上の File Search 機能で高速に検索・要約。
- **Deep Research**: 自律型リサーチワークフローが詳細なレポート、インフォグラフィック、HTML を自動生成。
- **ZTA セキュリティ & メモリ Zeroization**: Agent-to-Agent (A2A) 認証、RBAC、および使用直後のメモリ即時破棄 (`keyBuffer.fill(0)`) を搭載。

---

## 💻 システム要件

| 項目 | 最低条件 | 推奨条件 (本番運用) |
| :--- | :--- | :--- |
| **デプロイ基盤** | **AWS ECS (Fargate) + ECR** | AWS ECS (Fargate) + ALB + CloudFront |
| **AI モデル** | **Gemini 3.5 Flash 以上** | Gemini 3.5 Flash / Pro |
| **コンテナ構成** | 0.5 vCPU / 1 GB RAM | 1 vCPU / 2 GB RAM 以上 |
| **ライセンス** | **Apache License 2.0** | オープンソース商用利用・改変・再配布可能 |

---

## 🛠 デプロイメント構成ガイド

### 1. 【標準デフォルト】 AWS ECS (Fargate) + ECR 【推奨】
エンタープライズ企業・本番運用のための**標準デフォルト構成**です。OS の管理が不要で、SSH 閉塞やメモリダンプリスクの排除など最も高いセキュリティ水準を満たします。

1. **Amazon ECR リポジトリの作成**:
   - ECR コンソールにて `macosui-oss` リポジトリを作成します。
2. **GitHub Actions 自動デプロイ**:
   - `main` ブランチへ Push すると、`deploy-ecs.yml` が全自動で脆弱性チェック、ビルド、ECR Push、Fargate タスクのロールアウト、ヘルスチェックを実行します。

---

### 2. 【オプション】 個別カスタマイズ構成

- **オプション A: AWS EC2 (Docker Compose)**
  - 低コストで単一インスタンス上にテスト環境を構築する場合の手動/自動デプロイ構成。
- **オプション B: オンプレミス / 完全閉域網 (オフライン .tar 移行)**
  - 外部アクセスが一切禁止された環境向けに、ローカルで `docker save` して `.tar` パッケージを納品・デプロイする構成。

---

## 🤖 GitHub Actions CI/CD Secrets 設定ガイド (Fargate デプロイ)

本リポジトリでは、`main` ブランチへの `git push` をトリガーとして、**依存関係脆弱性スキャン・Docker ビルド・AWS ECR プッシュ・Fargate タスク自動ロールアウト・本番稼働ヘルスチェック** が全自動で実行されます。

### 🔑 必須 GitHub Secrets

GitHub リポジトリの **[Settings] ➔ [Secrets and variables] ➔ [Actions]** で以下の Secrets を登録してください：

| Secret 名 | 内容・説明 |
| :--- | :--- |
| **`AWS_ACCESS_KEY_ID`** | AWS ECR プッシュおよび ECS タスク更新権限を持つ IAM アクセスキー |
| **`AWS_SECRET_ACCESS_KEY`** | AWS IAM シークレットアクセスキー |
| **`AWS_REGION`** | AWS リージョン (`ap-northeast-1`) |
| **`ECS_CLUSTER_NAME`** | ECS クラスタ名 (`macosui-cluster`) |
| **`ECS_SERVICE_NAME`** | ECS サービス名 (`macosui-service`) |

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
