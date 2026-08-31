-- name: CreateActivity :one
INSERT INTO activities (
    project_id,
    user_id,
    type,
    title,
    description,
    metadata
) VALUES (
    $1, $2, $3, $4, $5, sqlc.arg(metadata)::jsonb
)
RETURNING *;

-- name: ListActivitiesByProjectID :many
SELECT *
FROM activities
WHERE project_id = $1
ORDER BY created_at DESC;
