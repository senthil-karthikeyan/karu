-- Migration 000013: E2EE Schema Revamp

-- 1. Backup unencrypted content before dropping columns
CREATE TABLE IF NOT EXISTS _backup_unencrypted_screenplay_contents AS
SELECT id, screenplay_id, content, revision, updated_at
FROM screenplay_contents
WHERE is_encrypted = FALSE;

CREATE TABLE IF NOT EXISTS _backup_unencrypted_screenplay_versions AS
SELECT id, screenplay_id, version_number, title, content, created_by, created_at
FROM screenplay_versions
WHERE is_encrypted = FALSE;

-- 2. Consolidate user_encryption_metadata + user_encryption_identities into user_encryption_keys
CREATE TABLE IF NOT EXISTS user_encryption_keys (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    salt TEXT NOT NULL,
    iterations INT NOT NULL DEFAULT 600000,
    hash_algorithm VARCHAR(32) NOT NULL DEFAULT 'SHA-256',
    public_key TEXT NOT NULL DEFAULT '',
    encrypted_private_key TEXT NOT NULL DEFAULT '',
    private_key_iv TEXT NOT NULL DEFAULT '',
    algorithm VARCHAR(32) NOT NULL DEFAULT 'ECDH-P256',
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrate existing data
INSERT INTO user_encryption_keys (
    user_id, salt, iterations, hash_algorithm,
    public_key, encrypted_private_key, private_key_iv, algorithm, version,
    created_at, updated_at
)
SELECT
    m.user_id,
    m.salt,
    m.iterations,
    m.hash_algorithm,
    COALESCE(i.public_key, ''),
    COALESCE(i.encrypted_private_key, ''),
    COALESCE(i.key_iv, ''),
    COALESCE(i.algorithm, 'ECDH-P256'),
    COALESCE(i.version, 1),
    m.created_at,
    m.updated_at
FROM user_encryption_metadata m
LEFT JOIN user_encryption_identities i ON m.user_id = i.user_id
ON CONFLICT (user_id) DO NOTHING;

-- Drop deprecated metadata and identities tables
DROP TABLE IF EXISTS user_encryption_metadata CASCADE;
DROP TABLE IF EXISTS user_encryption_identities CASCADE;

-- 3. Create user_recovery_credentials table
CREATE TABLE IF NOT EXISTS user_recovery_credentials (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    recovery_salt TEXT NOT NULL,
    recovery_iterations INT NOT NULL DEFAULT 600000,
    recovery_hash_algorithm VARCHAR(32) NOT NULL DEFAULT 'SHA-256',
    wrapped_private_key TEXT NOT NULL,
    recovery_key_iv TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_recovery_credentials_user_id ON user_recovery_credentials(user_id);

-- 4. Rename screenplay_keys to screenplay_access_keys & add sharing columns
ALTER TABLE screenplay_keys RENAME TO screenplay_access_keys;

-- Update constraint name
ALTER TABLE screenplay_access_keys RENAME CONSTRAINT uq_screenplay_keys_screenplay_user TO uq_screenplay_access_keys_screenplay_user;

ALTER TABLE screenplay_access_keys
    ADD COLUMN IF NOT EXISTS ephemeral_public_key TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS role VARCHAR(16) NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'editor', 'viewer')),
    ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE screenplay_access_keys
    ALTER COLUMN algorithm SET DEFAULT 'ECIES-P256-AES-GCM';

-- Ensure all existing rows have role 'owner'
UPDATE screenplay_access_keys SET role = 'owner' WHERE role IS NULL OR role = '';

-- Re-index
DROP INDEX IF EXISTS idx_screenplay_keys_screenplay_id;
DROP INDEX IF EXISTS idx_screenplay_keys_user_id;
DROP INDEX IF EXISTS idx_screenplay_keys_sp_user;

CREATE INDEX IF NOT EXISTS idx_screenplay_access_keys_screenplay_id ON screenplay_access_keys(screenplay_id);
CREATE INDEX IF NOT EXISTS idx_screenplay_access_keys_user_id ON screenplay_access_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_screenplay_access_keys_sp_user ON screenplay_access_keys(screenplay_id, user_id);

-- 5. Drop plaintext content column and is_encrypted from screenplay_contents
ALTER TABLE screenplay_contents
    DROP COLUMN IF EXISTS content,
    DROP COLUMN IF EXISTS is_encrypted;

-- 6. Drop plaintext content column and is_encrypted from screenplay_versions
ALTER TABLE screenplay_versions
    DROP COLUMN IF EXISTS content,
    DROP COLUMN IF EXISTS is_encrypted;
