-- =============================================
-- LINE確認付き返信フロー用テーブル
-- =============================================

-- 経営者のLINE連携情報を追加
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_line_linked BOOLEAN DEFAULT FALSE;

-- 返信待機テーブル（経営者の確認待ち状態を管理）
CREATE TABLE IF NOT EXISTS pending_replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_message TEXT NOT NULL,        -- 経営者が入力した原文
    translated_message TEXT NOT NULL,      -- AI翻訳後のメッセージ
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'modified')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE
);

-- 経営者の会話状態管理（どの従業員と会話中か）
CREATE TABLE IF NOT EXISTS owner_conversation_state (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    current_employee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    state TEXT NOT NULL DEFAULT 'idle' CHECK (state IN ('idle', 'replying', 'confirming')),
    pending_reply_id UUID REFERENCES pending_replies(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(owner_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_pending_replies_status ON pending_replies(status);
CREATE INDEX IF NOT EXISTS idx_pending_replies_owner ON pending_replies(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_state_owner ON owner_conversation_state(owner_id);

-- RLS
ALTER TABLE pending_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_conversation_state ENABLE ROW LEVEL SECURITY;

-- 経営者は自分の組織のpending_repliesを管理可能
CREATE POLICY "owners_manage_pending_replies" ON pending_replies
    FOR ALL USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role = 'owner')
    );

-- サービスロールは全アクセス可能
CREATE POLICY "service_role_pending_replies" ON pending_replies
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_owner_state" ON owner_conversation_state
    FOR ALL USING (auth.role() = 'service_role');
