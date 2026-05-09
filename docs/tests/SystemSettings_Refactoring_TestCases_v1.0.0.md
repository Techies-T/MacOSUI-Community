# System Settings Modular Refactoring テスト仕様書

本ドキュメントは、巨大化した `SystemSettings.jsx` ファイルを複数のタブコンポーネント（`tabs/` フォルダ）に分割した「Phase 3: Modular Refactoring」の検証項目を網羅したテスト仕様書です。
リファクタリングによって既存の機能がデグレ（劣化）していないか、状態管理（Propsの受け渡し）が正しく行われているかを検証します。

## テスト実行ステータス凡例
- `[ ]` 未実施 (Not Started)
- `[🏃]` 実行中 (In Progress)
- `[✅]` パス (Pass)
- `[❌]` フェイル・要修正 (Fail)
- `[N/A]` 現状テスト不可・未実装 (Not Applicable)

---

## 1. タブのレンダリングとルーティング検証

分割した全てのコンポーネントがエラーなくマウントされ、レイアウトが崩れずに表示されることを確認します。

- `[✅]` **TC-SYS-01**: 左側のサイドバーから「General」タブをクリックした際、アプリケーション情報とバージョン情報が正しく表示されること。
- `[N/A]` **TC-SYS-02**: 左側のサイドバーから「Appearance」タブをクリックした際、Light/Dark/Autoのテーマ選択UIが崩れずに表示されること。（Light/Dark未実装のため選択不可）
- `[✅]` **TC-SYS-03**: 左側のサイドバーから順に全てのタブ（System, Deep Research, Image Gen, Server Monitor, Chat Config, Personal RAG, Finder, Users, Roles, Skills）をクリックし、画面が白くクラッシュしたり、Reactのエラーが発生しないこと。

---

## 2. 状態管理（Props伝播）と検索機能の検証

親コンポーネント（`SystemSettings.jsx`）で管理されている状態が、子コンポーネントに正しく渡されているかを確認します。

- `[✅]` **TC-SYS-04**: 「System」タブにて、API設定にGemini API KeyおよびGoogle OAuth Client IDの現在の値がプレースホルダー（または伏せ字 `••••••••`）として正しく表示されていること。
- `[✅]` **TC-SYS-05**: 「System」タブのモデル一覧にて、検索ボックスに文字（例: `flash`）を入力した際、リストが即座にフィルタリングされること。
- `[✅]` **TC-SYS-06**: 「Image Gen」タブのモデル一覧においても、検索ボックスでのフィルタリングが「System」タブと同様に正常に機能すること（状態が共有されていることの確認）。
- `[✅]` **TC-SYS-07**: 「Users」タブを開いた際、現在ログインしている自身のユーザープロファイル（アイコン、名前、メールアドレス、ロール）が最上部に表示されること。

---

## 3. 機能的同等性（Functional Parity）の検証

リファクタリング後も、保存ボタンやアクションがバックエンドのAPIと正常に通信できることを確認します。

### 3-1. API設定・プロンプトの保存
- `[ ]` **TC-SYS-08**: 「System」タブでGemini API Keyを再入力して「Save Settings」ボタンを押下した際、エラーなく保存処理が完了すること。
- `[ ]` **TC-SYS-09**: 「Deep Research」タブの「System Prompts」セクションにて、プロンプトテキストを変更し「Save Prompts」を押下した際、リロード後もその変更が維持されていること。

### 3-2. RAGとMCPの連携設定
- `[✅]` **TC-SYS-10**: 「Personal RAG」タブにて、「Add New RAG Folder」から新規フォルダIDを入力して追加した際、リストに反映され、**自動で保存されること**（Saveボタン不要にUX改善済）。
- `[ ]` **TC-SYS-11**: 「Server Monitor」タブにて、MCP Server Endpoint URL を入力して「Save Configuration」を押下した際、設定が保存されること。

### 3-3. セキュリティと権限制御（RBAC）
- `[ ]` **TC-SYS-12**: 「Roles」タブ（RBAC Matrix）にて、任意のチェックボックス（例: Deep Researchの表示権限など）をON/OFFした際、即座にAPIへリクエストが送信され、エラーアラートが出ないこと（Adminの `*` 全権限の場合はトグルがDisableになっていること）。
- `[ ]` **TC-SYS-13**: 管理者以外のユーザーでログインした際、サイドバーの「Users & Groups」や「Roles & Permissions」タブがそもそも表示されないこと（セキュリティの隔離）。

### 3-4. チャット設定
- `[ ]` **TC-SYS-14**: 「Chat Config」タブにて、新規プリセット（LabelとPrompt）を入力して「Add Preset」を押下した際、即座にプリセットタグとしてUIに追加され、バックエンドに保存されること。
- `[ ]` **TC-SYS-15**: 追加されたプリセットタグの「×」ボタンを押下した際、UIから削除され、バックエンドでも削除処理が完了すること。

---

## テスト実行記録
- 実行日: [YYYY-MM-DD]
- 実行者: [Name]
- 全体ステータス: [ ] 実行待ち / [ ] 完了
- 特記事項: なし
