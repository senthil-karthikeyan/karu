-- name: GetUserEncryptionIdentity :one
SELECT user_id, public_key, encrypted_private_key, key_iv, algorithm, version, created_at, updated_at
FROM user_encryption_identities
WHERE user_id = $1;

-- name: GetUserPublicKey :one
SELECT user_id, public_key, algorithm, version
FROM user_encryption_identities
WHERE user_id = $1;

-- name: UpsertUserEncryptionIdentity :one
INSERT INTO user_encryption_identities (
    user_id,
    public_key,
    encrypted_private_key,
    key_iv,
    algorithm,
    version
) VALUES (
    $1, $2, $3, $4, $5, $6
)
ON CONFLICT (user_id) DO UPDATE
SET
    public_key = EXCLUDED.public_key,
    encrypted_private_key = EXCLUDED.encrypted_private_key,
    key_iv = EXCLUDED.key_iv,
    algorithm = EXCLUDED.algorithm,
    version = EXCLUDED.version,
    updated_at = NOW()
RETURNING user_id, public_key, encrypted_private_key, key_iv, algorithm, version, created_at, updated_at;
