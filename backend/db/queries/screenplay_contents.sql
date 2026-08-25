-- name: CreateScreenplayContent :one
INSERT INTO screenplay_contents (
    screenplay_id,
    content,
    revision
) VALUES (
    $1, $2, $3
)
RETURNING id, screenplay_id, content, revision, updated_at;

-- name: GetScreenplayContent :one
SELECT id, screenplay_id, content, revision, updated_at
FROM screenplay_contents
WHERE screenplay_id = $1;

-- name: UpdateScreenplayContentWithRevision :one
UPDATE screenplay_contents
SET
    content = $3,
    revision = revision + 1,
    updated_at = NOW()
WHERE screenplay_id = $1 AND revision = $2
RETURNING id, screenplay_id, content, revision, updated_at;

-- name: ForceSetScreenplayContent :one
UPDATE screenplay_contents
SET
    content = $2,
    revision = revision + 1,
    updated_at = NOW()
WHERE screenplay_id = $1
RETURNING id, screenplay_id, content, revision, updated_at;
