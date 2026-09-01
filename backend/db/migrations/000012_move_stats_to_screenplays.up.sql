-- Migration 000012: Move screenplay statistics from projects to screenplays
-- 1. Add statistics columns to screenplays table
ALTER TABLE screenplays
    ADD COLUMN IF NOT EXISTS word_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS page_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS scene_count INT NOT NULL DEFAULT 0;

-- 2. Migrate existing project statistics to default screenplays
UPDATE screenplays s
SET
    page_count = COALESCE(p.page_count, 0),
    word_count = COALESCE(p.word_count, 0),
    scene_count = COALESCE(p.scene_count, 0)
FROM projects p
WHERE s.project_id = p.id AND s.is_default = TRUE;

-- 3. Drop legacy statistics and last_edited_scene from projects table
ALTER TABLE projects
    DROP COLUMN IF EXISTS word_count,
    DROP COLUMN IF EXISTS page_count,
    DROP COLUMN IF EXISTS scene_count,
    DROP COLUMN IF EXISTS last_edited_scene;
