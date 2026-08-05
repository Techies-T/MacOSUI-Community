# トラブルシューティングガイド

MacOSUI OSS版のデプロイや運用中に問題が発生した場合の解決手順です。

## 1. サイトにアクセスすると `503 Service Temporarily Unavailable` が出る

GitHub Actions のデプロイは「成功（グリーン）」になっているにも関わらず、サイトにアクセスできない場合、**AWS (ECS Fargate) 側でコンテナの起動に失敗している** 可能性が非常に高いです。

Fargate はコンテナの起動に失敗すると、自動的にそのコンテナを破棄（STOPPED）して新しいコンテナを立ち上げようと無限ループします。
エラーの原因を特定するには、以下の手順で **「停止理由 (Stopped reason)」** を確認してください。

### 停止理由（死亡診断書）の確認手順
1. AWS コンソールにログインし、**ECS (Elastic Container Service)** を開きます。
2. クラスターの一覧から **`MacOSUI-Cluster`** をクリックします。
3. サービスタブから **`MacOSUI-Service`** をクリックします。
4. **[タスク] (Tasks)** タブを開きます。
5. リスト上部のフィルタ（デフォルトは RUNNING）を **`STOPPED` (停止済み)** に変更します。
6. 一覧の一番上にある最新のタスク ID（青いリンク）をクリックします。
7. 画面中央の **「停止理由 (Stopped reason)」** を確認します。

### よくある停止理由と解決策

| 停止理由のメッセージ例 | 考えられる原因 | 解決策 |
| :--- | :--- | :--- |
| `CannotPullContainerError: ... not found` | ECR に Docker イメージが存在しないか、リポジトリ名が間違っています。 | GitHub Actions が正常に完了しているか、ECR (`macosui-repo`) にイメージがPushされているか確認してください。 |
| `ECS was unable to assume the role...` | IAM ロールの設定ミス、またはロールが存在しません。 | `ECSTaskExecutionRole` などのロール名が Terraform の出力と完全に一致しているか確認してください。 |
| `ResourceInitializationError` | AWS Secrets Manager の読み取り権限がないか、シークレットが存在しません。 | `MacOSUI/production/db-encryption-key` が正しく作成されているか確認してください。 |

> **💡 コンテナ内のアプリ（Node.js）がクラッシュしている場合**
> 停止理由が空欄の場合、インフラ側の起動には成功していますが、アプリ内部でエラーが起きています。
> 同じく STOPPED タスクの詳細画面にある **[ログ] (Logs)** タブを開くと、`Error: ...` などの Node.js のクラッシュログが確認できます。

---

## 2. Terraform の実行が `Error acquiring the state lock` で失敗する

GitHub Actions やローカル実行中にスクリプトを強制終了した場合、Terraform の状態管理（DynamoDB）にロックが残ったままになることがあります。

**解決策:**
1. AWS コンソールで **DynamoDB** を開きます。
2. テーブル `macosui-terraform-state-lock` を開きます。
3. [テーブルアイテムの探索] をクリックし、表示されているロックのレコード（項目）を選択して手動で削除します。
4. その後、再度 `setup-infra.sh` を実行してください。

---

## 3. GitHub Actions が `npm audit` で落ちる (Gate 1)

MacOSUI は高度なセキュリティ要件（Built-in Quality）を満たすため、依存パッケージに `CRITICAL` な脆弱性がある場合はデプロイを強制ブロックします。

**解決策:**
1. ローカル環境で `npm audit` を実行し、どのパッケージに脆弱性があるか特定します。
2. `npm audit fix` を実行するか、該当パッケージのバージョンを `package.json` で手動でアップデートします。
3. コードを Push し直してください。
