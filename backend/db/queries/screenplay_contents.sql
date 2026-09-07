-- name: CreateScreenplayContent :one
INSERT INTO screenplay_contents (
    screenplay_id,
    revision,
    encryption_version,
    algorithm,
    iv,
    ciphertext
) VALUES (
    $1, $2, $3, $4, $5, $6
)
RETURNING id, screenplay_id, revision, encryption_version, algorithm, iv, ciphertext, updated_at;

-- name: GetScreenplayContent :one
SELECT id, screenplay_id, revision, encryption_version, algorithm, iv, ciphertext, updated_at
FROM screenplay_contents
WHERE screenplay_id = $1;

-- name: UpdateEncryptedScreenplayContentWithRevision :one
UPDATE screenplay_contents
SET
    encryption_version = $3,
    algorithm = $4,
    iv = $5,
    ciphertext = $6,
    revision = revision + 1,
    updated_at = NOW()
WHERE screenplay_id = $1 AND revision = $2
RETURNING id, screenplay_id, revision, encryption_version, algorithm, iv, ciphertext, updated_at;

-- name: ForceSetScreenplayContent :one
UPDATE screenplay_contents
SET
    encryption_version = $2,
    algorithm = $3,
    iv = $4,
    ciphertext = $5,
    revision = revision + 1,
    updated_at = NOW()
WHERE screenplay_id = $1
RETURNING id, screenplay_id, revision, encryption_version, algorithm, iv, ciphertext, updated_at;
