-- name: CreateRefreshToken :one
INSERT INTO refresh_tokens (
    user_id,
    token_hash,
    expires_at
) VALUES (
    $1, $2, $3
)
RETURNING id, user_id, token_hash, expires_at, revoked_at, created_at, last_used_at;

-- name: GetRefreshTokenByHash :one
SELECT id, user_id, token_hash, expires_at, revoked_at, created_at, last_used_at
FROM refresh_tokens
WHERE token_hash = $1;

-- name: RevokeRefreshToken :one
UPDATE refresh_tokens
SET
    revoked_at = NOW(),
    last_used_at = NOW()
WHERE token_hash = $1
RETURNING id, user_id, token_hash, expires_at, revoked_at, created_at, last_used_at;

-- name: RevokeAllUserRefreshTokens :exec
UPDATE refresh_tokens
SET
    revoked_at = NOW()
WHERE user_id = $1 AND revoked_at IS NULL;
