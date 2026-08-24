# AWS KMS & Secrets Manager 導入・デプロイ完全ガイド (MacOSUI-oss)

本ドキュメントは、`MacOSUI-oss` を AWS 環境にビルド・デプロイする担当者のために、AWS KMS 暗号化キーの作成、Secrets Manager の設定、およびコンテナ起動手順を記録した公式手順書です。

---

## 🏗️ 全体フロー概要

```
 [1. AWS KMS キー作成] ──► [2. Secrets Manager シークレット登録] ──► [3. EC2 IAM Role 権限付与] ──► [4. コンテナビルド & 起動]
```

---

## Step 1: AWS KMS でカスタマー管理キー (CMK) を作成

1. **AWS マネジメントコンソール** にログインし、**AWS Key Management Service (KMS)** 画面を開きます。
2. **[キーの作成]** をクリックし、以下の通り選択します：
   - **キーのタイプ**: **「対称 (Symmetric)」**
   - **キーの使用法**: **「暗号化と復号 (Encrypt and decrypt)」**
   - **高度なオプション**: デフォルト (KMS) のまま「次へ」
3. **エイリアスの設定**:
   - **エイリアス**: `DB_ENCRYPTION_KEY`（※コンソールで `alias/` が自動付与され、`alias/DB_ENCRYPTION_KEY` となります）
   - **説明**: `MacOSUI-oss DB Encryption Master Key`
4. **キー管理者 (Key Administrators) の選択**:
   - AWS を管理する自身の IAM ユーザー / 管理者ロールを選択します。
5. **キーの使用権限 (Key Users) の選択**:
   - **EC2 インスタンスにアタッチする IAM ロール** (例: `EC2-MacOSUI-Role`) を選択します。
6. **完了**: [完了] ボタンを押して KMS キーを作成します。

---

## Step 2: AWS Secrets Manager に暗号化キーを登録

KMS で暗号化・保護されるシークレットとして `DB_ENCRYPTION_KEY` を登録します。

1. **AWS Secrets Manager** 画面を開き、**[新しいシークレットを保存する]** をクリックします。
2. **シークレットの選択**:
   - **シークレットのタイプ**: `その他のシークレットのタイプ`
   - **キー/値のペア**:
     - **キー**: `DB_ENCRYPTION_KEY`
     - **値**: `64文字の16進数文字列`（例: ターミナルで `openssl rand -hex 32` を実行して生成した32バイト文字列）
   - **暗号化キー**: Step 1 で作成した KMS キー（`alias/DB_ENCRYPTION_KEY`）を選択
3. **シークレット名**:
   - `macosui/production/db-encryption-key` または `DB_ENCRYPTION_KEY`
4. **保存**: 設定を完了してシークレットを保存します。

---

## Step 3: EC2 インスタンスへの IAM Role 権限付与

EC2 からアクセスキー（AccessKeyID/SecretAccessKey）なしでセキュアにキーを取得できるよう、IAM ポリシーを作成して EC2 の IAM ロールへアタッチします。

**IAM ポリシー定義例:**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "kms:Decrypt"
            ],
            "Resource": "*"
        }
    ]
}
```

---

## Step 4: MacOSUI-oss コンテナのビルド & 起動

暗号キーの準備が完了したら、コンテナをビルド・起動します。

### 1. Docker イメージのビルド
```bash
docker build -t macosui-oss:latest .
```

### 2. コンテナの起動 (`docker compose up -d`)
```bash
docker compose up -d web nginx
```

起動時、`MacOSUI-oss` アプリケーションは自動的に AWS Secrets Manager / KMS へ問い合わせを行い、`DB_ENCRYPTION_KEY` をメモリ上に暗号化取得します。

---

## Step 5: システムアクティベーション (初回設定)

1. ブラウザから HTTPS URL へアクセスします：
   - 例: `https://d142cwbt41wi7j.cloudfront.net/`
2. **System Activation 画面** が表示されたら、Google OAuth の Client ID と Client Secret を入力して **[Activate System]** を押します。
3. KMS キーによって Client Secret が安全に暗号化され、SQLite データベースに保存されます。

---

## 🔒 トラブルシューティング & 注意点

- **`[Security Note] AWS Secrets Manager SDK not available...` とログに出る場合**:
  - EC2 インスタンスに IAM ロールがアタッチされているか、または IAM ポリシーに `secretsmanager:GetSecretValue` が許可されているか確認してください。
- **暗号化キーの生成**:
  - `DB_ENCRYPTION_KEY` は必ず 32バイト (64文字ヘキサ) の高エントロピー文字列をご使用ください。
