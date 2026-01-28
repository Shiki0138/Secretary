-- =============================================
-- 統合LINE公式アカウント - セキュリティ強化
-- =============================================

-- 1. 承認待ち従業員登録テーブル
CREATE TABLE IF NOT EXISTS pending_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    line_user_id VARCHAR(255) NOT NULL,
    line_display_name VARCHAR(255),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invitation_code_id UUID REFERENCES invitation_codes(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason TEXT
);

-- 2. 登録試行ログテーブル（監査用）
CREATE TABLE IF NOT EXISTS registration_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    line_user_id VARCHAR(255) NOT NULL,
    attempted_code VARCHAR(12),
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    failure_reason TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. レート制限用テーブル
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL, -- LINE user ID など
    action_type VARCHAR(50) NOT NULL, -- 'code_attempt', 'registration' など
    attempt_count INTEGER DEFAULT 1,
    first_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_until TIMESTAMP WITH TIME ZONE,
    UNIQUE(identifier, action_type)
);

-- 4. 招待コードテーブルに有効期限と1回限り使用フラグを追加
ALTER TABLE invitation_codes
ADD COLUMN IF NOT EXISTS is_single_use BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_pending_reg_line_user ON pending_registrations(line_user_id);
CREATE INDEX IF NOT EXISTS idx_pending_reg_org_status ON pending_registrations(org_id, status);
CREATE INDEX IF NOT EXISTS idx_reg_attempts_line_user ON registration_attempts(line_user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, action_type);

-- RLS
ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- 経営者は自分の組織の承認待ち登録を管理可能
CREATE POLICY "owners_manage_pending_registrations" ON pending_registrations
    FOR ALL USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role = 'owner')
    );

-- サービスロールは全アクセス可能（API用）
CREATE POLICY "service_role_pending_registrations" ON pending_registrations
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_registration_attempts" ON registration_attempts
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_rate_limits" ON rate_limits
    FOR ALL USING (auth.role() = 'service_role');

-- 5. 招待コードの有効期限をデフォルト24時間に設定する関数
CREATE OR REPLACE FUNCTION set_invitation_code_expiry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expires_at IS NULL THEN
        NEW.expires_at := NOW() + INTERVAL '24 hours';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_invitation_code_expiry
    BEFORE INSERT ON invitation_codes
    FOR EACH ROW
    EXECUTE FUNCTION set_invitation_code_expiry();
