-- name: GetUserEncryptionMetadata :one
SELECT user_id, salt, iterations, hash_algorithm, created_at, updated_at
FROM user_encryption_metadata
WHERE user_id = $1;

-- name: CreateUserEncryptionMetadata :one
INSERT INTO user_encryption_metadata (
    user_id,
    salt,
    iterations,
    hash_algorithm
) VALUES (
    $1, $2, $3, $4
)
RETURNING user_id, salt, iterations, hash_algorithm, created_at, updated_at;

-- name: UpsertUserEncryptionMetadata :one
INSERT INTO user_encryption_metadata (
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
