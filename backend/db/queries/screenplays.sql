-- name: CreateScreenplay :one
INSERT INTO screenplays (
    project_id,
    title,
    description
) VALUES (
    $1, $2, $3
)
RETURNING id, project_id, title, description, created_at, updated_at;

-- name: GetScreenplayByID :one
SELECT id, project_id, title, description, created_at, updated_at
FROM screenplays
WHERE id = $1;

-- name: GetScreenplayByIDAndUserID :one
SELECT s.id, s.project_id, s.title, s.description, s.created_at, s.updated_at, p.user_id
FROM screenplays s
JOIN projects p ON p.id = s.project_id
WHERE s.id = $1 AND p.user_id = $2;

-- name: ListScreenplaysByProjectID :many
SELECT s.id, s.project_id, s.title, s.description, s.created_at, s.updated_at
FROM screenplays s
JOIN projects p ON p.id = s.project_id
WHERE s.project_id = $1 AND p.user_id = $2
ORDER BY s.created_at ASC;

-- name: UpdateScreenplay :one
UPDATE screenplays
SET
    title = COALESCE(NULLIF($2, ''), title),
    description = COALESCE($3, description),
    updated_at = NOW()
WHERE id = $1
RETURNING id, project_id, title, description, created_at, updated_at;

-- name: DeleteScreenplay :exec
DELETE FROM screenplays
WHERE id = $1;
