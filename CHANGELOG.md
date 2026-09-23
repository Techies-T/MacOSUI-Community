# Changelog

本プロジェクトのすべての主要な変更履歴は本ファイルに記録されます。
フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) に準拠し、バージョン番号は [セマンティック バージョニング](https://semver.org/lang/ja/) に従います。

---

## [v2.7.0] - 2026-09-24

### 🚀 MCP 最新仕様 (SEP-2663 Async Tasks) & 設定画面 403 監査ノイズ解消リリース

#### ✨ Added (新機能・機能追加)
- **⚡ MCP 最新仕様準拠: 完全ステートレス化 & SEP-2663 Async Tasks 非同期エンジン**:
  - 2026年7月の MCP 公式仕様改定（SEP-2663 Async Tasks 拡張機能 & 完全ステートレス運用）に完全準拠。
  - バックグラウンド実行 API（`POST /api/mcp/tasks`、`GET /api/mcp/tasks/:taskId`、`POST /api/mcp/tasks/:taskId/cancel`）を新設。
  - SQLite および PostgreSQL に `mcp_tasks` テーブルを実装し、長時間の多段ツール呼び出しや大規模データ分析を非同期タスクとして安全に実行・永続化。
- **⏱️ Tasks 進捗リアルタイム可視化 UI & タイムアウト根本対策**:
  - `McpChat` UI において、タスクの実行経過秒数タイマー、実行中ステップメッセージ、いつでも中止可能な **[中断 (Cancel)]** ボタンを備えたリアルタイム進捗カードを導入。
  - CloudFront の 60 秒タイムアウト制限を完全に回避し、巨大な Generative UI ダッシュボード生成や反復推論処理の完了まで確実にポーリング。
- **🔍 HTML / GenUI レンダラー判定の強化**:
  - Markdown 内のコードブロックにおいて、言語指定の有無にかかわらず HTML タグや Tailwind クラスを含む Generative UI ウィジェットを確実に検出し、インタラクティブ描画。

#### 🐛 Fixed (バグ修正・安定性向上)
- **🛡️ 一般ユーザー設定画面表示時の 403 監査ログノイズ解消 (Issue #1)**:
  - `SystemSettings.jsx` において、ユーザーの認可ポリシー（`allowed_actions` / `allowed_widgets`）に基づき、利用可能なタブ（`Skills` 等）を動的に初期表示するよう改修。
  - 管理者専用 API（`/api/gemini/models`、`/api/rag/popular-queries/all`）の呼び出しを認可ガードで保護し、一般ユーザーログイン・設定画面開時に発生していた不要な 403 警告ノイズを完全撲滅。
  - 各種設定タブ（Roles, General, System, Security Logs 等）の認可ガードを強化。
- **📈 DeepResearch デイリー実行制限の引き上げ**:
  - デフォルトのデイリー実行回数上限を 1 から 5 回に引き上げ、DB 設定（`DEEP_RESEARCH_DAILY_LIMIT`）を優先参照する柔軟な設計に改善。
- **🐳 Docker ビルド環境における OS メタデータ (AppleDouble) 除外**:
  - macOS の `._*`（AppleDouble）ファイルや `.DS_Store` を `.dockerignore` および `eslint.config.js` で全階層一括無視するよう改善し、Linux コンテナビルドの堅牢性を向上。

---

## [v2.6.0] - 2026-09-18

### 🚀 AI Analytics ナレッジベース化 & Pod 共有リリース

#### ⚠️ 前提条件・連携要件 (Prerequisites & Dependencies)
- **zta-mcp-gateway v1.1.1 必須**:
  - 本バージョン（v2.6.0）で追加された「デジタル庁 行政手続分析 MCP（`admin-procedures`）」および「AI Analytics（GenUI×MCP）」機能を利用するには、**`zta-mcp-gateway v1.1.1` 以上** が必要です。
  - `zta-mcp-gateway v1.1.1` にはデジタル庁の行政手続棚卸調査データ（令和7年度・7.6万件）がプリセットされており、OAuth / A2A 認証と SSE トランスポート経由で自動連携されます。

#### ✨ Added (新機能・機能追加)
- **🏛️ デジタル庁 行政手続分析 MCP ネイティブ対応**:
  - デジタル庁が公開する「行政手続等の棚卸調査データ（全国 76,827 手続）」を AI がダイレクトに集計・可視化できる MCP サーバー（`admin-procedures`）に正式対応。
  - オンライン化率、年間申請件数、ライフイベント別分類（出生・就職・引越し・介護等）、手数料・根拠法令を自律分析し、行政改革ダッシュボードを即座に生成可能。
  - 初回起動時に ZTA MCP Gateway（ポート 8085 / `admin-procedures`）への自動登録とクイックプロンプトのマージを実行。
- **📚 AI Analytics（MCP×GenUI）のナレッジベース保存機能**:
  - `McpChat` および `Gemini` で生成されたインタラクティブな HTML ダッシュボードウィジェット上部に **[📚 ナレッジに保存]** ボタンを新設。
  - ワンクリックでタイトル、保存先 Pod（「デジ庁データ分析」「NPB野球データ分析」「🌐 共通」等）、タグを指定してナレッジベースへダイレクト保存可能に。
- **🖥️ ナレッジベース画面での「インタラクティブ GenUI プレビュー」モード**:
  - `KnowledgeBase` アプリにプレビューモードとソースコード表示の切り替えタブを追加。
  - Chart.js グラフ、TailwindCSS スタイリング、クリックイベント連動（選手詳細カードや動的フィルタ）が、安全な iframe 環境下でナレッジベース上でも 100% そのまま動的に動作。
- **👥 Pod とロールによるチーム共有・限定公開とトークン消費ゼロ化**:
  - 一度分析・生成したダッシュボードをチームや組織の Pod で共有することで、同僚やクライアントは **AI トークン消費ゼロ・待ち時間ゼロ（瞬時表示）** でいつでも最新のレポートを活用可能に。
  - 組織のロール（RBAC）に基づいて、特定の Pod にアクセスできるメンバーを厳格に限定公開・アクセス制御（PDP/PEP準拠）。
- **📦 初期 Pod ＆ サンプルダッシュボード自動初期化**:
  - 初回起動時（`autoActivate`）に「デジ庁データ分析」「NPB野球データ分析」Pod を自動生成。
  - デジタル庁 行政手続等の棚卸調査（7.6万件）に基づくインタラクティブ行政改革ダッシュボードをサンプル記事としてネイティブ同梱・自動シード。
  - NPB 2024-2025 マルチ年度 セイバーメトリクス分析ダッシュボードを自動シード。
- **💎 Gemini チャットへの GenUI レンダラー統合**:
  - `Gemini.jsx` の Markdown レンダラーを拡張し、HTML コードブロックを `HtmlPreviewCodeBlock` としてインタラクティブに直接プレビュー・操作・保存可能に統一。

#### 🛡️ Quality & Hardening (品質・セキュリティ)
- **🚫 LLM モデル名ハードコードの完全排除**:
  - `server/routes/knowledge.cjs` のトークン計算処理に残っていたモデル名固定値を排除し、システム設定（`GEMINI_MODEL`）から動的取得・フォールバックするよう改修（開発原則 RULE 遵守）。

---

## [v2.5.1] - 2026-09-10

### 🚀 AI-Native BI & Zero Trust Meta-Catalog Release

#### ✨ Added (新機能・機能追加)
- **📚 Meta-Catalog MCP による企業メタ情報・GenUI 設計図の一元管理**:
  - 膨大な社内データベースやツール群を AI が迷わず自律活用できるよう、データスキーマと推奨 GenUI 仕様をカプセル化した「Meta-Catalog MCP」との統合連携をサポート。
  - AI がテーブル探索を行うことなく、最初からカラム構造・リレーション・推奨クエリを把握して即座に本命の集計クエリを実行可能に。
  - チャットシステムプロンプトに Meta-Catalog の参照ガイダンスを追加。
- **📊 NPB プロ野球 2024-2025 マルチ年度 WAR/WAA GenUI ダッシュボード**:
  - 2024年 vs 2025年の打者・投手セイバーメトリクス指標（WAR, WAA, OPS, FIP 等）の2カ年比較棒グラフ（Chart.js）。
  - チャートのバークリックに連動して動的に更新される「選手詳細スタッツカード」。
  - 前年比増減（+緑 / -赤）の色分け比較テーブルおよび AI 要因分析インサイトバナーの描画。
- **📥 アバター画像ワンクリックダウンロード機能**:
  - 「System Settings」の Users タブにおいて、AI Avatar Creator で生成した高解像度のアバター画像（PNG/JPG）をワンクリックで手元の PC に保存できるダウンロードボタンを追加。
  - 管理者画面の Active Users リストからも、各メンバーのアバター画像を直接ダウンロード可能に。

#### 🛡️ Security & Reliability (セキュリティ・信頼性・耐障害性)
- **🔄 MCP 自己修復＆サイレント自動再接続 (Self-Healing Auto-Reconnect)**:
  - アイドル時間経過による SSE セッション切断や一時的なネットワークエラー（`SSE session not found or expired` 等）を検知した際、古いコネクションを破棄し、裏側で自動的にセッションを再確立して 1 回だけ即座にリトライするフェイルオーバー処理を `mcpClient.cjs` に実装。
- **🚫 監査ログノイズ（不要な403警告）の完全抑止**:
  - `SystemSettings.jsx` のマウント時に、一般ユーザーによる不要な管理用 FAQ API へのリクエストをフロントエンド側で権限ガードし、セキュリティ監査ログのアラートノイズを解消。

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
