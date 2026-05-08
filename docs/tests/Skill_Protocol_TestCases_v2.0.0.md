# MacOSUI v2.0.0 テスト仕様書 (Skill Protocol Test Cases)

本ドキュメントは、MacOSUIのメジャーアップデート「v2.0.0 (Skill Protocol)」に関する実装の検証項目を網羅したテスト仕様書です。
外部ウィジェットのサンドボックス分離、双方向通信、動的インストール、およびM2Mセキュリティが正しく機能しているかを検証します。

## テスト実行ステータス凡例
- `[ ]` 未実施 (Not Started)
- `[🏃]` 実行中 (In Progress)
- `[✅]` パス (Pass)
- `[❌]` フェイル・要修正 (Fail)

---

## 1. フェーズ1: Iframeサンドボックスと基礎通信 (Phase 1)
※ `feature/skill-protocol-phase1` にて実装済みの項目

### 1-1. ウィジェットのレンダリングと隔離
- `[✅]` **TC-SKILL-01**: Dockから「Demo Skill」をクリックした際、`ExternalWidget.jsx` を通じて `public/demo-skill.html` がエラーなくIframe内に表示されること。
- `[ ]` **TC-SKILL-02**: Iframe要素に `sandbox="allow-scripts allow-same-origin"` 属性が正しく付与されており、ウィジェット側からMacOSUI本体（親）のDOMや `localStorage` に直接アクセスできないこと（XSS防御の確認）。

### 1-2. postMessage 双方向通信の正常系
- `[✅]` **TC-SKILL-03**: ウィジェット内のボタンを押下した際、`type: 'AI_REQUEST'` が `postMessage` 経由でMacOSUI本体に正しく送信されること。
- `[✅]` **TC-SKILL-04**: MacOSUI本体がバックエンド（`/api/gemini`）を呼び出し、レスポンス（ジョーク）を取得できること。
- `[✅]` **TC-SKILL-05**: 取得したレスポンスが `type: 'AI_RESPONSE'` としてウィジェットに返却され、ウィジェットのUI上に正常に表示されること。

---

## 2. フェーズ2: マニフェストと動的インストール (Phase 2 - 未実装)
※ DB連携とシステム設定UIの拡張

### 2-1. Skillの追加・削除
- `[ ]` **TC-SKILL-06**: System Settings の新しい「Skill Management」タブから、外部マニフェストURL（`skill.json`）を入力して新規Skillをインストールできること。
- `[ ]` **TC-SKILL-07**: インストールされたSkillが即座にDockに反映され、設定されたアイコンと名前で起動できること。
- `[ ]` **TC-SKILL-08**: インストールしたSkillをアンインストール（削除）でき、Dockからも消去されること。

---

## 3. フェーズ3: M2Mセキュリティと動的Tool連携 (Phase 3 - 未実装)
※ ZTAアーキテクチャの実現

### 3-1. RAG/MCPによる動的ツールのロード
- `[ ]` **TC-SKILL-09**: ユーザーがチャットで要求した際、インストールされている外部SkillのAPI機能（Tools）がGeminiに動的に渡され、適切に外部APIが呼び出されること。
  - **確認方法① (サーバーログ)**: ターミナルで `docker logs -f macosui-web` (または `npm run dev` の標準出力) を実行し、`Calling Tool: [ツール名]` というログが出力されて外部APIへリクエストが飛んでいることを確認する。
  - **確認方法② (Geminiの回答)**: Geminiからの回答内容に、明らかに外部APIから取得したとわかる固有のデータ（例: 天気データ、App Runnerのステータス等）が含まれていることを確認する。

### 3-2. M2M (Machine to Machine) 認証
- `[ ]` **TC-SKILL-10**: MacOSUIから外部のSkill APIエンドポイントにリクエストを投げる際、リクエストヘッダに有効な署名付き `JWT` が自動的に付与されていること。
- `[ ]` **TC-SKILL-11**: 不正なスコープや権限外の操作をSkillが要求した場合、ZTAポリシーゲートウェイによってアクセスが拒否（403 Forbidden等）されること。

---

## 4. MCP App Runner 連携復旧 (Local Testing)
※ MCPサーバーとのローカル接続検証

### 4-1. 設定の柔軟性とエラーハンドリング
- `[ ]` **TC-MCP-01**: System Settings にて、「MCP Server Endpoint URL」のみを入力し、OAuth情報（Token URLなど）を空欄のままエラーなく保存できること。
- `[ ]` **TC-MCP-02**: Endpointが未設定、または接続不可能なURLの場合、App Runner Dashboardを開いた際に「System Settings から MCP Server Endpoint を設定してください」等の分かりやすいエラーメッセージがUI上に表示されること。

### 4-2. 認証バイパスとデータ取得の正常系
- `[ ]` **TC-MCP-03**: OAuth情報が未設定の状態で、MacOSUIのバックエンド（`mcpClient.cjs`）が `Authorization` ヘッダなしでローカルのSSEエンドポイントに正常に接続できること。
- `[ ]` **TC-MCP-04**: ローカルのMCPサーバーが正常稼働している状態で App Runner Dashboard を開くと、`get_apprunner_services` ツールが正常に呼び出され、サービス一覧（またはモックデータ）が画面に表示されること。
