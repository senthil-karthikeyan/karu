-- name: CreateUser :one
INSERT INTO users (
    email,
    password_hash,
    name,
    avatar_url,
    bio,
    preferences
) VALUES (
    $1, $2, $3, $4, $5, sqlc.arg(preferences)::text::jsonb
)
RETURNING id, email, name, avatar_url, bio, preferences, created_at, updated_at;

-- name: GetUserByID :one
SELECT id, email, name, avatar_url, bio, preferences, created_at, updated_at
FROM users
WHERE id = $1;

-- name: GetUserByEmail :one
SELECT id, email, password_hash, name, avatar_url, bio, preferences, created_at, updated_at
FROM users
WHERE email = $1;

-- name: UpdateUserProfile :one
UPDATE users
SET
    name = COALESCE(NULLIF($2, ''), name),
    avatar_url = COALESCE(NULLIF($3, ''), avatar_url),
    bio = COALESCE(NULLIF($4, ''), bio),
    preferences = COALESCE(sqlc.arg(preferences)::jsonb, preferences),
    updated_at = NOW()
WHERE id = $1
RETURNING id, email, name, avatar_url, bio, preferences, created_at, updated_at;

-- name: UpdateUserPassword :one
UPDATE users
SET
    password_hash = $2,
    updated_at = NOW()
WHERE id = $1
RETURNING id, email, updated_at;
