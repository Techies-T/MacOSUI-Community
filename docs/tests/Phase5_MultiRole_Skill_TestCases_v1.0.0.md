# Phase 5: Multi-Role & Skill Permissions Test Cases (v1.0.0)

本ドキュメントは、フェーズ5で実装された「複数ロールの掛け合わせ（Multi-Role）」および「ITS等への特定Skillアクセス権限付与」が正しく機能し、ゼロトラストアーキテクチャ（ZTA）のポリシーに違反しないことを検証するためのテスト手順を定義します。

---

## 1. 複数ロール（Multi-Role）の機能検証

- `[✅]` **TC-P5-00: Adminロールの全ウィジェット表示確認**
  - **前提**: `admin` アカウントでログインしていること。
  - **手順**: ログイン後、画面下部のDockを確認する。
  - **期待結果**: System Settingsに加えて、Gemini Chat、Deep Research、App Monitorなどのすべてのウィジェットが表示され、クリックして正常に開けること。

- `[✅]` **TC-P5-01: UIからの複数ロール設定**
  - **前提**: `admin` アカウントでログインしていること。
  - **手順**: System Settings > Profile（またはUsers）タブを開き、テストユーザー（例: `minoru.inui@gmail.com`）のRole入力欄を `its,researcher` に変更して保存する。
  - **期待結果**: エラーなく保存され、画面をリロードしてもRole欄に `its,researcher` が保持されていること。

- `[✅]` **TC-P5-02: ログイン時の権限マージ確認 (JWT Payload)**
  - **前提**: 対象ユーザー（`its,researcher`）で一度ログアウトし、再ログインする。
  - **手順**: ブラウザの開発者ツール（Application > Cookies）から `token` を取得し、[jwt.io](https://jwt.io) でデコードする。
  - **期待結果**: Payloadの `allowed_widgets` に、`its` ロールの権限（`app:app-monitor`等）と `researcher` ロールの権限（`app:deep-research`等）が**両方とも（重複なく）含まれている**こと。

- `[✅]` **TC-P5-03: マージされた権限によるUIアクセス**
  - **前提**: 上記のユーザーでログイン済みの状態。
  - **手順**: Dock（画面下部）を確認し、`its` 権限である「App Monitor」と、`researcher` 権限である「Deep Research」の両方のアイコンが表示されており、どちらもクリックして正常に開けることを確認する。
  - **期待結果**: 両方のアプリが正常にロードされ、「Access Denied」などのエラーが出ないこと。

---

## 2. 外部Skillへのアクセス権限付与検証

- `[✅]` **TC-P5-04: UIからのSkill権限付与**
  - **前提**: `admin` アカウントでログインしていること。
  - **手順**: System Settings > Roles & Permissions タブを開き、「Widgets / Apps」の行にある `Skill: Demo Skill` について、`its` ロールのチェックボックスをONにして保存する。
  - **期待結果**: エラーなく保存され、画面をリロードしてもチェックボックスがONのままであること。

- `[✅]` **TC-P5-05: UIからのSkill連携（External Widget）確認**
  - **前提**: `its` ロール（または `its,researcher` 等）を持つアカウントでログインし直す。
  - **手順**: Dockに新しく「Demo Skill（🤖）」のアイコンが表示されていることを確認し、クリックしてウィンドウを開く。
  - **期待結果**: ウィンドウ内に「Hello, World! I am a demo skill iframe.」等のコンテンツが正常に表示されること（= UI上で「Access Denied」と表示されないこと）。

- `[ ]` **TC-P5-06: Skill用トークン交換（Token Exchange）の自動実行確認**
  - **前提**: 上記 TC-P5-05 でウィンドウを開いた直後の状態。
  - **手順**: ブラウザの開発者ツール > Network タブを開き、`token-exchange` へのリクエストが成功（`200 OK`）していることを確認する。
  - **期待結果**: リクエストのPayload（Audience）が `skill:demo-skill` となっており、レスポンスとしてダウンスコープされた新しい `access_token` が返却されていること。これによりZTAのA2A（Agent-to-Agent）認証が正しく機能していることが証明される。

---

## 3. UIリニューアル（Phase 5.5）による操作性検証

- `[ ]` **TC-P5-07: AWSライクなマルチロールのUI付与テスト**
  - **前提**: `admin` アカウントでログインしていること。
  - **手順**: System Settings > Users タブを開き、テストユーザーに対してチェックボックスで「ITS」と「Researcher」の両方にチェックを入れ、ブラウザをリロードする。
  - **期待結果**: ユーザーのロールが `its,researcher` のようにカンマ区切りで保存され、リロード後も両方のチェックボックスがONのまま保持されていること。

- `[ ]` **TC-P5-08: デフォルトウィジェットの除外と動的Skill表示テスト**
  - **前提**: `admin` アカウントでログインしていること。
  - **手順**: System Settings > Roles タブを開き、RBACマトリックス（表）の行を確認する。
  - **期待結果**: 「Gemini Chat」や「System Settings」が管理対象から除外されており、代わりに外部Skill（`Skill: Demo Skill` 等）が動的に表示されていること。さらに、任意のロールに対してチェックボックスでON/OFFの権限設定が保存できること。
