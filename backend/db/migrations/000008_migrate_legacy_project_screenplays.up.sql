-- Migration 000008: Migrate legacy projects.screenplay_content into screenplays & screenplay_contents

DO $$
DECLARE
    r RECORD;
    v_screenplay_id UUID;
    v_content TEXT;
    v_is_encrypted BOOLEAN;
    v_enc_version INT;
    v_algorithm VARCHAR(32);
    v_iv TEXT;
    v_ciphertext TEXT;
    v_json JSONB;
BEGIN
    FOR r IN SELECT id, title, logline, screenplay_content, created_at, updated_at FROM projects LOOP
        -- Check if default screenplay already exists for this project
        SELECT id INTO v_screenplay_id FROM screenplays WHERE project_id = r.id AND is_default = TRUE LIMIT 1;
        
        IF v_screenplay_id IS NULL THEN
            -- Check if any screenplay exists for this project
            SELECT id INTO v_screenplay_id FROM screenplays WHERE project_id = r.id ORDER BY created_at ASC LIMIT 1;
        END IF;

        IF v_screenplay_id IS NULL THEN
            INSERT INTO screenplays (project_id, title, description, is_default, sort_order, created_at, updated_at)
            VALUES (r.id, r.title, r.logline, TRUE, 1, r.created_at, r.updated_at)
            RETURNING id INTO v_screenplay_id;
        END IF;

        -- Now check if screenplay_contents exists for v_screenplay_id
        IF NOT EXISTS (SELECT 1 FROM screenplay_contents WHERE screenplay_id = v_screenplay_id) THEN
            v_content := COALESCE(r.screenplay_content, '');
            v_is_encrypted := FALSE;
            v_enc_version := 1;
            v_algorithm := 'AES-GCM';
            v_iv := '';
            v_ciphertext := '';

            -- Check if v_content is JSON ciphertext payload
            IF v_content LIKE '{%"ciphertext"%' AND v_content LIKE '{%"iv"%' THEN
                BEGIN
                    v_json := v_content::JSONB;
                    IF (v_json ? 'ciphertext') AND (v_json ? 'iv') THEN
                        v_is_encrypted := TRUE;
                        v_ciphertext := v_json->>'ciphertext';
                        v_iv := v_json->>'iv';
                        IF (v_json ? 'version') THEN
                            v_enc_version := (v_json->>'version')::INT;
                        END IF;
                        IF (v_json ? 'algorithm') THEN
                            v_algorithm := v_json->>'algorithm';
                        END IF;
                        v_content := '';
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    -- Not valid JSON, keep as plaintext
                    v_is_encrypted := FALSE;
                END;
            END IF;

            INSERT INTO screenplay_contents (
                screenplay_id,
                content,
                revision,
                is_encrypted,
                encryption_version,
                algorithm,
                iv,
                ciphertext,
                updated_at
            ) VALUES (
                v_screenplay_id,
                v_content,
                1,
                v_is_encrypted,
                v_enc_version,
                v_algorithm,
                v_iv,
                v_ciphertext,
                r.updated_at
            );
        END IF;

        -- Update any legacy screenplay_keys that were keyed by project_id to point to v_screenplay_id
        UPDATE screenplay_keys
        SET screenplay_id = v_screenplay_id
        WHERE screenplay_id = r.id;

    END LOOP;
END $$;
