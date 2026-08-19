# トラブルシューティングガイド

MacOSUI OSS版のデプロイや運用中に問題が発生した場合の解決手順です。

## 1. サイトにアクセスできない・接続エラーになる場合

EC2 またはローカル環境でサイトにアクセスできない場合、**コンテナが起動していない** か **ポートが開いていない** 可能性が高いです。

### 解決手順

1. **EC2 インスタンスにログインしコンテナの稼働状況を確認**:
   ```bash
   docker ps -a
   ```
   - `macosui-web` コンテナが `Up` になっているか確認します。
   - `Exited` になっている場合は、コンテナのログを確認します：
   ```bash
   docker logs --tail 100 macosui-web
   ```

2. **よくある原因と解決策**:
   - **ポート 8080 が解放されていない**: AWS セキュリティグループ（`macosui-ec2-sg`）のインバウンドルールで `8080` が許可されているか確認してください。
   - **初期プロビジョニング中**: EC2 起動直後は `user_data.sh` での Docker ビルドに数分かかります。`tail -f /var/log/cloud-init-output.log` で進行状況を確認できます。
   - **メモリ不足 (OOM)**: 小さいインスタンス（`t3.micro` 等）では、2GB のスワップファイル（`/swapfile`）が有効になっているか `free -m` または `swapon --show` で確認してください。

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
