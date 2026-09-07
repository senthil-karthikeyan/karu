-- name: GetUserEncryptionKeys :one
SELECT user_id, salt, iterations, hash_algorithm, public_key, encrypted_private_key, private_key_iv, algorithm, version, created_at, updated_at
FROM user_encryption_keys
WHERE user_id = $1;

-- name: GetUserPublicKey :one
SELECT user_id, public_key, algorithm, version
FROM user_encryption_keys
WHERE user_id = $1;

-- name: GetUserEncryptionSalt :one
SELECT user_id, salt, iterations, hash_algorithm, created_at, updated_at
FROM user_encryption_keys
WHERE user_id = $1;

-- name: UpsertUserEncryptionSalt :one
INSERT INTO user_encryption_keys (
    user_id,
    salt,
    iterations,
    hash_algorithm
) VALUES (
    $1, $2, $3, $4
)
ON CONFLICT (user_id) DO UPDATE
SET
    salt = EXCLUDED.salt,
    iterations = EXCLUDED.iterations,
    hash_algorithm = EXCLUDED.hash_algorithm,
    updated_at = NOW()
RETURNING user_id, salt, iterations, hash_algorithm, created_at, updated_at;

-- name: UpsertUserEncryptionKeyPair :one
INSERT INTO user_encryption_keys (
    user_id,
    salt,
    public_key,
    encrypted_private_key,
    private_key_iv,
    algorithm,
    version
) VALUES (
    $1, '', $2, $3, $4, $5, $6
)
ON CONFLICT (user_id) DO UPDATE
SET
    public_key = EXCLUDED.public_key,
    encrypted_private_key = EXCLUDED.encrypted_private_key,
    private_key_iv = EXCLUDED.private_key_iv,
    algorithm = EXCLUDED.algorithm,
    version = EXCLUDED.version,
    updated_at = NOW()
RETURNING user_id, salt, iterations, hash_algorithm, public_key, encrypted_private_key, private_key_iv, algorithm, version, created_at, updated_at;

-- name: UpsertUserEncryptionKeys :one
INSERT INTO user_encryption_keys (
    user_id,
    salt,
    iterations,
    hash_algorithm,
    public_key,
    encrypted_private_key,
    private_key_iv,
    algorithm,
    version
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
)
ON CONFLICT (user_id) DO UPDATE
SET
    salt = EXCLUDED.salt,
    iterations = EXCLUDED.iterations,
    hash_algorithm = EXCLUDED.hash_algorithm,
    public_key = EXCLUDED.public_key,
    encrypted_private_key = EXCLUDED.encrypted_private_key,
    private_key_iv = EXCLUDED.private_key_iv,
    algorithm = EXCLUDED.algorithm,
    version = EXCLUDED.version,
    updated_at = NOW()
RETURNING user_id, salt, iterations, hash_algorithm, public_key, encrypted_private_key, private_key_iv, algorithm, version, created_at, updated_at;

-- name: UpdateUserEncryptedPrivateKey :one
UPDATE user_encryption_keys
SET
    salt = $2,
    iterations = $3,
    encrypted_private_key = $4,
    private_key_iv = $5,
    updated_at = NOW()
WHERE user_id = $1
RETURNING user_id, salt, iterations, hash_algorithm, public_key, encrypted_private_key, private_key_iv, algorithm, version, created_at, updated_at;
