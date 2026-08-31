-- name: CreateScreenplayContent :one
INSERT INTO screenplay_contents (
    screenplay_id,
    content,
    revision,
    is_encrypted,
    encryption_version,
    algorithm,
    iv,
    ciphertext
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
)
RETURNING id, screenplay_id, content, revision, is_encrypted, encryption_version, algorithm, iv, ciphertext, updated_at;

-- name: GetScreenplayContent :one
SELECT id, screenplay_id, content, revision, is_encrypted, encryption_version, algorithm, iv, ciphertext, updated_at
FROM screenplay_contents
WHERE screenplay_id = $1;

-- name: UpdateScreenplayContentWithRevision :one
UPDATE screenplay_contents
SET
    content = $3,
    is_encrypted = FALSE,
    iv = '',
    ciphertext = '',
    revision = revision + 1,
    updated_at = NOW()
WHERE screenplay_id = $1 AND revision = $2
RETURNING id, screenplay_id, content, revision, is_encrypted, encryption_version, algorithm, iv, ciphertext, updated_at;

-- name: UpdateEncryptedScreenplayContentWithRevision :one
UPDATE screenplay_contents
SET
    is_encrypted = TRUE,
    encryption_version = $3,
    algorithm = $4,
    iv = $5,
    ciphertext = $6,
    content = '',
    revision = revision + 1,
    updated_at = NOW()
WHERE screenplay_id = $1 AND revision = $2
RETURNING id, screenplay_id, content, revision, is_encrypted, encryption_version, algorithm, iv, ciphertext, updated_at;

-- name: ForceSetScreenplayContent :one
UPDATE screenplay_contents
SET
    content = $2,
    is_encrypted = $3,
    encryption_version = $4,
    algorithm = $5,
    iv = $6,
    ciphertext = $7,
    revision = revision + 1,
    updated_at = NOW()
WHERE screenplay_id = $1
RETURNING id, screenplay_id, content, revision, is_encrypted, encryption_version, algorithm, iv, ciphertext, updated_at;
