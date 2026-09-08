-- name: GetScreenplayAccessKeyByScreenplayAndUser :one
SELECT id, screenplay_id, user_id, wrapped_key, key_iv, ephemeral_public_key, algorithm, version, role, granted_by, created_at, updated_at
FROM screenplay_access_keys
WHERE screenplay_id = $1 AND user_id = $2;

-- name: UpsertScreenplayAccessKey :one
INSERT INTO screenplay_access_keys (
    screenplay_id,
    user_id,
    wrapped_key,
    key_iv,
    ephemeral_public_key,
    algorithm,
    version,
    role,
    granted_by
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
)
ON CONFLICT (screenplay_id, user_id) DO UPDATE
SET
    wrapped_key = EXCLUDED.wrapped_key,
    key_iv = EXCLUDED.key_iv,
    ephemeral_public_key = EXCLUDED.ephemeral_public_key,
    algorithm = EXCLUDED.algorithm,
    version = EXCLUDED.version,
    role = EXCLUDED.role,
    granted_by = EXCLUDED.granted_by,
    updated_at = NOW()
RETURNING id, screenplay_id, user_id, wrapped_key, key_iv, ephemeral_public_key, algorithm, version, role, granted_by, created_at, updated_at;

-- name: ListScreenplayAccessKeysByScreenplay :many
SELECT
    sak.id, sak.screenplay_id, sak.user_id, sak.role, sak.granted_by, sak.created_at, sak.updated_at,
    u.email AS user_email, u.name AS user_name, u.avatar_url AS user_avatar_url
FROM screenplay_access_keys sak
JOIN users u ON u.id = sak.user_id
WHERE sak.screenplay_id = $1
ORDER BY sak.created_at ASC;

-- name: DeleteScreenplayAccessKey :exec
DELETE FROM screenplay_access_keys
WHERE screenplay_id = $1 AND user_id = $2;

-- name: GetUserRoleForScreenplay :one
SELECT role
FROM screenplay_access_keys
WHERE screenplay_id = $1 AND user_id = $2;
