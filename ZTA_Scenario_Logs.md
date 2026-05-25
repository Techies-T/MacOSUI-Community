# ZTA コンテキスト検証 & セキュリティ監査ログ シナリオテスト結果

## 対象アカウント: minoru.inui@gmail.com (ロール: ITS)
テスト実行日時: 2026/5/20 15:50:55

### 1. PDP (Policy Decision Point) 認証情報の生成
*PDPは正常にロール権限とZTAコンテキストハッシュ (ip_hash/ua_hash) をJWTに埋め込みました。* 
```json
{
  "id": 24,
  "googleId": "111763876850047778195",
  "email": "minoru.inui@gmail.com",
  "name": "Minoru Inui",
  "avatarUrl": "https://lh3.googleusercontent.com/a/ACg8ocI7KrjgQW0NP3L_ZSoCb4f4YBQmXDLstn8FJsoASFtMnPZwJ16b=s96-c",
  "role": "user,its",
  "allowed_widgets": [
    "app:knowledge-base",
    "app:finder",
    "app:stickies",
    "app:notes",
    "app:calendar",
    "app:calculator",
    "app:html-editor",
    "app:browser",
    "app:gemini",
    "mcp:2",
    "mcp:1",
    "app:app-monitor",
    "mcp:4",
    "app:settings",
    "app:mcp-chat"
  ],
  "allowed_actions": [],
  "allowed_models": [
    "model:gemini-flash"
  ],
  "ip_hash": "12ca17b49af2289436f303e0166030a21e525d266e209267433801a8fd4071a0",
  "ua_hash": "b44a6c9762bb8aafd531cdef326509cab463336c50ee43b61442eda485173d4a",
  "iat": 1779259855,
  "exp": 1779864655
}
```

### 2. PEP (Policy Enforcement Point) 各エンドポイントの検証

#### テスト A: 正常なコンテキストでのアクセス (`/api/gemini/models`)
- **接続元情報**: IP: `127.0.0.1`, UA: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36` (ハッシュ一致)
- **結果**: ✅ パス。HTTP 200。正常なZTAコンテキストが一致し、アクセスが許可されました。

#### テスト B: クッキーなしでの制限APIアクセス (`/api/fs/list`)
- **結果**: ✅ パス。HTTP 401。未認証リクエストが厳格に拒否されました。

#### テスト C: セッションハイジャック検知テスト (`/api/gemini/models`)
- **接続元情報**: IP: `192.168.1.100` (偽装IP), UA: `EvilAgent/1.0` (不一致)
- **結果**: ✅ パス。HTTP 403 Forbidden。ZTA PEPが接続元ハッシュの不一致を検出し、アクセスを拒否しました。
- **レスポンス**: `{"error":"Session context mismatch. Security policy requires re-authentication."}`
- **Cookie制御**: ✅ クライアントの不正なセッショントークン (Cookie) が即座に削除されました。

### 3. 物理隔離されたセキュリティ監査ログDBの検証
- **書き込み検証**: ✅ パス。物理的に隔離されたデータベース `audit_database.sqlite` に `session_hijacking_detected` イベントが漏れなく記録されています。
```json
{
  "id": 3,
  "user_id": 24,
  "user_email": "minoru.inui@gmail.com",
  "event_type": "session_hijacking_detected",
  "action": "GET /api/gemini/models",
  "status": "blocked",
  "ip_address": "192.168.1.100",
  "user_agent": "EvilAgent/1.0",
  "details": "{\"expectedIpHash\":\"12ca17b49af2289436f303e0166030a21e525d266e209267433801a8fd4071a0\",\"gotIpHash\":\"2a39f1eedcd9f986327b5e4da842426f4f05b8f16f0ef385639dbec0db70eaae\",\"expectedUaHash\":\"b44a6c9762bb8aafd531cdef326509cab463336c50ee43b61442eda485173d4a\",\"gotUaHash\":\"e6d2c2f5759c619771ac9c61850925ebaf76eacb5d5ad73f2558fca6e25f558d\",\"clientIp\":\"192.168.1.100\",\"userAgent\":\"EvilAgent/1.0\"}",
  "created_at": "2026-05-20 06:50:58"
}
```
