-- name: GetUserRecoveryCredentials :one
SELECT user_id, recovery_salt, recovery_iterations, recovery_hash_algorithm, wrapped_private_key, recovery_key_iv, created_at, updated_at
FROM user_recovery_credentials
WHERE user_id = $1;

-- name: GetUserRecoveryCredentialsByEmail :one
SELECT urc.user_id, urc.recovery_salt, urc.recovery_iterations, urc.recovery_hash_algorithm, urc.wrapped_private_key, urc.recovery_key_iv, urc.created_at, urc.updated_at
FROM user_recovery_credentials urc
JOIN users u ON u.id = urc.user_id
WHERE u.email = $1;

-- name: UpsertUserRecoveryCredentials :one
INSERT INTO user_recovery_credentials (
    user_id,
    recovery_salt,
    recovery_iterations,
    recovery_hash_algorithm,
    wrapped_private_key,
    recovery_key_iv
) VALUES (
    $1, $2, $3, $4, $5, $6
)
ON CONFLICT (user_id) DO UPDATE
SET
    recovery_salt = EXCLUDED.recovery_salt,
    recovery_iterations = EXCLUDED.recovery_iterations,
    recovery_hash_algorithm = EXCLUDED.recovery_hash_algorithm,
    wrapped_private_key = EXCLUDED.wrapped_private_key,
    recovery_key_iv = EXCLUDED.recovery_key_iv,
    updated_at = NOW()
RETURNING user_id, recovery_salt, recovery_iterations, recovery_hash_algorithm, wrapped_private_key, recovery_key_iv, created_at, updated_at;
