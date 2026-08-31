DROP INDEX IF EXISTS idx_screenplay_contents_updated;
DROP INDEX IF EXISTS idx_screenplays_updated_at;
DROP INDEX IF EXISTS idx_screenplays_project_order;

ALTER TABLE screenplays
    DROP COLUMN IF EXISTS sort_order,
    DROP COLUMN IF EXISTS is_default;
