# Anthropic Claude API サポート 実装ウォークスルー (`Claude API Walkthrough`)

本ドキュメントは、既存の Google Gemini 実装を 100% 維持したまま、Anthropic Claude API を統合・スイッチ可能にした実装結果の詳細と、API Key 設定および動作確認の手順をまとめたものです。

---

## 1. ブランチ構成とリリース保護

安定版 `v2.9.2` を保護しつつ VUP 開発を進められるよう、`MacOSUI` および `MacOSUI-oss` の両リポジトリで以下のブランチを作成・切り替えています。

- **安定版保護ブランチ**: `release/v2.9.2`
- **Claude サポート開発ブランチ**: `feat/claude-support`（現在のチェックアウト先）

---

## 2. 実装アーキテクチャと変更ファイル一覧

### 2.1 新規作成モジュール：LLM アダプター層
- **[llmAdapter.cjs](file:///Users/minoru_inui/AI%20coder/MacOSUI-oss/server/services/llmAdapter.cjs)**
  - `getProviderForModel(modelName, defaultProvider)`: モデル名（`claude-*` / `gemini-*`）またはシステム設定のデフォルトプロバイダー（`AI_PROVIDER`）から自動的にプロバイダーを判定。
  - `listClaudeModels(apiKey, db)`: Anthropic 公式 Models API (`GET https://api.anthropic.com/v1/models`) を呼び出し、利用可能な Claude モデル一覧を動的に取得して DB (`CLAUDE_AVAILABLE_MODELS`) にキャッシュ。
  - `generateTextWithClaude(...)`: システム全体（DM、Virtual Office、Deep Research Phase 2 HTML/SVG 生成、アイコン生成など）から共通利用できる汎用テキスト生成関数。
  - `runClaudeChatJob(...)`:
    - マルチモーダル添付（画像・PDF Base64）対応
    - ローカル RAG キャッシュ（`data/rag_cache`）からのファイル注入＋Anthropic Prompt Caching (`cache_control: { type: 'ephemeral' }`) によるトークンコスト最大 90% 削減・高速化
    - Anthropic 組み込み Web 検索ツール (`web_search_20250305`) による Grounding 対応
    - `save_to_drive` Tool Use ループ対応
  - `runClaudeDeepResearchJob(...)`: Deep Research Task 1 調査フェーズを Claude + Web Search ツールで実行し、計画・検索・統合レポート生成の進捗を DB にリアルタイム記録。
  - `runClaudeMcpWorkflow(...)`: MCP サーバーから取得したツール定義を Anthropic `tools` スキーマに自動変換し、最大 5 ターンの自律 Tool Use ループを実行。
  - `countClaudeTokens(...)`: Anthropic 公式 `messages.countTokens` API による正確なトークン計測。

### 2.2 データベース拡張
- **[db_sqlite.cjs](file:///Users/minoru_inui/AI%20coder/MacOSUI-oss/server/db_sqlite.cjs)** / **[db_postgres.cjs](file:///Users/minoru_inui/AI%20coder/MacOSUI-oss/server/db_postgres.cjs)**
  - `rag_files` テーブルに `local_cache_path TEXT` カラムを自動マイグレーション追加（Claude でも Google Drive 同期済み RAG ファイルを直接参照可能）。
  - `system_settings` に以下の初期設定キーを追加（ハードコード排除原則に準拠）：
    - `AI_PROVIDER` (`'gemini'` または `'claude'`)
    - `CLAUDE_API_KEY` (AES-256-GCM 暗号化保存)
    - `CLAUDE_MODEL` (デフォルト: `claude-sonnet-4-6`)
    - `CLAUDE_RESEARCH_MODEL` (デフォルト: `claude-sonnet-4-6`)
    - `CLAUDE_HTML_SVG_MODEL` (デフォルト: `claude-sonnet-4-6`)
    - `CLAUDE_MCP_CHAT_MODEL` (デフォルト: `claude-sonnet-4-6`)
  - ZTA / RBAC ポリシーの `allowed_models` に `model:claude-haiku`, `model:claude-sonnet`, `model:claude-opus` を追加。

### 2.3 バックエンド API ルーティング拡張
- **[server/index.cjs](file:///Users/minoru_inui/AI%20coder/MacOSUI-oss/server/index.cjs)**
  - `GET /api/config` & `POST /api/config`: `aiProvider`, `claudeApiKey`, `isClaudeConfigured`, `claudeModel` 等の取得・暗号化保存に対応。
  - `GET /api/gemini/models` & `GET /api/claude/models`: 設定された API Key を用いて Gemini / Claude 両方の利用可能モデル一覧を動的取得して返却。
  - `POST /api/gemini`: モデル名またはデフォルトプロバイダーに応じて Gemini / Claude を自動スイッチ（ZTA の `allowed_models` 認可チェックも両対応）。
  - `performRagSync`: Google Drive からの RAG 同期時に `data/rag_cache` へローカルキャッシュを保存し、`GEMINI_API_KEY` または `CLAUDE_API_KEY` のいずれか一方が設定されていれば同期を実行可能に拡張。
  - Virtual Office (`POST /api/virtual-office/settings`, `estimateTravelTimes`, `getCommonFreeSlots`) および DM (`POST /api/dm/messages`) の Claude スイッチ対応。
- **[server/routes/deepResearch.cjs](file:///Users/minoru_inui/AI%20coder/MacOSUI-oss/server/routes/deepResearch.cjs)**: Deep Research Task 1（Web 調査）、タグ抽出（`/extract-tags`）、進行中ジョブのキャンセル処理を Claude に対応。
- **[server/routes/mcpChat.cjs](file:///Users/minoru_inui/AI%20coder/MacOSUI-oss/server/routes/mcpChat.cjs)**: MCP ワークフロー実行 (`executeMcpWorkflow`) を Claude に対応。
- **[server/routes/knowledge.cjs](file:///Users/minoru_inui/AI%20coder/MacOSUI-oss/server/routes/knowledge.cjs)**: ナレッジ記事作成・更新時のトークン計算を Claude に対応。
- **[server/routes/skills.cjs](file:///Users/minoru_inui/AI%20coder/MacOSUI-oss/server/routes/skills.cjs)**: スキルアイコン自動推定 API を Claude に対応（ハードコードされていたモデル名を排除）。
- **[server/routes/geminiLive.cjs](file:///Users/minoru_inui/AI%20coder/MacOSUI-oss/server/routes/geminiLive.cjs)**: `GEMINI_API_KEY` 未設定時のエラーメッセージを「Live Concierge は Google Gemini 専用機能です」と明確化。

### 2.4 フロントエンド UI（SELECT Box 動的モデル選択 & 警告表示）
- **[SystemSettings.jsx](file:///Users/minoru_inui/AI%20coder/MacOSUI-oss/src/apps/SystemSettings.jsx)** / **[SystemTab.jsx](file:///Users/minoru_inui/AI%20coder/MacOSUI-oss/src/apps/SystemSettings/tabs/SystemTab.jsx)**
  - デフォルト AI プロバイダー切替スイッチ（`✨ Google Gemini` / `🟣 Anthropic Claude`）
  - `Claude API Key` 入力欄（設定済みバッジ表示付き）と、保存時の動的モデルリスト自動再取得
  - `Default Claude Model (Normal Chat & RAG)` の `<select>` ボックスと「🔄 APIからモデル一覧を再取得」ボタン
  - `HTML / SVG Visualization Model` の `<select>` ボックス（`<optgroup>` で Gemini / Claude 両方のモデルを選択可能）
  - `Active MCP Agent Model` の `<select>` ボックス（System タブおよび Server Monitor タブの両方から Gemini / Claude を直接選択・保存可能）
  - `Available Models Directory` で Gemini モデルと Claude モデルの両方を一覧表示
- **[DeepResearchTab.jsx](file:///Users/minoru_inui/AI%20coder/MacOSUI-oss/src/apps/SystemSettings/tabs/DeepResearchTab.jsx)**
  - 各ワークフローの「Base Research Agent（調査モデル）」および「Output Agent（出力生成モデル）」の `<select>` ボックスで、Gemini モデル（Interactions API 対応モデルを含む）と Claude モデルを `<optgroup>` から自由に選択可能。
- **[McpConnectionsTab.jsx](file:///Users/minoru_inui/AI%20coder/MacOSUI-oss/src/apps/SystemSettings/tabs/McpConnectionsTab.jsx)**
  - 「Active MCP Agent Model」の `<select>` ボックスで Gemini / Claude の全モデルを選択可能。
- **[McpChat.jsx](file:///Users/minoru_inui/AI%20coder/MacOSUI-oss/src/apps/McpChat.jsx)**
  - MCP Client チャット画面上部のヘッダーに **AI モデル切替 `<select>` ボックス**を追加。チャット画面からいつでも Gemini / Claude を直接切り替えてタスク実行可能。
- **[RolesTab.jsx](file:///Users/minoru_inui/AI%20coder/MacOSUI-oss/src/apps/SystemSettings/tabs/RolesTab.jsx)**
  - ロールごとの許可モデル設定セクション（`🤖 AI Models Access`）を追加し、`Gemini Flash / Pro` および `Claude Haiku / Sonnet / Opus` のアクセス権を GUI で制御可能。
- **[Gemini.jsx](file:///Users/minoru_inui/AI%20coder/MacOSUI-oss/src/apps/Gemini.jsx)**
  - チャット画面上部のヘッダーに **AI モデル切替 `<select>` ボックス**を追加。チャット中にいつでも System Default / Gemini 各モデル / Claude 各モデルをワンクリックで切り替え可能。
- **[DeepResearch.jsx](file:///Users/minoru_inui/AI%20coder/MacOSUI-oss/src/apps/DeepResearch.jsx)** / **[LiveConciergeTab.jsx](file:///Users/minoru_inui/AI%20coder/MacOSUI-oss/src/apps/SystemSettings/tabs/LiveConciergeTab.jsx)** / **[AvatarCreatorModal.jsx](file:///Users/minoru_inui/AI%20coder/MacOSUI-oss/src/components/AvatarCreatorModal.jsx)** / **[SetupScreen.jsx](file:///Users/minoru_inui/AI%20coder/MacOSUI-oss/src/components/SetupScreen.jsx)**
  - Gemini 専用機能に対する個別ワーニング表示および初期セットアップ画面での Claude API Key 入力に対応。

---

## 3. Gemini 専用機能と個別ワーニングの仕様一覧

Claude にはラスター画像生成 API やネイティブ音声合成・リアルタイム音声 WebSocket API が存在しないため、以下の 4 機能は **Google Gemini 専用機能** として保護し、`GEMINI_API_KEY` が未設定の場合に UI バナーおよび API レスポンスの両方で明確な日本語ワーニングを表示します。

| 機能名 | 理由 | `GEMINI_API_KEY` 未設定時の挙動・警告表示箇所 |
| :--- | :--- | :--- |
| **1. Live Concierge**<br>(リアルタイム音声対話) | Gemini Multimodal Live WebSocket (`BidiGenerateContent`) 専用機能のため | ・`System Settings > Live Concierge` タブ上部に警告バナーを表示<br>・起動時に「⚠️ Live Concierge（リアルタイム音声対話）は Google Gemini 専用機能です。利用するには System Settings で Gemini API Key を設定してください。」を表示 |
| **2. AI Avatar Creator**<br>(アバター画像生成) | Gemini 画像生成モデル（NanoBanana 2）専用機能のため | ・アバター作成モーダル（`AvatarCreatorModal`）上部に警告バナーを表示<br>・API 実行時にも明確なエラーメッセージで案内 |
| **3. Deep Research インフォグラフィック画像出力** | 1枚のラスター画像生成（NanoBanana）は Gemini 専用機能のため（※ **HTML/SVG ダッシュボード出力**は Claude で完全に動作し、むしろ Claude Sonnet 4.6 が得意とする領域です） | ・`System Settings > Deep Research` ワークフロー編集画面で `Infographic` 選択時に警告を表示<br>・`Deep Research` アプリ実行画面で `Infographic` ワークフロー選択時に警告バナーを表示し、HTML/SVG ワークフローへの切り替えを案内 |
| **4. 音声読み上げ (TTS)** | Gemini Audio Output (`POST /api/gemini/tts`) 専用機能のため | ・API 呼び出し時に「⚠️ 音声読み上げ（TTS）は Google Gemini 専用機能です。利用するには System Settings で Gemini API Key を設定してください。」を返却 |

---

## 4. API Key の登録と動的モデル選択（SELECT Box）のテスト手順

Claude の API Key 登録および動的モデル一覧取得（SELECT Box）はすべて実装完了しているため、以下の手順ですぐに実機テストを行っていただけます。

> [!TIP]
> **注意（Claude Pro ライセンスと Anthropic API Key について）**
> コンシューマー向けの Web チャット契約（Claude.ai の Claude Pro 月額プラン）とは別に、API 経由で利用する場合は **Anthropic Console (`https://console.anthropic.com/`)** で発行された API Key（`sk-ant-api03-...`）が必要になります。

### 手順 1：System Settings で Claude API Key を登録する
1. アプリケーションを起動し、**System Settings（システム設定）** ＞ **System** タブを開きます。
2. **「AI Engine Configuration (Multi-LLM Switcher)」** セクションを確認します。
3. **「Claude API Key (Anthropic)」** 入力欄に `sk-ant-...` から始まる API Key を入力します。
4. デフォルトで Claude をメイン利用する場合は、上部の **「Default AI Provider (メインAIエンジン)」** で **`🟣 Anthropic Claude`** を選択します（Gemini のままにしておき、各アプリやワークフロー単位で Claude モデルを選択することも可能です）。
5. 画面右下の **「Save Changes」** をクリックします。

### 手順 2：API Key から利用可能な Claude モデル一覧を動的取得・SELECT Box で選択する
1. 「Save Changes」をクリックすると、バックエンドが自動的に Anthropic の `GET https://api.anthropic.com/v1/models` エンドポイントへ問い合わせを行い、その API Key で利用可能な最新の Claude モデル一覧（例：`claude-sonnet-4-6`, `claude-opus-4-6`, `claude-haiku-4-5` 等）を取得して SELECT Box に反映します。
2. 手動で最新モデル一覧を再取得したい場合は、`Default Claude Model` の右にある **「🔄 APIからモデル一覧を再取得」** ボタンをクリックすると即座に更新されます。
3. 以下の各画面の **SELECT Box** から、取得された Claude モデルを自由に選択できます：
   - **System Settings ＞ System タブ**:
     - `Default Claude Model (Normal Chat & RAG)`
     - `HTML / SVG Visualization Model`（Gemini / Claude 両方の `<optgroup>` から選択可能）
   - **System Settings ＞ Deep Research タブ**:
     - 各ワークフローの `Base Research Agent（調査フェーズ）` および `Output Agent（HTML/SVG 生成フェーズ）`
   - **System Settings ＞ MCP Connections タブ**:
     - `Active MCP Agent Model`
   - **Gemini Chat アプリ（チャット画面上部ヘッダー）**:
     - モード選択の右隣にあるモデル選択ドロップダウンから、チャット中にいつでも Gemini モデルと Claude モデルを切り替え可能です。

---

## 5. 追加改修・設定導線の整理 (2026-10-26 更新)

### 5.1 Claude モデル一覧が空になる問題の解消
- **原因**: `llmAdapter.listClaudeModels()` が返すモデルオブジェクトの配列に対し、APIエンドポイント側で `.models` プロパティを参照してしまい、`undefined` としてフロントエンドに渡っていた。
- **改修**: `server/index.cjs`（`/api/gemini/models` および `/api/claude/models`）にて、配列そのものを受け取った場合も安全に正規化して `models: [...]`, `claudeModels: [...]` を返却するよう修正。フロントエンド側（`SystemSettings.jsx`）でも両パターンのレスポンスをフォールバック解決するよう強化。
- **検証結果**: コンテナ内で Anthropic API から動的に取得された 19 件の最新 Claude モデル（`claude-sonnet-4-6`, `claude-opus-4-6`, `claude-3-7-sonnet-latest`, `claude-sonnet-4-5` 等）がセレクトボックスに即座に表示されることを確認。

### 5.2 MCP Agent Model 設定の重複解消と一本化
- **ユーザー指摘**: MCP Agent のモデル設定が `System` タブと `MCP Connections`（Server Monitor）タブの両方に重複して存在し、設定導線が混乱する状態だった。
- **改修**:
  - `System` タブから `Active MCP Agent Model` セクションを削除。
  - 管理者用の一元管理場所として `MCP Connections`（Server Monitor ＞ MCP Chat Model サブタブ）に設定を一本化。
  - ユーザーが `McpChat`（MCP クライアント）を利用する際にも、チャット画面上部ヘッダーの SELECT Box から直接 Gemini / Claude モデルを即座にスイッチできるよう導線を整備。

### 5.3 最新推論モデル（Claude Opus 5系等）における `temperature` 非推奨エラーの自己修復
- **原因**: `claude-opus-5-5` や Extended Thinking / 推論特化型モデルでは、サンプリングパラメータ `temperature` が非推奨（deprecated / disallowed）とされており、リクエストに含めると 400 エラー `temperature is deprecated for this model` が発生していた。
- **改修**:
  - `server/services/llmAdapter.cjs` の `callAnthropicMessages` にて、該当モデルでの事前除外フィルタおよび、万一 API 側から同エラーが返された際に自動で `temperature` を削除して再試行する Auto-healing 機構を導入。
- **検証結果**: `claude-opus-5-5` による MCP ツール実行およびチャット推論が 200 OK で正常に完了することを確認。

---

## 6. 組み込み品質チェック (Built-in Quality) 検証結果

- **構文チェック (`node -c`)**:
  - `server/services/llmAdapter.cjs`, `server/index.cjs`, `server/db_sqlite.cjs`, `server/db_postgres.cjs`, `server/routes/deepResearch.cjs`, `server/routes/mcpChat.cjs`, `server/routes/knowledge.cjs`, `server/routes/skills.cjs`, `server/routes/geminiLive.cjs` すべてエラー 0 件。
- **フロントエンドビルド & Lint (`npm run build`)**:
  - `MacOSUI` / `MacOSUI-oss` 両リポジトリにて ESLint エラー 0 件・Vite 本番ビルド成功。
- **脆弱性監査 (`npm audit --audit-level=critical`)**:
  - `@anthropic-ai/sdk` 追加後の CRITICAL 脆弱性 **0 件**。
