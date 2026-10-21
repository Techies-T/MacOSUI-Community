# Personal RAG 機能復旧・改善 実装計画書

## 1. 概要と背景
Personal RAG が正常に機能しない問題について調査を実施した結果、以下の原因が特定されました。
1. **Google Drive 共有ドライブ（Shared Drive）未対応**:
   Google Drive API 呼び出し（`drive.files.get`, `drive.files.export`）において `supportsAllDrives: true` が付与されておらず、共有ドライブ（「Gemini 4 Argon」等のチームドライブ）内のファイルダウンロード時に 404/403 エラーが発生する。
2. **フロントエンドの設定保存バグ**:
   `SystemSettings.jsx` の `saveRagFoldersToApi` において HTTP レスポンス（`res.ok`）の検証が行われておらず、API保存失敗時にも画面上一時的に追加されたように見え、実際にはDBに保存されない。
3. **Gemini File API 有効期限切れ（40時間制限）による無音停止**:
   アップロードされたファイルの寿命（48時間制限）に伴い、40時間以上前のファイルがクエリから除外され、同期が長期間行われていない場合にコンテキストが0件になる。

本計画書に基づき、これらの問題を解消し、Gemini 4 Argon ドライブとの連携および安定稼働を実現します。

---

## 2. 実装タスク一覧

### タスク 1: Google Drive API 呼び出しの共有ドライブ（Shared Drive）完全対応
- 対象ファイル: `server/index.cjs`
- 内容:
  - `performRagSync` 内の `drive.files.list` に `corpora: 'allDrives'`, `includeItemsFromAllDrives: true`, `supportsAllDrives: true` を指定。
  - `drive.files.get` に `supportsAllDrives: true` を追加。
  - `drive.files.export` に `supportsAllDrives: true` を追加。
  - `/api/rag/check-sync-needed` 内の `drive.files.list` にも同様に `supportsAllDrives: true`, `includeItemsFromAllDrives: true` を確実に追加。
  - ファイル単位の同期失敗ログを収集し、`ragSyncStatus` に詳細（失敗件数、エラー理由）を記録。

### タスク 2: フロントエンドの設定保存・エラーハンドリング強化
- 対象ファイル: `src/apps/SystemSettings.jsx`, `src/apps/SystemSettings/tabs/PersonalRagTab.jsx`
- 内容:
  - `saveRagFoldersToApi` で `const res = await fetch(...)` の `res.ok` を厳格に判定。
  - 保存失敗時は `ragFolders` を元の状態にロールバックし、エラーメッセージを明示。
  - 保存成功時に入力フォームをクリアし、成功通知を行う。
  - `PersonalRagTab.jsx` で同期エラーの詳細（ファイルスキップやエラーメッセージ）を表示できるようにUI拡張。

### タスク 3: 40時間期限切れ検知とチャット画面からのオンデマンド同期
- 対象ファイル: `src/apps/Gemini.jsx`, `server/index.cjs`
- 内容:
  - `Gemini.jsx` において、RAGモード（`mode === 'rag'`）選択時に最終同期日時（`lastRagSyncTime`）が40時間以上前、または未同期の場合に警告バナーを表示。
  - 警告バナー内に「今すぐ同期」ボタンを設置し、ユーザーがワンクリックで同期を実行できるようにする。
  - `server/index.cjs` での RAG ファイル取得時、ファイル件数が0件の場合に詳細な警告ログを出力。

### タスク 4: 品質・セキュリティ検証（Built-in Quality）
- `npm audit --audit-level=critical`（CRITICAL 0件の検証）
- `npm run build`（フロントエンドビルドの正常通過確認）
- `node -c server/index.cjs`（Node.js構文チェックの正常通過確認）

---

## 3. スケジュールと進め方
1. 実装計画のドキュメント化（完了）
2. バックエンド修正（タスク 1）
3. フロントエンド修正（タスク 2, 3）
4. ビルド・構文・脆弱性チェック（タスク 4）
5. Walkthrough ドキュメント作成
