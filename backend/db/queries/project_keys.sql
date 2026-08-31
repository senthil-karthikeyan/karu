-- name: GetProjectKeyByProjectAndUser :one
SELECT id, project_id, user_id, wrapped_key, key_iv, algorithm, version, created_at, updated_at
FROM project_keys
WHERE project_id = $1 AND user_id = $2;

-- name: UpsertProjectKey :one
INSERT INTO project_keys (
    project_id,
    user_id,
    wrapped_key,
    key_iv,
    algorithm,
    version
) VALUES (
    $1, $2, $3, $4, $5, $6
)
ON CONFLICT (project_id, user_id) DO UPDATE
SET
    wrapped_key = EXCLUDED.wrapped_key,
    key_iv = EXCLUDED.key_iv,
    algorithm = EXCLUDED.algorithm,
    version = EXCLUDED.version,
    updated_at = NOW()
RETURNING id, project_id, user_id, wrapped_key, key_iv, algorithm, version, created_at, updated_at;

-- name: DeleteProjectKey :exec
DELETE FROM project_keys
WHERE project_id = $1 AND user_id = $2;
