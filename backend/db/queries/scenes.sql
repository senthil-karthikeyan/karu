-- name: CreateScene :one
INSERT INTO scenes (
    project_id,
    scene_number,
    slugline,
    location,
    time_of_day,
    summary,
    page_number
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
)
RETURNING *;

-- name: GetSceneByID :one
SELECT *
FROM scenes
WHERE id = $1;

-- name: ListScenesByProjectID :many
SELECT *
FROM scenes
WHERE project_id = $1
ORDER BY scene_number ASC;

-- name: UpdateScene :one
UPDATE scenes
SET
    scene_number = COALESCE($2, scene_number),
    slugline = COALESCE(NULLIF($3, ''), slugline),
    location = COALESCE($4, location),
    time_of_day = COALESCE(NULLIF($5, ''), time_of_day),
    summary = COALESCE($6, summary),
    page_number = COALESCE($7, page_number),
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteScene :exec
DELETE FROM scenes
WHERE id = $1;

-- name: DeleteScenesByProjectID :exec
DELETE FROM scenes
WHERE project_id = $1;
