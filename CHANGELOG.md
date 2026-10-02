# Changelog

本プロジェクトのすべての主要な変更履歴は本ファイルに記録されます。
フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) に準拠し、バージョン番号は [セマンティック バージョニング](https://semver.org/lang/ja/) に従います。

## [v2.8.0] - 2026-10-02

### 🚀 Gemini 3.8 Multimodal Live Concierge & 動的モデル管理 & Safari 完全互換リリース

#### ✨ Added (新機能・機能追加)
- **🎙️ 👁️ Gemini 3.8 Multimodal Live Concierge（画面認識・リアルタイム音声対話AI）**:
  - Google の最新マルチモーダルリアルタイムストリーミング技術「Gemini 3.8 Multimodal Live API（`BidiGenerateContent`）」を統合した新アプリ『Live Concierge』を新設。
  - **ブラウザ標準画面共有 API (`getDisplayMedia`)**: 特別なプラグインや外部ソフト不要で、ユーザーのデスクトップ画面を Canvas 経由で毎秒1回（1 FPS）の軽量 JPEG フレームとしてストリーミング送信。
  - **スマート VAD (Voice Activity Detection)**: ユーザーの発声を検出し、発話終了時の静寂（約 850ms）を自動検知して `clientContent` として即時コミット。高速かつ確実な音声ターン対話を実現。
  - **Safari / Web Audio API 完全互換**: Google Live API の 24kHz 音声を Mac / Safari のハードウェア標準レート（48kHz）へ滑らかにリアルタイム変換する高品質リサンプリング（`resampleFloat32`）およびサイレントアンロックを実装。
  - **🔊 音声テスト機能**: ヘッダーにワンクリックでテストチャイム音を再生するボタンを新設。Safari の自動再生ポリシー（Autoplay Policy）を解除し、音声出力の正常性を即時確認可能に。
  - **セキュアなバックエンド WebSocket プロキシ (`/ws/gemini-live`)**: APIキーをフロントエンドに露出させず、ZTA認証（JWT/Cookie）のもと Google アップストリーム WebSocket とセキュアに相互中継。
  - **ビジュアル・オーディオインターフェース**: AIが見ている視野のミニプレビュー小窓、発話状態に応じた動的波形ビジュアライザー、リアルタイム字幕ログ、声質（Puck, Kore, Aoede, Fenrir）の動的切替を完備。
- **⚙️ Admin 専用 Live Concierge 動的モデル設定管理タブ (`LiveConciergeTab.jsx`)**:
  - `.agents/AGENTS.md` の開発原則（ハードコード禁止）を徹底遵守し、System Settings 画面に管理者限定の専用設定タブを新設。
  - 将来の新モデル（Gemini 4 Live 等）登場時にもコード修正不要で、管理者がモデル ID・表示名・Extended Thinking 有無をデータベースへ動的登録・管理可能に。
- **🖥️ AI Analytics ダッシュボードの MacOSUI 内 Browser（iframe）統合**:
  - MCP Chat で生成された GenUI ダッシュボードにおいて、従来の「別タブ」ボタンを完全維持しつつ、新たに **「🖥️ デスクトップで開く」** ボタンを新設。
  - MacOSUI のウィンドウマネージャーを通じて独立した Browser（iframe）ウィンドウとして起動。
  - ウィンドウの自由なリサイズ、フルスクリーン最大化、上下左右のスムーズなスクロール、Chart.js や D3.js 等のベクター SVG 描画を完全にサポート。
  - Live Concierge と同一デスクトップ上で並列配置し、ダッシュボードを見ながらのリアルタイム音声FAQ・データ解説が可能に。

#### 🐛 Fixed (バグ修正・安定性向上)
- **🔌 Google Live API 重複 setup 送信の防止 (`connectOrSwitchUpstream`)**:
  - セッション接続時に setup メッセージが二重送信されることによる Google サーバー側からの切断（code 1006）を完全解消。
- **🧠 Extended Thinking モデルの必須パラメータ対応**:
  - `gemini-3.8-live-extended-thinking` 利用時に必須となる `thinkingConfig: { thinkingLevel: "low" }` を自動付与し、code 1007 切断を防止。
- **🔇 Safari での音声再生ミュート・サンプルレート不一致の解消**:
  - Safari の Autoplay Policy によるサイレントブロックを解消し、`getChannelData(0).set()` と 48kHz アップサンプリングにより Mac のスピーカーからクリアな日本語音声を再生可能に。

---

## [v2.7.3] - 2026-09-28

### 🚀 Personal RAG 情報ソース可視化・同期強化 & 参照ドキュメント追跡リリース

#### ✨ Added (新機能・機能追加)
- **📚 回答バブル下部への情報ソース可視化バッジ表示 (`renderSourceInfo`)**:
  - AIが回答を生成した根拠（情報ソース）を一目で判別できるよう、回答バブル下部に視認性の高い情報源バッジを新設。
  - **Google Drive Personal RAG**: 参照した社内ドキュメント名（複数件対応）をバッジ内に一覧表示。
  - **Google Search Grounding**: 最新のWeb検索（Grounding）に基づいて回答した旨を明示。
  - **パブリック一般知識**: RAG未連携または一般的な知識から回答した旨を明示。
  - **RAG未同期警告**: Google Drive 同期フォルダ内が0件の場合に「社内ドキュメントが未同期のため一般知識で回答中」であることをユーザーに即座に警告表示。
- **📁 RAG ファイル名永続化と自動マイグレーション (`file_name`)**:
  - `rag_files` テーブルに `file_name TEXT` カラムを追加し、SQLite / PostgreSQL 双方で起動時に自動カラム追加（マイグレーション）を行う機構を実装。
  - Google Drive から Gemini File API へのアップロード時に元ファイル名（`file_name`）を DB に保存し、チャット推論時に Gemini API の回答メタデータとしてクライアントへ正確に連携。
- **⚡ Personal RAG 同期対象フォーマット拡充 & ユーザーフィードバック強化**:
  - 対応 MIME タイプに Markdown (`text/markdown`, `.md`) および CSV (`text/csv`, `.csv`) を追加し、技術仕様書や集計データファイルの同期に対応。
  - 設定画面（`SystemSettings.jsx`）での「Sync Now」実行時、同期された正確なファイル件数（例: 「○件のファイルを同期しました」）および 0 件時の注意喚起アラートを表示するよう改善。

#### 🐛 Fixed (バグ修正・安定性向上)
- **🎯 RAG 同期ファイル存在時のプロンプト最優先参照指示**:
  - 社内ドキュメントが同期されている場合、Gemini システムプロンプトに「添付された社内ドキュメントの記述を最優先して回答し、参照した社内ドキュメント名を明記せよ」と明示的に指示し、一般知識との混同を防止。

---

## [v2.7.2] - 2026-09-28

### 🚀 MCP ツール動的バインド・GenUI 堅牢化 & Pod ナレッジ認可 (RBAC) 完全連携リリース

#### ✨ Added (新機能・機能追加)
- **📦 Data Analyst ロールへの Pod アクセス権 (`allowed_pods`) 標準追加 & JWT トークン伝達**:
  - 認可ポリシー（PDP: `RBAC_POLICIES`）において `data_analyst` に `allowed_pods: ['*']` を標準設定（新規DB作成時および自動マイグレーション対応）。
  - ログイン時および `/api/auth/me` でユーザーの複数ロールから `allowed_pods` を集約し、JWT 認証トークンに正しく伝達するよう改修。
  - `server/routes/pods.cjs` において、カンマ区切りの複数ロール（例: `admin,data_analyst`）にも対応したセキュアな管理者判定ロジックを導入。
  - ナレッジ保存モーダル（`SaveToKnowledgeModal`）で、Data Analyst ロールのユーザーでもアクセス可能な Pod（デジ庁データ分析、NPB野球データ分析等）が正しくドロップダウン表示され、分析ダッシュボードをワンクリックで Pod へ保存可能に。
- **🌐 クライアント側メタ情報読み込み & パイプライン連携エンドポイント (`GET /api/mcp/meta`)**:
  - ZTA-MCP-GATEWAY に登録されたメタ情報（サーバー定義・ツール群）をクライアントへ連携するルートを提供。

#### 🐛 Fixed (バグ修正・安定性向上)
- **🔧 MCP ツール 0件バインドバグの完全解消 (`server/mcpClient.cjs`)**:
  - `hasServerAccess(serverId, allowedWidgets, user)` を新設。
  - `app:mcp-chat` アプリ権限または `action:use_mcp_tools` アクション権限を持つユーザー（Data Analyst 等）に対して、ZTA-MCP-GATEWAY 経由の全 5 サーバー（NPB、デジタル庁、カタログ、ナレッジ、Gemma）および全 15 ツールが確実にバインドされるよう修正。
- **🛡️ GenUI ダッシュボード切断クラッシュの根絶 & 自動修復 (`safeCode`)**:
  - 分析ダッシュボード生成プロンプトに「注目対象（上位5〜8件）への絞り込み」と「末尾の `</script></body></html>` まで完全に出力する義務」を明記。
  - フロントエンドの `HtmlPreviewCodeBlock.jsx` に、万が一のトークン切断時にも構文エラーで画面が真っ白になるのを防ぐ自己修復ロジック（欠落した閉じタグの自動補完）を実装。
- **📖 ドキュメント拡充**:
  - `README.md` に Data Analyst ロールの推奨 RBAC 設定サンプルおよび各パラメータ（`allowed_widgets`, `allowed_actions`, `allowed_models`, `allowed_pods`）の解説を追記。

---

## [v2.7.1] - 2026-09-24

### 🚀 GenUI ダッシュボード描画の安定化 & EC2 永続データ保護 (Zero Data Loss) リリース

#### ✨ Added (新機能・機能追加)
- **⚡ GenUI トークン上限の大幅拡大 (`max_output_tokens: 24576`)**:
  - Gemini API によるダッシュボード生成時の `max_output_tokens` を 8,192 から **24,576** へ 3 倍に拡大。
  - 大規模な多年度比較データや複雑なインタラクティブウィジェットの出力時でも、トークン枯渇による末尾切断を完全に根絶。
- **📊 JavaScript 配列埋め込み & 動的レンダリングプロンプトの最適化**:
  - 数十行にわたる長大な静的 HTML の `<tr><td>...</td></tr>` ベタ書きを抑止し、クエリ結果をコンパクトな JavaScript オブジェクト配列（`const batterData = [...]`）として埋め込んで `map()` による動的生成を行うプロンプトへと最適化。
  - HTML のトークン消費量を 1/4 以下に劇的に削減し、末尾の `<script>`（Chart.js 初期化や詳細カード対話ロジック）が 100% 確実に完結する構造を確立。

#### 🐛 Fixed (バグ修正・安定性向上)
- **🛡️ iframe 内でのスクリプト初期化セーフティディスパッチャー**:
  - `HtmlPreviewCodeBlock.jsx` において、iframe 内の `DOMContentLoaded` イベントがすでに発火済みの場合でも、確実に Chart.js や動的スクリプトを安全に初期化・再トリガーする安全機構を導入。
- **🐳 EC2 本番環境における永続ボリューム保護 & VUP デプロイ自動化**:
  - `scripts/deploy-ec2.sh` を導入し、デプロイ直前の SQLite 自動バックアップ、永続ボリューム（`/app/data`）のマウント維持、既存ユーザー（admin 等）および蓄積データの自動生存検証ロジックを確立。
  - バージョンアップ（VUP）時にアクティベーション画面が再表示されて蓄積データがリセットされるリスクを完全に排除。

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
