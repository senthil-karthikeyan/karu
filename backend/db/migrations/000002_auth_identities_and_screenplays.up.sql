-- 1. Auth Identities Table (multi-provider: email, google)
CREATE TABLE IF NOT EXISTS auth_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_auth_identities_provider_uid UNIQUE (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_auth_identities_user_id ON auth_identities(user_id);

-- 2. Refresh Tokens Table (hashed tokens with rotation and revocation)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- 3. Screenplays Table
CREATE TABLE IF NOT EXISTS screenplays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_screenplays_project_id ON screenplays(project_id);

-- 4. Screenplay Contents Table (with optimistic concurrency revision)
CREATE TABLE IF NOT EXISTS screenplay_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    screenplay_id UUID NOT NULL UNIQUE REFERENCES screenplays(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',
    revision BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_screenplay_contents_screenplay_id ON screenplay_contents(screenplay_id);

-- 5. Screenplay Versions Table (named manual checkpoints & restore points)
CREATE TABLE IF NOT EXISTS screenplay_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    screenplay_id UUID NOT NULL REFERENCES screenplays(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_screenplay_versions_num UNIQUE (screenplay_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_screenplay_versions_screenplay_id ON screenplay_versions(screenplay_id);
