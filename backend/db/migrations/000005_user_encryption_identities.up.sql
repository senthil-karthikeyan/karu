-- 1. User Encryption Identities Table (stores ECDH public key and UEK-wrapped private key)
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

CREATE INDEX IF NOT EXISTS idx_user_encryption_identities_user_id ON user_encryption_identities(user_id);
