-- name: CreateAuthIdentity :one
INSERT INTO auth_identities (
    user_id,
    provider,
    provider_user_id,
    password_hash
) VALUES (
    $1, $2, $3, $4
)
RETURNING id, user_id, provider, provider_user_id, password_hash, created_at, updated_at;

-- name: GetAuthIdentityByProvider :one
SELECT id, user_id, provider, provider_user_id, password_hash, created_at, updated_at
FROM auth_identities
WHERE provider = $1 AND provider_user_id = $2;

-- name: GetAuthIdentitiesByUserID :many
SELECT id, user_id, provider, provider_user_id, password_hash, created_at, updated_at
FROM auth_identities
WHERE user_id = $1;

-- name: UpdateAuthIdentityPassword :one
UPDATE auth_identities
SET
    password_hash = $3,
    updated_at = NOW()
WHERE user_id = $1 AND provider = $2
RETURNING id, user_id, provider, provider_user_id, password_hash, created_at, updated_at;
