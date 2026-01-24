# AI翻訳秘書 (AI Translation Secretary)

従業員と経営者のコミュニケーションを翻訳・支援するSaaSプラットフォーム

---

## 概要

AI翻訳秘書は、小規模事業者（歯科医院、美容サロン等）向けの職場コミュニケーション支援システムです。従業員からの相談を「翻訳」して経営者に届け、離職率の低下と透明性のある職場環境を実現します。

---

## 主な機能

| 機能 | 説明 |
|------|------|
| **メッセージ翻訳** | 感情的な表現をマイルドに変換 |
| **規則Q&A** | 就業規則に基づく参照付き回答 |
| **シフト管理** | 希望提出・確認 |
| **規則確認署名** | 電子署名で確認記録 |
| **全社通知** | 配信・既読管理 |

---

## 技術スタック

- **フロントエンド**: Next.js 16
- **データベース**: Supabase (PostgreSQL + RLS)
- **AI**: OpenAI GPT-4o-mini
- **通知**: LINE Messaging API
- **ホスティング**: Vercel

---

## クイックスタート

```bash
# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env.local
# .env.local を編集

# 開発サーバー起動
npm run dev
```

---

## ドキュメント

| ドキュメント | 説明 |
|-------------|------|
| [デプロイメントガイド](docs/DEPLOYMENT_GUIDE.md) | セットアップ手順 |
| [APIリファレンス](docs/API_REFERENCE.md) | API仕様 |
| [セキュリティレポート](docs/SECURITY_IMPROVEMENT_REPORT.md) | セキュリティ対策 |
| [利用規約](docs/TERMS_OF_SERVICE.md) | 利用条件 |
| [プライバシーポリシー](docs/PRIVACY_POLICY.md) | 個人情報取扱 |
| [β版テストガイド](docs/BETA_TEST_GUIDE.md) | テスト計画 |

---

## ディレクトリ構成

```
src/
├── app/              # Next.js App Router
│   ├── api/          # APIエンドポイント
│   ├── dashboard/    # 経営者ダッシュボード
│   └── employee/     # 従業員ポータル
├── components/       # UIコンポーネント
├── core/             # AIエンジン
├── services/         # ビジネスロジック
└── lib/              # ユーティリティ
supabase/
└── migrations/       # DBマイグレーション
docs/                 # ドキュメント
```

---

## 環境変数

| 変数 | 説明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 公開キー |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase サービスキー |
| `OPENAI_API_KEY` | OpenAI APIキー |
| `LINE_CHANNEL_*` | LINE認証情報 |
| `ENCRYPTION_KEY` | 暗号化キー |

---

## ライセンス

Proprietary - All rights reserved

---

## サポート

- Email: support@example.com
