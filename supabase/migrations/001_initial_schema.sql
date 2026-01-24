-- AI翻訳秘書システム - マルチテナントスキーマ
-- Supabase Migration

-- 1. 組織（テナント）テーブル
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URLフレンドリーな識別子
  industry TEXT DEFAULT 'dental',
  line_channel_id TEXT,
  line_channel_secret TEXT,
  line_channel_access_token TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ユーザー（従業員・経営者）テーブル
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
  email TEXT,
  display_name TEXT NOT NULL,
  line_user_id TEXT, -- LINE連携用
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, email),
  UNIQUE(org_id, line_user_id)
);

-- 3. 会話スレッドテーブル
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT, -- 相談の件名
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. メッセージテーブル
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  direction TEXT NOT NULL CHECK (direction IN ('employee_to_owner', 'owner_to_employee', 'system')),
  original_text TEXT, -- 元のテキスト（翻訳前）※暗号化推奨
  translated_text TEXT NOT NULL, -- 翻訳後のテキスト
  is_confirmed BOOLEAN DEFAULT FALSE, -- 確定済みフラグ
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 就業規則ドキュメントテーブル
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('employment_rules', 'salary_rules', 'leave_policy', 'other')),
  file_path TEXT, -- Supabase Storage path
  content TEXT, -- 抽出されたテキスト内容
  is_active BOOLEAN DEFAULT TRUE,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ドキュメントチャンク（RAG用）テーブル
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 全社通知テーブル
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  original_text TEXT,
  translated_text TEXT NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 通知既読テーブル
CREATE TABLE announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

-- 9. 給与明細テーブル
CREATE TABLE payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL, -- '2026-01' 形式
  data JSONB NOT NULL, -- 給与明細データ（暗号化推奨）
  file_path TEXT, -- PDF path
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id, year_month)
);

-- 10. シフトテーブル
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'requested')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id, shift_date)
);

-- 11. 規則確認署名テーブル
CREATE TABLE document_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE(document_id, user_id)
);

-- インデックス
CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_line ON users(line_user_id);
CREATE INDEX idx_conversations_org ON conversations(org_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_documents_org ON documents(org_id);
CREATE INDEX idx_document_chunks_doc ON document_chunks(document_id);
CREATE INDEX idx_announcements_org ON announcements(org_id);
CREATE INDEX idx_payslips_user ON payslips(user_id, year_month);
CREATE INDEX idx_shifts_user_date ON shifts(user_id, shift_date);

-- RLS (Row Level Security) 有効化
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_acknowledgments ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（テナント分離）
-- 各テーブルに org_id ベースのポリシーを設定
CREATE POLICY "Users can only access own org" ON users
  FOR ALL USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Conversations in own org" ON conversations
  FOR ALL USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Messages in own org" ON messages
  FOR ALL USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Documents in own org" ON documents
  FOR ALL USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Announcements in own org" ON announcements
  FOR ALL USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Payslips for own user" ON payslips
  FOR SELECT USING (user_id = auth.uid() OR org_id = (SELECT org_id FROM users WHERE id = auth.uid() AND role = 'owner'));

CREATE POLICY "Shifts in own org" ON shifts
  FOR ALL USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));
