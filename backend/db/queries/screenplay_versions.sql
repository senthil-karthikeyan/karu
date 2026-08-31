-- name: CreateScreenplayVersion :one
INSERT INTO screenplay_versions (
    screenplay_id,
    version_number,
    title,
    content,
    created_by,
    is_encrypted,
    encryption_version,
    algorithm,
    iv,
    ciphertext
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
)
RETURNING id, screenplay_id, version_number, title, content, created_by, is_encrypted, encryption_version, algorithm, iv, ciphertext, created_at;

-- name: GetLatestVersionNumber :one
SELECT COALESCE(MAX(version_number), 0)::int AS latest_version
FROM screenplay_versions
WHERE screenplay_id = $1;

-- name: GetScreenplayVersionByID :one
SELECT id, screenplay_id, version_number, title, content, created_by, is_encrypted, encryption_version, algorithm, iv, ciphertext, created_at
FROM screenplay_versions
WHERE id = $1;

-- name: ListScreenplayVersionsByScreenplayID :many
SELECT id, screenplay_id, version_number, title, content, created_by, is_encrypted, encryption_version, algorithm, iv, ciphertext, created_at
FROM screenplay_versions
WHERE screenplay_id = $1
ORDER BY version_number DESC;
