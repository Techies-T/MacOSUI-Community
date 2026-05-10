---
description: ローカル用Dockerコンテナのビルド、脆弱性診断、および稼働確認（Built-in Quality）
---

このワークフローは、**ローカル開発環境**向けのDockerイメージをビルドし、Docker Scoutによる脆弱性診断を実施した後、正常に起動するかを確認する一連の手順です。

### 1. アプリケーションのビルド
// turbo
1. 最新のコードを反映したDockerイメージをビルドします。
   ```bash
   docker build -t macosui-local .
   ```

### 2. セキュリティ診断 (Docker Scout)
// turbo
2. ビルドしたイメージに対して脆弱性チェック（サマリー）を実行します。
   ```bash
   docker scout quickview macosui-local
   ```

// turbo
3. 詳細な脆弱性レポートを出力し、深刻度を確認します。
   ```bash
   docker scout cves macosui-local
   ```
   > [!IMPORTANT]
   > `CRITICAL` または `HIGH` の脆弱性が検出された場合、ベースイメージのアップデートやライブラリの更新を検討してください。

### 3. コンテナの起動と稼働確認
// turbo
4. ローカル開発環境のDockerコンテナ全体を最新のソースコードでリビルドし、再構築・起動します。
   ```bash
   docker compose up -d --build --force-recreate
   ```

// turbo
5. NGINXコンテナを安全にリスケジュールするため、一度再起動します。
   ```bash
   docker compose restart nginx
   ```

// turbo
6. 数秒待機した後、ヘルスチェックAPIを叩いてバックエンドとの接続確認を行います。
   ```bash
   sleep 5 && curl -s http://localhost:8080/api/health
   ```

// turbo
6. サーバーログを確認し、起動時にエラー（特にDBや暗号化関連）が出ていないかチェックします。直近の50行程度を出力して確認します。
   ```bash
   docker logs --tail 50 macosui-web
   ```

### 4. 品質評価 (Built-in Quality レポート)
7. ワークフロー完了後、`quality_report_local.md`（または回答内）にて以下の点を網羅したレポートをユーザーに提示してください。
   - 脆弱性診断の結果（CRITICAL/HIGHの有無と対応の緊急度）
   - ヘルスチェックの成否
   - **Dockerログの確認結果（エラーや警告の有無、DB接続の正常性など）**
