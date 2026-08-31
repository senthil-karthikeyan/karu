-- name: CreateScreenplayKey :one
INSERT INTO screenplay_keys (
    screenplay_id,
    user_id,
    wrapped_key,
    key_iv,
    algorithm,
    version
) VALUES (
    $1, $2, $3, $4, $5, $6
)
RETURNING id, screenplay_id, user_id, wrapped_key, key_iv, algorithm, version, created_at, updated_at;

-- name: GetScreenplayKeyByScreenplayAndUser :one
SELECT id, screenplay_id, user_id, wrapped_key, key_iv, algorithm, version, created_at, updated_at
FROM screenplay_keys
WHERE screenplay_id = $1 AND user_id = $2;

-- name: UpsertScreenplayKey :one
INSERT INTO screenplay_keys (
    screenplay_id,
    user_id,
    wrapped_key,
    key_iv,
    algorithm,
    version
) VALUES (
    $1, $2, $3, $4, $5, $6
)
ON CONFLICT (screenplay_id, user_id) DO UPDATE
SET
    wrapped_key = EXCLUDED.wrapped_key,
    key_iv = EXCLUDED.key_iv,
    algorithm = EXCLUDED.algorithm,
    version = EXCLUDED.version,
    updated_at = NOW()
RETURNING id, screenplay_id, user_id, wrapped_key, key_iv, algorithm, version, created_at, updated_at;

-- name: DeleteScreenplayKey :exec
DELETE FROM screenplay_keys
WHERE screenplay_id = $1 AND user_id = $2;
