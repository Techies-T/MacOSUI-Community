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

## 開発・コーディングの原則 (Development Principles)

1. **ハードコードの禁止 (頻繁に変更される情報の外部化)**:
   - LLMのモデル名（例: `gemini-3.1-pro-preview` 等）や、頻繁に変更・陳腐化する可能性のある情報をコード内 (In Coding) に直接ハードコードすることは厳禁とする。
   - モデル名を指定する必要がある処理（新機能の追加など）では、必ず `db.getSetting('GEMINI_MODEL')` のように System Settings でユーザーが設定している基本モデルを参照して利用・フォールバックさせること。
   - このようなハードコードはメンテナンス性を低下させ、後のエラー調査等で多大な時間を浪費する原因となるため徹底すること。

2. **ZTA/認可判定のハードコード禁止 (PDP準拠の徹底)**:
   - ウィジェットの表示可否（`allowed_widgets`）、利用可能なアクション（`allowed_actions`）、アクセスモデル（`allowed_models`）などの認可判定をコード内でハードコード（特定のアプリIDの無条件注入や、特定のメールアドレス `minoru` による特権付与など）することは厳禁とする。
   - すべての認可判定・UI表示は、データベース（PDP: `RBAC_POLICIES`）に定義されたロールポリシーに従って一元的に動的評価（PEP）されなければならない。
