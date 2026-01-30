-- =============================================
-- 従業員会話状態管理テーブル
-- =============================================

-- 従業員との会話状態を管理（意図確認→補完→承認フロー用）
CREATE TABLE IF NOT EXISTS employee_conversation_state (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    state VARCHAR(20) NOT NULL DEFAULT 'idle' CHECK (state IN ('idle', 'gathering', 'confirming')),
    intent_type VARCHAR(50), -- shift_change, leave_request, question, report, other
    context JSONB DEFAULT '{}', -- 収集済み情報
    pending_message TEXT, -- 送信待ちメッセージ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_emp_conv_state_employee ON employee_conversation_state(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_conv_state_org ON employee_conversation_state(org_id, state);

-- RLS
ALTER TABLE employee_conversation_state ENABLE ROW LEVEL SECURITY;

-- サービスロールは全アクセス可能
CREATE POLICY "service_role_employee_conversation_state" ON employee_conversation_state
    FOR ALL USING (auth.role() = 'service_role');
