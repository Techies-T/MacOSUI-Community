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
4. 既存の同名コンテナがある場合は削除し、起動します。
   ```bash
   docker rm -f macosui-dev || true
   docker run -d --name macosui-dev -p 8081:8080 -v "$(pwd)/server/database.sqlite:/app/server/database.sqlite" -v "$(pwd)/server/development.env:/app/server/development.env" macosui-local
   ```

// turbo
5. 数秒待機した後、ヘルスチェックAPIを叩いて接続確認を行います。
   ```bash
   sleep 5 && curl -s http://localhost:8081/api/health
   ```

// turbo
6. サーバーログを確認し、起動時にエラー（特にDBや暗号化関連）が出ていないかチェックします。
   ```bash
   docker logs macosui-dev
   ```

### 4. 品質評価 (Built-in Quality レポート)
7. 上記ステップの結果に基づき、以下の点を確認してください。
   - 脆弱性診断の結果（CRITICAL/HIGHの有無と対応の緊急度）
   - ヘルスチェックの成否
   - ログに予期せぬエラーが出力されていないか
