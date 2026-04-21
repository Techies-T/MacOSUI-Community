---
description: ステージングへのデプロイ準備から脆弱性チェック、プッシュ、外部稼働確認までの一連フロー(Built-in Quality)
---

このワークフローは、**ステージング環境（さくらVPS）**へ安全かつ確実に本番同等の品質でデプロイを行うための自動化手順です。
現在、本プロジェクトは **GitHub Container Registry (GHCR)** を利用したコンテナプロビジョニングへと移行済みです。重たいビルド処理やイメージの保管はGitHub Actionsが担当します。

> [!IMPORTANT]
> このワークフローの自動デプロイ機能を利用するには、GitHubのリポジトリに以下のSecretが設定されている必要があります。
> 1. `STAGING_HOST_IP` (133.167.105.49)
> 2. `STAGING_USER` (debian)
> 3. `STAGING_SSH_PRIVATE_KEY` (ローカルのSSH秘密鍵の中身)
> 4. `GHCR_PAT` (GitHubパッケージへのアクセス権限を持つPersonal Access Token)

---

### 1. セキュリティ診断と事前チェック (Local)
// turbo
1. Node.js パッケージのソースコードレベルの脆弱性診断を実施します。
   ```bash
   npm audit --audit-level=critical
   ```

// turbo
2. 実際にデプロイされるDockerイメージを一時ビルドし、コンテナ内部のOS層やベースイメージを含めた総合的なスキャン（Docker Scout）を実行します。
   ```bash
   docker build -t macosui-staging-test .
   docker scout cves macosui-staging-test --exit-code --only-severity critical
   ```
   > [!CAUTION]
   > `npm audit` または `docker scout` のスキャンで `CRITICAL`（致命的）な脆弱性が発見された場合は、**コマンドがエラー終了し、以降のステージングへのデプロイ作業は完全に中止（ブロック）されます**。
   > 脆弱性を修正（`npm audit fix` や Dockerfileのベースイメージ更新など）するまでデプロイできません。

### 2. コードのコミットとStagingへのPush
2. Gitの現在の変更内容を確認し、問題なければコミットとプッシュを行います。メッセージは変更内容に合わせて柔軟に対応します。
   ```bash
   git add .
   git commit -m "chore: deploy to staging"
   git push origin staging
   ```
   > [!NOTE]
   > この `push` をトリガーとして、GitHub Actionsのサーバー上で自動デプロイ処理（Rsync + Dockerビルド・再起動）が開始されます。

### 3. GitHub Actions による自動デプロイ監視
3. ブラウザでGitHubのActionsページ（`https://github.com/minoru61/MacOSUI/actions`）を開き、最新のワークフローがエラーなく完了するかを確認してください。
   目安として、完了までに1分〜2分程度かかります。

### 4. ステージング環境の稼働確認（ヘルスチェック）
// turbo
4. 数分待機した後、本番さくらサーバーURLへリクエストを投げ、バックエンドが正常に応答するか検証します。
   ```bash
   sleep 10 && curl -s https://macosui-staging.techiespod.co.jp/api/health
   ```
   > [!TIP]
   > レスポンスに `{"status":"ok","message":"Server is running"}` と表示されれば、新コンテナからの応答が正常に返ってきています！
