-- 招待コードテーブル
CREATE TABLE IF NOT EXISTS invitation_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(12) NOT NULL UNIQUE,
    max_uses INTEGER DEFAULT 100,
    used_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- プラン情報を組織テーブルに追加
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS max_employees INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS line_channel_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS line_channel_secret TEXT,
ADD COLUMN IF NOT EXISTS line_channel_access_token TEXT,
ADD COLUMN IF NOT EXISTS uses_shared_line BOOLEAN DEFAULT TRUE;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_org_id ON invitation_codes(org_id);

-- RLS
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;

-- 招待コードは組織オーナーのみ作成・閲覧可能
CREATE POLICY "owners_manage_invitation_codes" ON invitation_codes
    FOR ALL USING (
        org_id IN (
            SELECT org_id FROM users 
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- 招待コード検証用（認証不要で検証可能）
CREATE POLICY "anyone_can_verify_codes" ON invitation_codes
    FOR SELECT USING (
        expires_at IS NULL OR expires_at > NOW()
    );
