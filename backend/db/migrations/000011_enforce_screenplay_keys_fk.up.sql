-- Migration 000011: Enforce Foreign Key Relationship on screenplay_keys
-- Ensure screenplay_keys strictly references screenplays(id) with cascade delete

-- 1. Remove any orphaned screenplay keys
DELETE FROM screenplay_keys
WHERE screenplay_id NOT IN (SELECT id FROM screenplays);

-- 2. Drop existing constraint if present
ALTER TABLE screenplay_keys
    DROP CONSTRAINT IF EXISTS fk_screenplay_keys_screenplay;

-- 3. Add canonical foreign key constraint referencing screenplays(id)
ALTER TABLE screenplay_keys
    ADD CONSTRAINT fk_screenplay_keys_screenplay
    FOREIGN KEY (screenplay_id)
    REFERENCES screenplays(id)
    ON DELETE CASCADE;
