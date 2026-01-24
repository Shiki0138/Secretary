# AI翻訳秘書 デプロイメントガイド

最終更新日: 2026年1月24日

---

## 前提条件

- Node.js 18+
- npm 9+
- Supabase アカウント
- Vercel アカウント
- LINE Developers アカウント
- OpenAI API キー

---

## 1. Supabase セットアップ

### 1.1 プロジェクト作成

1. [Supabase Dashboard](https://app.supabase.io) にログイン
2. "New Project" をクリック
3. 以下を入力:
   - Name: `ai-secretary`
   - Database Password: 強力なパスワード
   - Region: Tokyo (ap-northeast-1)

### 1.2 マイグレーション実行

```bash
# Supabase CLI インストール
npm install -g supabase

# ログイン
supabase login

# プロジェクトにリンク
supabase link --project-ref <your-project-ref>

# マイグレーション実行
supabase db push
```

### 1.3 認証情報取得

1. Settings → API を開く
2. 以下をメモ:
   - Project URL
   - anon public key
   - service_role key（秘密）

---

## 2. LINE Developers セットアップ

### 2.1 チャネル作成

1. [LINE Developers Console](https://developers.line.biz) にログイン
2. プロバイダー作成（まだの場合）
3. "Create a Messaging API channel" をクリック
4. 以下を入力:
   - Channel name: AI翻訳秘書
   - Channel type: Messaging API

### 2.2 設定

1. **Messaging API設定**:
   - Webhook URL: `https://your-domain.vercel.app/api/line/webhook`
   - Use webhook: ON
   - Auto-reply messages: OFF
   - Greeting messages: OFF

2. **認証情報取得**:
   - Channel ID
   - Channel secret
   - Channel access token（発行）

---

## 3. OpenAI セットアップ

1. [OpenAI Platform](https://platform.openai.com) にログイン
2. API Keys → Create new secret key
3. キーをメモ（一度しか表示されない）

---

## 4. Vercel デプロイ

### 4.1 リポジトリ接続

```bash
# Vercel CLI インストール
npm install -g vercel

# ログイン
vercel login

# プロジェクトリンク
cd /Users/MBP/Secretary
vercel link
```

### 4.2 環境変数設定

Vercel Dashboard → Settings → Environment Variables:

| 変数名 | 値 |
|--------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |
| `LINE_CHANNEL_ID` | LINE Channel ID |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Channel Access Token |
| `OPENAI_API_KEY` | OpenAI API Key |
| `ENCRYPTION_KEY` | 32文字以上のランダム文字列 |

### 4.3 デプロイ

```bash
# プロダクションデプロイ
vercel --prod
```

---

## 5. 初期データセットアップ

### 5.1 組織作成

```sql
INSERT INTO organizations (name, slug, industry)
VALUES ('〇〇歯科クリニック', 'sample-clinic', 'dental');
```

### 5.2 経営者アカウント作成

1. Supabase Dashboard → Authentication → Users → Add user
2. ユーザー作成後、usersテーブルにレコード追加:

```sql
INSERT INTO users (org_id, role, email, display_name)
VALUES (
    (SELECT id FROM organizations WHERE slug = 'sample-clinic'),
    'owner',
    'owner@example.com',
    '院長'
);
```

---

## 6. 動作確認

### 6.1 経営者ダッシュボード

1. `https://your-domain.vercel.app/dashboard` にアクセス
2. Supabase Auth でログイン
3. ダッシュボードが表示されることを確認

### 6.2 LINE Bot

1. LINE公式アカウントを友達追加
2. メッセージを送信
3. 応答が返ることを確認

---

## 7. トラブルシューティング

### Webhook が動作しない

1. Webhook URL が正しいか確認
2. Vercel のログを確認: `vercel logs`
3. LINE Developer Console でWebhook検証を実行

### 認証エラー

1. 環境変数が正しく設定されているか確認
2. Supabase の認証設定を確認
3. JWTの有効期限を確認

### DBエラー

1. マイグレーションが完了しているか確認
2. RLSポリシーの設定を確認
3. `supabase db remote changes` で差分確認

---

## 8. 本番運用チェックリスト

- [ ] 本番用ドメイン設定
- [ ] SSL証明書確認
- [ ] バックアップ設定
- [ ] 監視アラート設定
- [ ] レート制限設定
- [ ] エラー通知設定（Sentry等）

---

以上
