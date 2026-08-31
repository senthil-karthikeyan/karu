-- 1. User Encryption Metadata Table (stores salt and PBKDF2 parameters per user)
CREATE TABLE IF NOT EXISTS user_encryption_metadata (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    salt TEXT NOT NULL,
    iterations INT NOT NULL DEFAULT 600000,
    hash_algorithm VARCHAR(32) NOT NULL DEFAULT 'SHA-256',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Screenplay Keys Table (stores wrapped Screenplay Content Key per screenplay per user)
CREATE TABLE IF NOT EXISTS screenplay_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    screenplay_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wrapped_key TEXT NOT NULL,
    key_iv TEXT NOT NULL,
    algorithm VARCHAR(32) NOT NULL DEFAULT 'AES-GCM',
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_screenplay_keys_screenplay_user UNIQUE (screenplay_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_screenplay_keys_screenplay_id ON screenplay_keys(screenplay_id);
CREATE INDEX IF NOT EXISTS idx_screenplay_keys_user_id ON screenplay_keys(user_id);

-- 3. Extend Screenplay Contents Table for E2EE Ciphertext & Metadata
ALTER TABLE screenplay_contents
    ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS encryption_version INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS algorithm VARCHAR(32) NOT NULL DEFAULT 'AES-GCM',
    ADD COLUMN IF NOT EXISTS iv TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS ciphertext TEXT NOT NULL DEFAULT '';

-- 4. Extend Screenplay Versions Table for E2EE Ciphertext & Metadata
ALTER TABLE screenplay_versions
    ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS encryption_version INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS algorithm VARCHAR(32) NOT NULL DEFAULT 'AES-GCM',
    ADD COLUMN IF NOT EXISTS iv TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS ciphertext TEXT NOT NULL DEFAULT '';
