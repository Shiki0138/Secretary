---
name: secretary-project
description: AI翻訳秘書プロジェクトのコンテキストと開発支援
---

# AI翻訳秘書 プロジェクトスキル

## プロジェクト概要

このプロジェクトは、複数の会社・組織が1つのLINE公式アカウントを共有してAI翻訳秘書サービスを利用できるマルチテナントSaaSです。

## 主要機能

1. **統合LINE公式アカウント**: 複数組織が1つのLINEアカウントを共有
2. **招待コード方式**: 従業員登録は経営者の承認が必須
3. **AI翻訳**: 従業員メッセージを経営者向けに翻訳
4. **ナレッジベース (RAG)**: 就業規則などのQ&A機能
5. **プライバシー保護**: 原文は経営者に見えない

## データベーステーブル

| テーブル | 目的 |
|----------|------|
| organizations | 組織情報 |
| users | ユーザー（経営者・従業員） |
| conversations | 会話スレッド |
| messages | メッセージ |
| documents | RAG用ドキュメント |
| invitation_codes | 招待コード |
| pending_registrations | 承認待ち登録 |
| registration_attempts | 監査ログ |
| rate_limits | レート制限 |

## 重要なAPI

| エンドポイント | 機能 |
|----------------|------|
| POST /api/line/webhook | LINE Webhook受信 |
| POST /api/invitations | 招待コード発行 |
| POST /api/registrations | 従業員承認/拒否 |
| POST /api/knowledge/ask | RAG質問 |
| POST /api/documents | ドキュメント登録 |

## セキュリティ

- **RLS (Row Level Security)**: 全テーブルでorg_id基準の分離
- **招待コード**: 8文字英数字、24時間有効、1回限り
- **レート制限**: 5回失敗で24時間ブロック
- **経営者承認**: 招待コード入力後、経営者が承認するまで登録不可

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# デプロイ
git push origin main
```

## 関連URL

- 本番: https://secretary-delta.vercel.app
- Supabase: https://supabase.com/dashboard/project/kbvaekypkszvzrwlbkug
- LINE Developers: https://developers.line.biz/console/
