-- name: CreateProject :one
INSERT INTO projects (
    user_id,
    title,
    logline,
    genre,
    format,
    status,
    synopsis,
    cover_image,
    screenplay_content,
    page_count,
    word_count,
    scene_count,
    last_edited_scene
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
)
RETURNING *;

-- name: GetProjectByID :one
SELECT *
FROM projects
WHERE id = $1;

-- name: GetProjectByIDAndUserID :one
SELECT *
FROM projects
WHERE id = $1 AND user_id = $2;

-- name: ListProjectsByUserID :many
SELECT *
FROM projects
WHERE user_id = $1
ORDER BY updated_at DESC;

-- name: UpdateProject :one
UPDATE projects
SET
    title = COALESCE(NULLIF($3, ''), title),
    logline = COALESCE($4, logline),
    genre = COALESCE(NULLIF($5, ''), genre),
    format = COALESCE(NULLIF($6, ''), format),
    status = COALESCE(NULLIF($7, ''), status),
    synopsis = COALESCE($8, synopsis),
    cover_image = COALESCE($9, cover_image),
    updated_at = NOW()
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: UpdateProjectContent :one
UPDATE projects
SET
    screenplay_content = $3,
    page_count = $4,
    word_count = $5,
    scene_count = $6,
    last_edited_scene = $7,
    updated_at = NOW()
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: DeleteProject :exec
DELETE FROM projects
WHERE id = $1 AND user_id = $2;
