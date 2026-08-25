CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL DEFAULT '',
    avatar_url TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    preferences JSONB NOT NULL DEFAULT '{"editorTheme": "dark", "fontSize": 14, "spellCheck": true, "wordWrap": true, "autoSave": true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    logline TEXT NOT NULL DEFAULT '',
    genre VARCHAR(100) NOT NULL DEFAULT 'Drama',
    format VARCHAR(100) NOT NULL DEFAULT 'Feature Film',
    status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    synopsis TEXT NOT NULL DEFAULT '',
    cover_image TEXT NOT NULL DEFAULT '',
    screenplay_content TEXT NOT NULL DEFAULT '',
    page_count INT NOT NULL DEFAULT 0,
    word_count INT NOT NULL DEFAULT 0,
    scene_count INT NOT NULL DEFAULT 0,
    last_edited_scene VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);

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

CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
