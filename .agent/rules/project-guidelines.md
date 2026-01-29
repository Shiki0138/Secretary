# AI翻訳秘書 - プロジェクトガイドライン

## プロジェクト概要

複数組織が1つのLINE公式アカウントを共有するAI翻訳秘書システム。

## 技術スタック

- **フロントエンド**: Next.js 16 (App Router)
- **バックエンド**: Next.js API Routes
- **データベース**: Supabase (PostgreSQL + RLS)
- **AI**: OpenAI GPT-4
- **メッセージング**: LINE Messaging API
- **デプロイ**: Vercel

## ディレクトリ構造

```
src/
├── app/
│   ├── api/          # APIエンドポイント
│   ├── dashboard/    # 経営者ダッシュボード
│   ├── employee/     # 従業員ポータル
│   ├── login/        # ログイン
│   ├── signup/       # 新規登録
│   └── onboarding/   # 組織設定
├── components/       # UIコンポーネント
├── lib/              # ユーティリティ
└── services/         # ビジネスロジック
```

## セキュリティ原則

1. **RLSを必ず使用**: 全テーブルでRow Level Security有効化
2. **org_idでデータ分離**: 組織間のデータ混在を防止
3. **招待コード方式**: 従業員登録は経営者承認必須
4. **レート制限**: ブルートフォース攻撃対策

## コーディング規約

- TypeScript必須
- 日本語コメント推奨
- エラーメッセージは日本語
- Tailwind CSSでスタイリング
- アニメーションは明示的リクエスト時のみ

## 環境変数

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
LINE_CHANNEL_ID=
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
```

## デプロイ

- 本番: https://secretary-delta.vercel.app
- GitHub: https://github.com/Shiki0138/Secretary
