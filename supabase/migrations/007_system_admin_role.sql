-- Add system_admin role for original message access
-- This role can view original (untranslated) messages for audit/support purposes

-- Update the role constraint to include system_admin
ALTER TABLE users 
  DROP CONSTRAINT IF EXISTS users_role_check;
  
ALTER TABLE users 
  ADD CONSTRAINT users_role_check 
    CHECK (role IN ('owner', 'manager', 'staff', 'system_admin'));

-- Add comment explaining the role hierarchy
COMMENT ON COLUMN users.role IS 'User role: owner (organization owner), manager, staff (regular employee), system_admin (platform admin with full access including original messages)';
