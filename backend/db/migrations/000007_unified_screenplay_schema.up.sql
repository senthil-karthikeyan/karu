-- 1. Extend screenplays table with sort order and default flag
ALTER TABLE screenplays
    ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 1;

-- 2. Indexes for efficient lookup by project and sorting
CREATE INDEX IF NOT EXISTS idx_screenplays_project_order ON screenplays(project_id, sort_order ASC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_screenplays_updated_at ON screenplays(updated_at DESC);

-- 3. Ensure screenplay_contents has full optimistic concurrency and metadata columns
CREATE INDEX IF NOT EXISTS idx_screenplay_contents_updated ON screenplay_contents(updated_at DESC);
