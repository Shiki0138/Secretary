-- Encryption for Sensitive Data
-- Encrypts LINE credentials using pgcrypto

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted columns for LINE credentials
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS line_channel_secret_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS line_channel_access_token_encrypted BYTEA;

-- Create encryption key reference (store actual key in environment/vault)
-- The encryption key should be set as a database secret
-- In production, use Supabase Vault or similar secure key management

-- Function to encrypt data
CREATE OR REPLACE FUNCTION encrypt_sensitive(
  plaintext TEXT,
  encryption_key TEXT
) RETURNS BYTEA AS $$
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_encrypt(plaintext, encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt data
CREATE OR REPLACE FUNCTION decrypt_sensitive(
  ciphertext BYTEA,
  encryption_key TEXT
) RETURNS TEXT AS $$
BEGIN
  IF ciphertext IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_decrypt(ciphertext, encryption_key);
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL if decryption fails (wrong key, corrupted data)
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration function to encrypt existing LINE credentials
-- Should be run manually with the encryption key
CREATE OR REPLACE FUNCTION migrate_line_credentials(encryption_key TEXT)
RETURNS TABLE(org_id UUID, migrated BOOLEAN) AS $$
DECLARE
  org RECORD;
BEGIN
  FOR org IN
    SELECT id, line_channel_secret, line_channel_access_token
    FROM organizations
    WHERE line_channel_secret IS NOT NULL
      AND line_channel_secret_encrypted IS NULL
  LOOP
    UPDATE organizations
    SET
      line_channel_secret_encrypted = encrypt_sensitive(org.line_channel_secret, encryption_key),
      line_channel_access_token_encrypted = encrypt_sensitive(org.line_channel_access_token, encryption_key)
    WHERE id = org.id;

    org_id := org.id;
    migrated := TRUE;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- After migration is complete, drop the plaintext columns:
-- ALTER TABLE organizations DROP COLUMN line_channel_secret;
-- ALTER TABLE organizations DROP COLUMN line_channel_access_token;

-- Create view for secure access to LINE credentials (requires decryption key)
CREATE OR REPLACE VIEW organization_line_credentials AS
SELECT
  id,
  name,
  slug,
  line_channel_id,
  -- Encrypted columns - require decryption at application layer
  line_channel_secret_encrypted,
  line_channel_access_token_encrypted
FROM organizations;

-- Revoke direct table access from non-admin roles
-- REVOKE ALL ON organizations FROM authenticated;
-- GRANT SELECT ON organization_line_credentials TO authenticated;

COMMENT ON COLUMN organizations.line_channel_secret_encrypted IS 'Encrypted LINE channel secret. Use decrypt_sensitive() with key to access.';
COMMENT ON COLUMN organizations.line_channel_access_token_encrypted IS 'Encrypted LINE access token. Use decrypt_sensitive() with key to access.';
