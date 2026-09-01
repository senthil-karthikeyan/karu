-- Revert Migration 000012: Move screenplay statistics back to projects

-- 1. Recreate statistics columns and last_edited_scene on projects
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS page_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS word_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS scene_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_edited_scene VARCHAR(255) NOT NULL DEFAULT '';

-- 2. Restore stats from default screenplays back to projects
UPDATE projects p
SET
    page_count = COALESCE(s.page_count, 0),
    word_count = COALESCE(s.word_count, 0),
    scene_count = COALESCE(s.scene_count, 0)
FROM screenplays s
WHERE s.project_id = p.id AND s.is_default = TRUE;

-- 3. Drop statistics columns from screenplays table
ALTER TABLE screenplays
    DROP COLUMN IF EXISTS word_count,
    DROP COLUMN IF EXISTS page_count,
    DROP COLUMN IF EXISTS scene_count;
