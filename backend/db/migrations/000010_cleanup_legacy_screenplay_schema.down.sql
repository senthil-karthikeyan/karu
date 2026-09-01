-- Revert Migration 000010: Restore legacy screenplay storage schema

-- 1. Restore projects.screenplay_content
ALTER TABLE projects ADD COLUMN IF NOT EXISTS screenplay_content TEXT NOT NULL DEFAULT '';

-- 2. Recreate project_keys table
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

-- 3. Recreate scenes table
CREATE TABLE IF NOT EXISTS scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    scene_number INT NOT NULL,
    slugline VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL DEFAULT '',
    time_of_day VARCHAR(50) NOT NULL DEFAULT 'DAY',
    summary TEXT NOT NULL DEFAULT '',
    page_number INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON scenes(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_scenes_project_number ON scenes(project_id, scene_number);
