-- Migration 000009: Cleanup and Optimize Schema for Unified Screenplay Architecture

-- 1. Document legacy columns
COMMENT ON COLUMN projects.screenplay_content IS 'DEPRECATED: Screenplay drafts are canonically stored in screenplay_contents table';

-- 2. Create optimized covering index for screenplay contents revision lookup
CREATE INDEX IF NOT EXISTS idx_screenplay_contents_sp_revision 
ON screenplay_contents (screenplay_id, revision DESC);

-- 3. Create index for fast user screenplay keys lookup
CREATE INDEX IF NOT EXISTS idx_screenplay_keys_sp_user 
ON screenplay_keys (screenplay_id, user_id);

-- 4. Clean up any duplicate or orphaned screenplay key entries
DELETE FROM screenplay_keys sk
WHERE NOT EXISTS (
    SELECT 1 FROM screenplays s WHERE s.id = sk.screenplay_id
);
