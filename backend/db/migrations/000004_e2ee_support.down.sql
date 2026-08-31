-- Reverse E2EE columns on screenplay_versions
ALTER TABLE screenplay_versions
    DROP COLUMN IF EXISTS ciphertext,
    DROP COLUMN IF EXISTS iv,
    DROP COLUMN IF EXISTS algorithm,
    DROP COLUMN IF EXISTS encryption_version,
    DROP COLUMN IF EXISTS is_encrypted;

-- Reverse E2EE columns on screenplay_contents
ALTER TABLE screenplay_contents
    DROP COLUMN IF EXISTS ciphertext,
    DROP COLUMN IF EXISTS iv,
    DROP COLUMN IF EXISTS algorithm,
    DROP COLUMN IF EXISTS encryption_version,
    DROP COLUMN IF EXISTS is_encrypted;

-- Drop screenplay_keys table
DROP TABLE IF EXISTS screenplay_keys;

-- Drop user_encryption_metadata table
DROP TABLE IF EXISTS user_encryption_metadata;
