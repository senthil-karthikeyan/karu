-- name: CreateScreenplayVersion :one
INSERT INTO screenplay_versions (
    screenplay_id,
    version_number,
    title,
    content,
    created_by
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING id, screenplay_id, version_number, title, content, created_by, created_at;

-- name: GetLatestVersionNumber :one
SELECT COALESCE(MAX(version_number), 0)::int AS latest_version
FROM screenplay_versions
WHERE screenplay_id = $1;

-- name: GetScreenplayVersionByID :one
SELECT id, screenplay_id, version_number, title, content, created_by, created_at
FROM screenplay_versions
WHERE id = $1;

-- name: ListScreenplayVersionsByScreenplayID :many
SELECT id, screenplay_id, version_number, title, content, created_by, created_at
FROM screenplay_versions
WHERE screenplay_id = $1
ORDER BY version_number DESC;
