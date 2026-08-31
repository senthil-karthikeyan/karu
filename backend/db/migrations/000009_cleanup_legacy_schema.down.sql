-- Revert Migration 000009
DROP INDEX IF EXISTS idx_screenplay_contents_sp_revision;
DROP INDEX IF EXISTS idx_screenplay_keys_sp_user;
COMMENT ON COLUMN projects.screenplay_content IS NULL;
