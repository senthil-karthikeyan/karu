-- 1. Project Keys Table (stores wrapped Project Encryption Key per project per user)
CREATE TABLE IF NOT EXISTS project_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wrapped_key TEXT NOT NULL,
    key_iv TEXT NOT NULL,
    algorithm VARCHAR(32) NOT NULL DEFAULT 'AES-GCM',
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_project_keys_project_user UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_keys_project_id ON project_keys(project_id);
CREATE INDEX IF NOT EXISTS idx_project_keys_user_id ON project_keys(user_id);
