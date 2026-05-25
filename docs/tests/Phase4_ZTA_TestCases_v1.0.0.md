# Phase 4: ZTA & Permissions Enforcement Test Cases
Version: 1.0.0

このドキュメントは、フェーズ4で実装されたゼロトラストアーキテクチャ(ZTA)とA2A認証（OAuth 2.0 Token Exchange）の機能を検証するためのテストケース集です。

## テスト実行ステータス凡例
- `[ ]` 未実施 (Not Started)
- `[🏃]` 実行中 (In Progress)
- `[✅]` パス (Pass)
- `[❌]` フェイル・要修正 (Fail)
- `[N/A]` 現状テスト不可・未実装 (Not Applicable)

---

## 0. データベースの事前設定状況 (Database Configuration)

本テストシナリオの実行にあたり、データベース (`server/database.sqlite`) には以下の設定が行われています。テスト結果の妥当性はこの設定値を基準に判断します。

### ユーザー情報 (`users` テーブル)
| Email | Role |
| :--- | :--- |
| `minoru.inui@gmail.com` | `its` |

### ロール権限情報 (`settings` テーブル / `RBAC_POLICIES`)
| ロール | allowed_widgets | allowed_actions | allowed_models |
| :--- | :--- | :--- | :--- |
| **`its`** | `["app:app-monitor", "app:gemini"]` | `["action:use_mcp_tools"]` | `["*"]` |

*※ `its` ロールは、ITS担当者向けにAppRunner（`app:app-monitor`）専用の権限のみを持つように絞り込まれています。*

---

## 1. 認証とJWTの検証 (PDP/PEP分離)

- `[✅]` **TC-ZTA-01: ログイン時のJWTクレーム埋め込み確認**
  - **前提**: `admin` および新設の `its` ロールのアカウントが存在すること。
  - **手順**:
    1. `its` アカウント（`minoru.inui@gmail.com`）でログインする。
    2. ブラウザの開発者ツールでCookie（`token`）を取得し、[jwt.io](https://jwt.io) でデコードする。
    3. Payloadに `allowed_widgets`, `allowed_actions`, `allowed_models` が含まれ、ITS用に設定した権限（`app-monitor`等）が入っているか確認する。
  - **期待結果**: JWTの中にPDPで定義された権限リストが正しく埋め込まれていること。

---

## 2. APIアクセス制御 (ZTA PEP)

- `[✅]` **TC-ZTA-02: ウィジェット単位のアクセス制限 (Deep Research)**
  - **前提**: `allowed_widgets` に `app:deep-research` を持たないアカウント（`its` ロール等）でログイン。
  - **手順**: ターミナルからCookieを用いて `/api/research/workflow/incomplete` などの保護されたAPIを直接叩く。
  - **期待結果**: HTTPステータス `403 Forbidden` が返り、アクセスが拒否されること。

- `[ ]` **TC-ZTA-03: モデル単位のアクセス制限**
  - **前提**: `allowed_models` が `["model:gemini-3.1-flash-lite-preview"]` 等に制限されたアカウントでログイン。
  - **手順**: `/api/gemini` に対し、許可されていないモデル（例: `gemini-3.1-pro-preview-customtools`）を使用するリクエストを送信する。
  - **期待結果**: HTTPステータス `403 Forbidden` が返り、Requires model access のエラーが出力されること。

---

## 3. MCPツールの二重保護

- `[ ]` **TC-ZTA-04: ウィジェット権限はあるがアクション権限がない場合**
  - **前提**: `app:gemini` 権限はあるが、`action:use_mcp_tools` がないユーザーでログイン。
  - **手順**: MCPツール呼び出しAPI (`/api/mcp/tool`) へPOSTリクエストを送る。
  - **期待結果**: `403 Forbidden` (Requires action: action:use_mcp_tools) のエラーになり、ツールが実行されないこと。

- `[✅]` **TC-ZTA-05: 両方の権限を持つ場合**
  - **前提**: `its` ロールまたは `admin` ロールでログイン。
  - **手順**: MCPツール呼び出しAPI (`/api/mcp/tool`) へPOSTリクエストを送る。
  - **期待結果**: エラーなくMCPツールが正常に実行されること。

---

## 4. A2A認証 (Token Exchange)

- `[✅]` **TC-ZTA-06: トークン交換エンドポイントの検証**
  - **前提**: ログイン済みの状態。
  - **手順**: `/api/auth/token-exchange` に `grant_type` と `audience: skill:demo-skill` をPOSTする。
  - **期待結果**: HTTP `200 OK` が返り、デコードされたJWTの `aud` が指定した値になり、かつ `allowed_widgets` などの横方向への権限がダウンスコープされて削除されていること。

- `[ ]` **TC-ZTA-07: UIからのExternal Widget連携確認**
  - **前提**: デモスキルなどの外部ウィジェットを開く。
  - **手順**: Networkタブで `/api/auth/token-exchange` が呼ばれ、IFrameにトークンが渡っているか確認する。
  - **期待結果**: エラー表示なくIFrameがロードされること。該当Skillへのアクセス権がない場合は「Access Denied」がUIに表示されること。

---

## 5. 複数ロールの掛け合わせ (Multi-Role Assignment)

- `[N/A]` **TC-ZTA-08: 1ユーザーに対する複数ロールの付与と権限マージ**
  - **状態**: 現状未実装（ユーザーは単一のロール文字列のみを保持する仕様のため）。
  - **前提**: `minoru.inui@gmail.com` に対して、`its` ロールと `researcher`（Deep Research権限）ロールの両方を付与できるアーキテクチャが実装されていること。
  - **手順**: 複数ロールを持つユーザーでログインし、JWTの `allowed_widgets` に両方のロールの権限（`app:app-monitor` と `app:deep-research`）がマージされて含まれているか確認する。
  - **期待結果**: 複数のロールの権限が適切にOR条件（和集合）で合成され、どちらのウィジェットも使用可能になること。

---

## 6. 自動化シナリオテストの実行記録

*※ 2026-05-09 にバックエンドシミュレーションスクリプトにて、以下の項目は一括で検証・パス (`[✅]`) しています。今回はUIおよび手動操作での追加確認を行います。*
- **TC-ZTA-01**: 自動スクリプトによりPayloadの埋め込みを確認済。
- **TC-ZTA-02**: スクリプトにて `403 Forbidden` の応答を確認済。
- **TC-ZTA-05**: スクリプトにてMCPへの正常アクセスを確認済。
- **TC-ZTA-06**: スクリプトにてAgent Tokenのダウンスコープを確認済。

---

## 7. コンテキスト認識型アクセス制御 & セキュリティ監査ログ (ZTA Context & Audit DB)

- `[ ]` **TC-ZTA-09: 未認証・権限漏れAPIアクセスの網羅的拒否**
  - **前提**: 未ログイン状態、または該当ウィジェットへのアクセス権を持たないユーザーでログイン。
  - **手順**:
    1. 保護を強化したエンドポイント（例: `/api/fs/list`、`/api/drive/list`、`/api/calendar/events`、`/api/rag/sync`など）に対して、クッキーを持たずに直接リクエストを送信する。
    2. リクエストの結果とレスポンスコードを確認する。
  - **期待結果**: すべて `401 Unauthorized` または `403 Forbidden` のエラーレスポンスが返り、アクセスが厳格に遮断されること。

- `[ ]` **TC-ZTA-10: セッションハイジャック（コンテキスト不一致）の検知と強制ログアウト**
  - **前提**: 有効なログイン状態のクッキー（`token`）が存在する。
  - **手順**:
    1. リクエストを送信する際、リクエストヘッダの `User-Agent` または送信元 `IPアドレス` を意図的に変更（ログイン時のJWT作成コンテキストと不一致に）して、保護されたAPIを呼び出す。
    2. APIのレスポンスコード、クッキーの削除状況を確認する。
  - **期待結果**: `403 Forbidden`（Session context mismatch...）のエラーが返り、クライアント側の `token` クッキーが消去（強制ログアウト）されること。

- `[ ]` **TC-ZTA-11: 物理隔離された監査ログデータベースへの正確な記録と表示**
  - **前提**: TC-ZTA-09、TC-ZTA-10などの攻撃シミュレーション、または管理者設定変更やユーザー削除などの重要アクションを実行。
  - **手順**:
    1. セッションハイジャックの試行や、管理者画面でのユーザーロールの変更、ユーザー削除などを実行する。
    2. システム設定画面の「Security Logs」タブを開き、ログの表示を確認する。
    3. イベントの種類、IPアドレス、User-Agent、ステータス（Success/Blocked/Failure）、詳細情報（アコーディオン内）が正しく表示され、物理的に隔離されたデータベース（`audit_database.sqlite`）に記録されていることを確認する。
  - **期待結果**: セキュリティ監査ログに「session_hijacking_detected」が `status: blocked` で記録され、管理者操作（ロール更新など）も成否を含めて漏れなく表示されること。
