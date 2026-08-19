# Role-Based Access Control (RBAC) Specification & Policies Matrix

MacOSUI は、ゼロトラストアーキテクチャ (ZTA) に準拠した一元的な RBAC (Role-Based Access Control) を採用しています。
すべてのユーザーアクセスコントロール、UIウィジェットの表示可否、モデルの利用可否、およびシステムアクションの実行認可は、データベース (PDP: Policy Decision Point) 内の `RBAC_POLICIES` 設定に従って動的に評価されます。

## 1. 原則とアーキテクチャ

1. **PDP (Policy Decision Point) の一元化**:
   すべてのロール定義およびアクセス権限は `RBAC_POLICIES` (JSON) に保存され、動的に変更・管理されます。コード内への特定ユーザー名やウィジェットのハードコード判定は一切禁止されています。
2. **PEP (Policy Enforcement Point) の徹底**:
   - **UI (フロントエンド)**: `Dock` や `Desktop` はユーザーの `allowed_widgets` に基づいて動的にアイコンの表示・非表示を切り替えます。
   - **API (バックエンド)**: リクエスト発生時、ミドルウェア (`requireWidgetAccess`, `requirePermission`, `requireModelAccess`) がユーザーの JWT / RBAC トークンを評価し、不許可アクセスを 403 Forbidden で遮断します。

---

## 2. 初期標準ロール権限マトリクス (Default RBAC Policies)

新規インストール時、または新規ユーザーが招待された際に適用される標準のポリシー定義です。

| ロールID (`role`) | 表示名 | 表示可能ウィジェット (`allowed_widgets`) | 利用可能モデル (`allowed_models`) | 実行可能アクション (`allowed_actions`) | 概要 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`admin`** | Admin (システム管理者) | `*` (全ウィジェット) | `*` (全モデル) | `*` (全アクション) | システムの全権限を所持する最高管理者アカウント。 |
| **`researcher`** | Researcher (研究・分析員) | `app:deep-research`, `app:knowledge-base`, `app:gemini`, `app:browser`, `app:finder`, `app:stickies`, `app:notes`, `app:calendar`, `app:calculator`, `app:html-editor`, `app:virtual-office`, `app:dm-chat` | `*` | `action:generate_infographic`, `action:use_mcp_tools` | Deep Research や AI モデルを用いた高度な自律調査・分析を行うロール。 |
| **`manager`** | Manager (組織管理者) | `app:knowledge-base`, `app:finder`, `app:stickies`, `app:notes`, `app:calendar`, `app:calculator`, `app:html-editor`, `app:browser`, `app:virtual-office`, `app:dm-chat` | `*` | `action:manage_assistant_rules` | アシスタント用ルールや組織内データの管理権限を持つマネージャー。 |
| **`hr`** | HR (人事担当) | `app:knowledge-base`, `app:finder`, `app:stickies`, `app:notes`, `app:calendar`, `app:calculator`, `app:html-editor`, `app:browser`, `app:virtual-office`, `app:dm-chat` | `*` | `action:manage_work_policy` | 就業規則や労務監査ルールの管理権限を持つ人事ロール。 |
| **`user`** | General User (**新規招待デフォルト**) | `app:knowledge-base`, `app:finder`, `app:stickies`, `app:notes`, `app:calendar`, `app:calculator`, `app:html-editor`, `app:browser`, `app:virtual-office`, `app:dm-chat` | `model:gemini-flash` | なし (空配列) | 一般ユーザー。**Deep Research 機能は含まれません。** |
| **`guest`** | External Guest (外部ゲスト) | `app:finder`, `app:stickies`, `app:notes`, `app:calendar`, `app:calculator`, `app:browser`, `app:virtual-office`, `app:dm-chat` | なし (空配列) | なし (空配列) | 閲覧および基本的なデスクトップ機能のみ利用可能な制限アカウント。 |

---

## 3. ウィジェット・プレフィックス一覧 (`allowed_widgets`)

| ウィジェット ID | 識別コード | アプリケーション名 |
| :--- | :--- | :--- |
| `settings` | `app:settings` | System Settings |
| `finder` | `app:finder` | Finder (ファイルマネージャー) |
| `browser` | `app:browser` | Safari / Web Browser |
| `calculator` | `app:calculator` | Calculator |
| `notes` | `app:notes` | Notes |
| `stickies` | `app:stickies` | Stickies (付箋) |
| `calendar` | `app:calendar` | Calendar |
| `html-editor` | `app:html-editor` | HTML Editor |
| `knowledge-base` | `app:knowledge-base` | Knowledge Base (RAGナレッジ) |
| `gemini` | `app:gemini` | Gemini AI Chat |
| `mcp-chat` | `app:mcp-chat` | MCP Chat Client |
| `deep-research` | `app:deep-research` | Deep Research (自律型リサーチエージェント) |
| `virtual-office` | `app:virtual-office` | Virtual Office (バーチャルオフィス) |
| `dm-chat` | `app:dm-chat` | Direct Messaging Chat |

---

## 4. 管理者による変更方法

システム管理者 (`admin`) は、`System Settings` > `Roles & Permissions` タブから、各ロールの `allowed_widgets` や `allowed_actions` を GUI 上でリアルタイムに編集・適用することができます。
