# AI Agent Workspace Rules (MacOSUI)

## デプロイ安全基準と絶対遵守ルール (Deployment Hard Gate)

1. **デプロイスクリプトの強制実行**:
   - ステージング環境へのデプロイを要求された場合、個別に `git push` 等のコマンドのみを直接実行することは厳禁とする。
   - 必ず `bash scripts/deploy-staging.sh` または `.agents/workflows/deploy-staging.md` の全ステップを一元的に自動実行すること。

2. **組み込み品質エビデンスの提示義務 (Built-in Quality)**:
   - 以下の 3 点の検証ログがすべて揃うまで、絶対にタスクの成功・完了を宣言してはならない。
     - `npm audit` で CRITICAL 0 件の確認
     - `docker scout cves` で `No critical vulnerabilities found` の確認
     - VPS サーバー上の `docker ps` で `macosui-web` コンテナが最新に自動再生成（CREATED が数秒〜数分前）された確認
