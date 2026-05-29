CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(32) NOT NULL UNIQUE,
    name        VARCHAR(64) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE areas (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(32) NOT NULL UNIQUE,
    name        VARCHAR(128) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(128) NOT NULL,
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    area_id         UUID REFERENCES areas(id) ON DELETE SET NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email     ON users(email);
CREATE INDEX idx_users_role      ON users(role_id);
CREATE INDEX idx_users_area      ON users(area_id);

CREATE TABLE area_management (
    manager_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    area_id     UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (manager_id, area_id)
);

CREATE INDEX idx_area_mgmt_manager ON area_management(manager_id);
CREATE INDEX idx_area_mgmt_area    ON area_management(area_id);

CREATE TABLE files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_name   VARCHAR(255) NOT NULL,
    storage_name    VARCHAR(64) NOT NULL UNIQUE,
    mime_type       VARCHAR(127) NOT NULL,
    size_bytes      BIGINT NOT NULL CHECK (size_bytes >= 0),
    owner_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    area_id         UUID REFERENCES areas(id) ON DELETE SET NULL,
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at      TIMESTAMPTZ,
    deleted_by      UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_files_owner      ON files(owner_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_files_area       ON files(area_id)  WHERE is_deleted = FALSE;
CREATE INDEX idx_files_uploaded   ON files(uploaded_at DESC);

CREATE TABLE audit_log (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    file_id      UUID REFERENCES files(id) ON DELETE SET NULL,
    action       VARCHAR(32) NOT NULL,
    metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address   INET,
    occurred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user       ON audit_log(user_id, occurred_at DESC);
CREATE INDEX idx_audit_file       ON audit_log(file_id, occurred_at DESC);
CREATE INDEX idx_audit_occurred   ON audit_log(occurred_at DESC);

CREATE TABLE sessions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at   TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address   INET,
    user_agent   TEXT
);

CREATE INDEX idx_sessions_user    ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
