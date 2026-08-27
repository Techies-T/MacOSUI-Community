# Changelog

本プロジェクトのすべての主要な変更履歴は本ファイルに記録されます。
フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) に準拠し、バージョン番号は [セマンティック バージョニング](https://semver.org/lang/ja/) に従います。

---

## [v2.4.3] - 2026-08-27

### 🐛 Google OAuth Validation & Setup Sanitization Patch

#### 🛠️ Fixed (バグ修正・改善)
- **Google OAuth Client ID / Secret 入力値の自動サニタイズ**:
  - アクティベーション画面（SetupScreen）での入力時に、コピー＆ペーストで紛れ込む先頭・末尾の半角スペースや改行を自動でトリム（`trim()`）する処理を追加。
- **Client ID 形式の厳格なリアルタイム・バリデーション**:
  - Google OAuth Client ID（`*.apps.googleusercontent.com`）の形式チェックをフロントエンドおよびバックエンド API（`/api/config`）の両層に導入。
  - 不正な形式や入力ミスがある場合、アクティベーション時に明確なエラーメッセージを表示し、Google ログイン時の `401: invalid_client (The OAuth client was not found)` エラーを未然に防止。
- **初回アクティベーション失敗時の自己復旧（リカバリー）手順の提供**:
  - 誤った Client Secret 等でアクティベーションを通過してしまった場合でも、設定リセット用ワンライナーを実行することで、安全にアクティベーション画面を再表示して再設定できるリカバリーフローを確立。

---

## [v2.5.0] - 2026-08-25

### 🚀 Gemma 4 Local LLM-RAG & Hybrid AI Release

#### ✨ Added (新機能・機能追加)
- **🛡️ Gemma 4 Local LLM-RAG (完全社内完結 / ゼロ外部漏洩)**:
  - 外部クラウドへ 1 バイトも機密データを送信することなく、Apple Silicon Mac / オンプレミス GPU 上の **Gemma 4 (128K Long Context / KV Cache)** を用いて社内文書・HTML/SVG 構造化ナレッジを高速推論。
  - チャット UI のモードセレクターに `🛡️ Gemma 4 Local RAG` を追加。
- **🌐 ハイブリッド AI 接続ガイド (Tailscale VPN 連携)**:
  - AWS EC2 上で稼働する MacOSUI と、手元の Mac 上の Ollama / MLX (Gemma 4) を Tailscale 暗号化メッシュトンネルで安全に直結。
  - ルーターのポート開放や固定 IP なしで、AWS から安全にローカル LLM を利用可能。
- **📊 リアルタイム・コンテキスト使用量メーター**:
  - Gemini / Gemma 4 のプロンプト・出力トークン数およびコンテキストウィンドウ使用率をチャットフッターにクリーンに常時表示。
- **📐 数式レンダリング (KaTeX & ReactMarkdown)**:
  - チャットメッセージ内の LaTeX 数式（インライン & ディスプレイ）を美しく高速描画。

---

## [v2.4.2] - 2026-08-25

### 🚀 Initial Public Release (Community Edition)

#### ✨ Added (新機能・機能追加)
- **Deep Research エンジン & 自動初期プロンプト**:
  - 自律型リサーチおよび HTML/SVG ナレッジ生成・インフォグラフィック生成のワークフロー定義をデータベース（SQLite / PostgreSQL）初期化時に完全自動登録。
  - Google Drive へのレポート・画像・HTML 自動エクスポート連携。
- **AWS EC2 (x86_64) Terraform 自動プロビジョニング**:
  - `terraform apply` 一発で Amazon Linux 2023 サーバーの起動、スワップメモリ作成、Docker 環境構築、コンテナ起動までを完全自動化。
  - CloudFront（低コスト・即時 HTTPS）および ALB（本番推奨）のルーティング構成に対応。
- **ナレッジベース & Gemini File Search RAG**:
  - JSON パッケージによる社内ナレッジのインポート・エクスポートをサポート。
  - Google Drive や社内文書を Gemini 3.6 Flash の File Search 機能で高速検索・要約。
- **Zero Trust Architecture (ZTA) & セキュリティ**:
  - Agent-to-Agent (A2A) 認証および JWT トークン交換プロトコル。
  - 秘密鍵のメモリ使用後即時ゼロクリア (`keyBuffer.fill(0)`) によるメモリ漏洩保護。
  - AES-256-GCM による API キーやシークレットの暗号化保管。
- **コミュニティ支援・Issue Template**:
  - バグ報告用テンプレート (`.github/ISSUE_TEMPLATE/bug_report.md`) の追加。
