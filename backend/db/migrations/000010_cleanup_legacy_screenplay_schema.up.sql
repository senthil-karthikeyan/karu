-- Migration 000010: Remove legacy screenplay storage schema
-- Safe, reversible removal of legacy dual-write storage architecture

-- 1. Drop deprecated scenes table (scene navigation is client-derived dynamically in TipTap JSON)
DROP TABLE IF EXISTS scenes CASCADE;

-- 2. Drop deprecated project_keys table (Karu uses canonical 2-tier Passphrase -> UEK -> SCK encryption)
DROP TABLE IF EXISTS project_keys CASCADE;

-- 3. Drop deprecated screenplay_content column from projects table (stored in screenplay_contents)
ALTER TABLE projects DROP COLUMN IF EXISTS screenplay_content;
