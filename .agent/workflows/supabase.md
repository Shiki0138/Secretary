---
description: Supabaseマイグレーションを作成・適用
---
// turbo-all

## 新規マイグレーション作成

1. マイグレーションファイルを作成
ファイル名形式: `supabase/migrations/XXX_description.sql`
XXXは連番（現在最新: 008）

2. SQLを記述
- テーブル作成: `CREATE TABLE IF NOT EXISTS`
- カラム追加: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- RLSポリシー設定: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`

## マイグレーション適用

SupabaseダッシュボードのSQL Editorで実行:
https://supabase.com/dashboard/project/kbvaekypkszvzrwlbkug/sql

## 既存テーブル

- organizations
- users
- conversations
- messages
- documents
- invitation_codes
- pending_registrations
- registration_attempts
- rate_limits
