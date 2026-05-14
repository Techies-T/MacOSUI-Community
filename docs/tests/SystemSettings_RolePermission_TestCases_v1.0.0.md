# System Settings: Role & Permission Test Cases

**Version:** 1.0.0
**Target Area:** System Settings (RBAC / Role & Permission), User Management, MCP Connection
**Purpose:** ZTA（ゼロトラストアーキテクチャ）の最小権限の原則に基づき、細分化されたワークフロー権限とMCPサーバー単位のアクセス権限を検証する。

---

## 1. ワークフロー利用・設定権限のテスト (Workflow & Model Permissions)
現状の「Deep Research」という大枠の権限を、ユースケース（ワークフロー）ごとに分割して権限設定できるかをテストします。

### 対象の権限 (Actions/Widgets)
*   `workflow:deepresearch_html`: DeepResearch + HTML生成ワークフローの利用と固有モデル設定権限
*   `workflow:deepresearch_infographic`: DeepResearch + インフォグラフィック生成ワークフローの利用と固有モデル設定権限
*   `workflow:deepresearch_full`: DeepResearch + HTML & インフォグラフィックのフル機能の利用と固有モデル設定権限

### [x] TC1.1: ワークフロー権限の付与と表示制御
*   **事前条件:** 
    *   ロール `researcher_basic` を作成する。
    *   `researcher_basic` に `workflow:deepresearch_html` のみを付与する。
    *   ユーザー A に `researcher_basic` ロールを割り当てる。
*   **テスト手順:** ユーザー A でログインし、Deep Research または対応する設定画面を開く。
*   **期待結果:**
    *   UI上で「HTML生成付きDeepResearch」に関連する機能（ボタンや設定パネル）のみが表示され、インフォグラフィックに関する機能は非表示または無効化されていること。

### [ ] TC1.2: ワークフローごとのモデル設定の保護 (API PEP)
*   **事前条件:** ユーザー A (権限: `workflow:deepresearch_html` のみ) でログイン。
*   **テスト手順:** バックエンドAPI (`/api/config` 等) に対し、意図的に「インフォグラフィック生成用モデル」の更新リクエストを送信する。
*   **期待結果:** APIが `403 Forbidden` を返し、権限外のモデル設定変更が拒否されること。

---

## 2. 個別MCPアクセスのテスト (Granular MCP Permissions)
システム全体の「MCP管理」ではなく、特定のMCPサーバー（例：売上データMCP、サーバー監視MCP）ごとにアクセス権限を制御できるかをテストします。

### 対象の権限 (Resources)
*   `mcp:{id}` : 特定のIDを持つMCPサーバーへのアクセス権限（例: `mcp:1` = Sales Data, `mcp:2` = Server Monitor）

### [ ] TC2.1: MCPチャットの全ユーザー公開とMCP単位のツール権限付与 (ZTA)
*   **仕様:**
    *   MCPチャット機能 (`app:mcp-chat`) 自体は、システムの基本ウィジェットとして全ユーザーにデフォルトで公開される。
    *   しかし、チャット内でAIが利用できる具体的なツール群は、ユーザーが持つ `mcp:{id}` 権限によって厳密にフィルタリングされる（最小権限の原則）。
*   **事前条件:**
    *   MCPサーバー1 (AppRunner MCP等) と MCPサーバー2 (Docker Monitor) が登録されている。
    *   ロール `経営企画` にはいかなるMCP権限も付与しない。
    *   ロール `its` に `mcp:2` (Docker Monitor) を付与。
*   **テスト手順:**
    1.  `経営企画` ロールを持つユーザーでログインし、DockからMCPチャットを開く。
    2.  AIに「Dockerコンテナ一覧を取得して」と依頼する。
    3.  次に `its` ロールを持つユーザーでログインし、同様にMCPチャットを開き依頼する。
*   **期待結果:**
    *   **両ユーザーとも:** DockにMCPチャットアイコンが表示され、チャット画面を開くことができること。
    *   **経営企画ロール:** Docker Monitor のツールはAIに渡されていないため、AIは「機能が提供されていない」旨を回答すること。また、API直接実行等で呼び出しを試みても `Access denied` で失敗すること。
    *   **itsロール:** Docker Monitor のツールを使って、正常にDocker一覧が取得・表示されること。

---

## 3. ユーザーの権限逆引きAPI (Reverse Lookup API)
管理者が、特定ユーザーが現在どのような権限（アクション、ウィジェット、MCP、ワークフロー）を有しているかを一覧取得できるかをテストします。

### [ ] TC3.1: ユーザー権限逆引きAPIの正常系
*   **事前条件:** 
    *   ユーザー D が `sales_planner` と `researcher_basic` の複数のロールを持っている。
*   **テスト手順:** 管理者権限で `GET /api/users/{ユーザーDのID}/permissions` を実行する。
*   **期待結果:**
    *   APIから以下のようなJSONレスポンスが返却され、ユーザーDに割り当てられた権限の総和が確認できること。
        ```json
        {
          "user_id": "...",
          "roles": ["sales_planner", "researcher_basic"],
          "allowed_widgets": ["app:settings", "mcp:1", "workflow:deepresearch_html"],
          "allowed_actions": ["action:use_mcp_tools"]
        }
        ```

---

## 4. ロール管理と共通権限のテスト (Role Management & Common Permissions)

### [ ] TC4.1: 招待権限の分離
*   **事前条件:** ロール `inviter` に `action:invite_users` (招待権限) のみを付与し、ユーザー E に割り当てる。
*   **テスト手順:** ユーザー E でログインし、システム設定の「Users」タブを開く。
*   **期待結果:**
    *   「招待 (Invite)」のUIは表示され、招待メールの送信が成功すること。
    *   既存ユーザーの「ロール変更」や「削除」のUIは表示されない、または操作時に `403 Forbidden` となること。

### [ ] TC4.2: 新規ロールの作成
*   **事前条件:** 管理者 (Admin) でログイン。
*   **テスト手順:** Roles & Permissions タブで、任意の新しいロール名（例: `custom_role`）を入力して追加する。
*   **期待結果:**
    *   ロール一覧テーブルに新しい列が追加され、任意の権限（チェックボックス）をON/OFFして保存できること。
    *   データベースの `RBAC_POLICIES` 設定に正しく保存されること。

---

## 5. Test Execution Report (テスト実行報告)
テスト実行後、以下のリストをコピーまたはチェックして報告にご活用ください。

- [ ] **TC1.1:** ワークフロー権限の付与と表示制御 (Date: _____ / Tester: _____)
- [ ] **TC1.2:** ワークフローごとのモデル設定の保護 (Date: _____ / Tester: _____)
- [ ] **TC2.1:** MCP単位の権限付与 (Date: _____ / Tester: _____)
- [ ] **TC3.1:** ユーザー権限逆引きAPIの正常系 (Date: _____ / Tester: _____)
- [ ] **TC4.1:** 招待権限の分離 (Date: _____ / Tester: _____)
- [ ] **TC4.2:** 新規ロールの作成 (Date: _____ / Tester: _____)

**総評 / 特記事項 (Comments):**
- 
