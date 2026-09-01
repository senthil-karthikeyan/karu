-- Revert Migration 000011: Drop Foreign Key Relationship on screenplay_keys
ALTER TABLE screenplay_keys
    DROP CONSTRAINT IF EXISTS fk_screenplay_keys_screenplay;
