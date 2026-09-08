-- Rollback Migration 000013: E2EE Schema Revamp

-- 1. Restore content & is_encrypted to screenplay_contents
ALTER TABLE screenplay_contents
    ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN NOT NULL DEFAULT TRUE;

-- Restore from backup if exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_backup_unencrypted_screenplay_contents') THEN
        UPDATE screenplay_contents sc
        SET content = b.content, is_encrypted = FALSE
        FROM _backup_unencrypted_screenplay_contents b
        WHERE sc.id = b.id;
        DROP TABLE IF EXISTS _backup_unencrypted_screenplay_contents CASCADE;
    END IF;
END $$;

-- 2. Restore content & is_encrypted to screenplay_versions
ALTER TABLE screenplay_versions
    ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_backup_unencrypted_screenplay_versions') THEN
        UPDATE screenplay_versions sv
        SET content = b.content, is_encrypted = FALSE
        FROM _backup_unencrypted_screenplay_versions b
        WHERE sv.id = b.id;
        DROP TABLE IF EXISTS _backup_unencrypted_screenplay_versions CASCADE;
    END IF;
END $$;

-- 3. Revert screenplay_access_keys back to screenplay_keys
ALTER TABLE screenplay_access_keys
    DROP COLUMN IF EXISTS ephemeral_public_key,
    DROP COLUMN IF EXISTS role,
    DROP COLUMN IF EXISTS granted_by;

ALTER TABLE screenplay_access_keys
    ALTER COLUMN algorithm SET DEFAULT 'AES-GCM';

DROP INDEX IF EXISTS idx_screenplay_access_keys_screenplay_id;
DROP INDEX IF EXISTS idx_screenplay_access_keys_user_id;
DROP INDEX IF EXISTS idx_screenplay_access_keys_sp_user;

ALTER TABLE screenplay_access_keys RENAME CONSTRAINT uq_screenplay_access_keys_screenplay_user TO uq_screenplay_keys_screenplay_user;
ALTER TABLE screenplay_access_keys RENAME TO screenplay_keys;

CREATE INDEX IF NOT EXISTS idx_screenplay_keys_screenplay_id ON screenplay_keys(screenplay_id);
CREATE INDEX IF NOT EXISTS idx_screenplay_keys_user_id ON screenplay_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_screenplay_keys_sp_user ON screenplay_keys(screenplay_id, user_id);

-- 4. Drop user_recovery_credentials
DROP TABLE IF EXISTS user_recovery_credentials CASCADE;

-- 5. Restore user_encryption_metadata & user_encryption_identities
CREATE TABLE IF NOT EXISTS user_encryption_metadata (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    salt TEXT NOT NULL,
    iterations INT NOT NULL DEFAULT 600000,
    hash_algorithm VARCHAR(32) NOT NULL DEFAULT 'SHA-256',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_encryption_identities (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL,
    encrypted_private_key TEXT NOT NULL,
    key_iv TEXT NOT NULL,
    algorithm VARCHAR(32) NOT NULL DEFAULT 'ECDH-P256',
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO user_encryption_metadata (user_id, salt, iterations, hash_algorithm, created_at, updated_at)
SELECT user_id, salt, iterations, hash_algorithm, created_at, updated_at
FROM user_encryption_keys
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_encryption_identities (user_id, public_key, encrypted_private_key, key_iv, algorithm, version, created_at, updated_at)
SELECT user_id, public_key, encrypted_private_key, private_key_iv, algorithm, version, created_at, updated_at
FROM user_encryption_keys
ON CONFLICT (user_id) DO NOTHING;

DROP TABLE IF EXISTS user_encryption_keys CASCADE;
