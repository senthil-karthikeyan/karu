# Karu Backend

The backend service for **Karu**, a high-performance screenplay writing and film project development platform. Built with **Go 1.24+**, **Gin HTTP framework**, **PostgreSQL 16**, **pgx/v5**, **sqlc**, **golang-migrate**, and **Zero-Knowledge E2EE Storage**.

---

## 🛠 Tech Stack

* **Language**: [Go](https://go.dev/) 1.24+ / 1.27
* **HTTP Framework**: [Gin Web Framework](https://github.com/gin-gonic/gin)
* **Database Driver**: [pgx/v5](https://github.com/jackc/pgx/v5) with `pgxpool.Pool` (using `QueryExecModeSimpleProtocol`)
* **Query Generator**: [sqlc](https://sqlc.dev/) (Type-safe Go code from SQL)
* **Database Migrations**: [golang-migrate/migrate](https://github.com/golang-migrate/migrate)
* **Authentication**: [golang-jwt/jwt/v5](https://github.com/golang-jwt/jwt) + [bcrypt](https://pkg.go.dev/golang.org/x/crypto/bcrypt)
* **OAuth Provider**: [Goth](https://github.com/markbates/goth) with Google Provider & [gorilla/sessions](https://github.com/gorilla/sessions)
* **Integration Testing**: [Testcontainers-Go](https://golang.testcontainers.org/)
* **Hot Reload**: [Air](https://github.com/air-verse/air)

---

## 🏗 Architecture

The backend implements a clean, layered architecture ensuring strict separation of concerns, transactional safety, and dependency injection:

```text
                    ┌─────────────────────────────────┐
                    │          HTTP Client            │
                    └────────────────┬────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │           Gin Router            │
                    │   (internal/router/router.go)   │
                    └────────────────┬────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │      Middleware Pipeline        │
                    │  RequestID • Logger • Recovery  │
                    │  SecurityHeaders • CORS • Auth  │
                    └────────────────┬────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │         HTTP Handlers           │
                    │      (internal/handler/)        │
                    │   DTO Binding & Validation      │
                    └────────────────┬────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │        Service Layer            │
                    │      (internal/service/)        │
                    │  Business Rules & Concurrency   │
                    └────────────────┬────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │       Repository Layer          │
                    │    (internal/repository/)       │
                    │ Transactions & sqlc Wrappers    │
                    └────────────────┬────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │      sqlc Generated Code        │
                    │       (sqlc/generated/)         │
                    └────────────────┬────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │          pgx / pgxpool          │
                    └────────────────┬────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │          PostgreSQL 16          │
                    └─────────────────────────────────┘
```

---

## 📁 Directory Structure

```text
backend/
├── cmd/
│   ├── api/main.go            # Application entry point & service bootstrap
│   ├── migrate/main.go        # Programmatic migration runner
│   └── server/main.go         # Alternate server entry point
├── db/
│   ├── migrations/            # Versioned SQL migrations (golang-migrate)
│   │   ├── 000001_initial_schema.up.sql
│   │   ├── 000002_auth_identities_and_screenplays.up.sql
│   │   ├── 000003_e2ee_support.up.sql
│   │   ├── 000004_e2ee_support.up.sql
│   │   ├── 000005_user_encryption_identities.up.sql
│   │   ├── 000006_project_keys.up.sql
│   │   ├── 000007_unified_screenplay_schema.up.sql
│   │   ├── 000008_migrate_legacy_project_screenplays.up.sql
│   │   ├── 000009_cleanup_legacy_schema.up.sql
│   │   ├── 000010_cleanup_legacy_screenplay_schema.up.sql
│   │   ├── 000011_enforce_screenplay_keys_fk.up.sql
│   │   └── 000012_move_stats_to_screenplays.up.sql
│   └── queries/               # sqlc SQL query definitions
│       ├── activities.sql
│       ├── auth_identities.sql
│       ├── projects.sql
│       ├── refresh_tokens.sql
│       ├── screenplay_contents.sql
│       ├── screenplay_keys.sql
│       ├── screenplay_versions.sql
│       ├── screenplays.sql
│       ├── user_encryption_identities.sql
│       ├── user_encryption_metadata.sql
│       └── users.sql
├── internal/
│   ├── auth/                  # Password hashing (bcrypt), JWT, and Goth OAuth
│   │   ├── goth.go            # Google OAuth provider & mock authenticator
│   │   ├── jwt.go             # JWT TokenManager and SHA-256 token hashing
│   │   └── password.go        # bcrypt hash and comparison functions
│   ├── config/                # Environment variable loader and parser
│   ├── database/              # pgxpool lifecycle, health checks & migration runner
│   ├── handler/               # Gin HTTP request handlers & validation
│   ├── middleware/            # Security headers, JWT auth, CORS, logging, recovery, request ID
│   ├── model/                 # Domain models, request/response DTOs, error definitions
│   ├── repository/            # Repository pattern wrapping sqlc queries
│   ├── router/                # Endpoint routing and middleware attachment
│   ├── server/                # HTTP server configuration and graceful shutdown
│   └── service/               # Core business services (Auth, Project, Screenplay, User)
├── sqlc/
│   └── generated/             # Type-safe Go code generated by sqlc
├── .air.toml                  # Hot-reload configuration
├── .env.example               # Example environment variables
├── docker-compose.yml         # Containerized PostgreSQL service
├── Dockerfile                 # Production multi-stage container build
├── Makefile                   # Developer task runner
├── go.mod                     # Go module dependencies
├── go.sum                     # Go module checksums
└── sqlc.yaml                  # sqlc code generation configuration
```

---

## 🔒 Authentication Architecture

Karu implements a multi-provider authentication system supporting both traditional email/password and OAuth providers:

```text
┌─────────────────────────────────────────────────────────────┐
│                            users                            │
│    id (UUID) • email • name • preferences • created_at      │
└──────────────────────────────┬──────────────────────────────┘
                               │ 1:N
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       auth_identities                       │
│  user_id • provider (email/google) • provider_user_id       │
│                password_hash (for email)                    │
└─────────────────────────────────────────────────────────────┘
```

### 1. Multi-Provider Identities (`auth_identities`)
* **Email / Password**: Passwords are securely hashed with `bcrypt` (cost 10).
* **Google OAuth**: Authenticates through Goth, returning the provider's verified user ID and profile.
* **Automatic Identity Linking**: If an email address already registered via email/password logs in via Google, the Google identity is automatically linked to the existing user account without duplicate account creation.

### 2. Database-Backed Refresh Token Sessions (`refresh_tokens`)
* **Token Pair**: On authentication, the backend generates:
  1. A short-lived **JWT Access Token** (HS256, 60 minutes) containing claims (`user_id`, `email`).
  2. A cryptographically secure random 32-byte **Refresh Token** (7 days).
* **SHA-256 Token Storage**: Plaintext refresh tokens are never persisted. Only the SHA-256 hash is stored in the database.
* **Token Rotation**: Every call to `POST /api/v1/auth/refresh` revokes the old refresh token and issues a completely new access/refresh token pair.
* **Session Revocation**: Calling `POST /api/v1/auth/logout` sets `revoked_at = NOW()` on the refresh token session.

---

## 🔐 Zero-Knowledge End-to-End Encryption (E2EE)

The Go backend operates on a strict **Zero-Knowledge Principle**:

1. **Zero Plaintext Exposure**: Screenplay content, revisions, and checkpoints exist only as AES-256-GCM ciphertext blobs with associated 12-byte IVs and 128-bit authentication tags.
2. **Screenplay-Level Statistics**: Screenplay statistics (`word_count`, `page_count`, `scene_count`) are calculated locally in the browser from the decrypted TipTap AST and persisted with the encrypted content update.
3. **Pure Project Metadata**: The `projects` table stores only project-level metadata (`title`, `genre`, `format`, `logline`, `synopsis`, `status`, `cover_image`).
4. **Zero Key Knowledge**: The backend stores only wrapped keys:
   - `user_encryption_metadata`: Stores salt & PBKDF2 iterations for client-side UEK derivation.
   - `user_encryption_identities`: Stores the user's public ECDH key (SPKI) and wrapped private key (PKCS#8 wrapped with UEK).
   - `screenplay_keys`: Stores the random Screenplay Content Key (`SCK`) directly wrapped with the user's `UEK` (Canonical 2-Tier Hierarchy: Passphrase -> UEK -> SCK -> Content).
5. **Atomic Zero-Knowledge Restorations**: `RestoreVersion` transactionally copies historical encrypted payloads directly into `screenplay_contents` without server-side decryption.

---

## 🛡 Security Middleware & Defense-in-Depth

The backend attaches global security middleware on all routes:

```go
r.Use(middleware.RequestID())
r.Use(middleware.Logger())
r.Use(middleware.Recovery())
r.Use(middleware.SecurityHeaders())
r.Use(middleware.CORS(deps.Config.CORS))
```

### Security Headers Attached:
* `X-Content-Type-Options: nosniff`
* `X-Frame-Options: DENY`
* `X-XSS-Protection: 1; mode=block`
* `Referrer-Policy: strict-origin-when-cross-origin`
* `Permissions-Policy: geolocation=(), camera=(), microphone=()`

---

## 🗄 Database & Migrations

### Applied Database Migrations

1. `000001_initial_schema`: Initial schema defining users, projects, and activities.
2. `000002_auth_identities_and_screenplays`: Adds `auth_identities`, `refresh_tokens`, `screenplays`, `screenplay_contents`, and `screenplay_versions`.
3. `000003_e2ee_support`: Adds `user_encryption_metadata` (salt & PBKDF2 settings), `screenplay_keys` (wrapped SCKs), and extends `screenplay_contents` and `screenplay_versions` with ciphertext fields.
4. `000004_e2ee_support`: Migration maintenance for E2EE fields.
5. `000005_user_encryption_identities`: Adds `user_encryption_identities` table for ECDH P-256 asymmetric identity key storage.
6. `000006_project_keys`: Legacy PEK table (subsequently deprecated and removed in migration 000010).
7. `000007_unified_screenplay_schema`: Extends `screenplays` with `is_default` and `sort_order`.
8. `000008_migrate_legacy_project_screenplays`: Migrated legacy `projects.screenplay_content` to `screenplay_contents`.
9. `000009_cleanup_legacy_schema`: Adds covering indexes for revision and key queries.
10. `000010_cleanup_legacy_screenplay_schema`: Drops deprecated `projects.screenplay_content`, `project_keys`, and `scenes` tables.
11. `000011_enforce_screenplay_keys_fk`: Enforces `FOREIGN KEY (screenplay_id) REFERENCES screenplays(id) ON DELETE CASCADE` on `screenplay_keys`.
12. `000012_move_stats_to_screenplays`: Moves screenplay statistics (`word_count`, `page_count`, `scene_count`) from `projects` to `screenplays` and removes `last_edited_scene`.

---

## 📡 API Endpoint Reference

### Health & Readiness

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | No | API status and version banner |
| `GET` | `/health` | No | Connection pool metrics and health status |
| `GET` | `/ready` | No | Live database ping readiness check |

### Authentication

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | No | Register new account with email & password |
| `POST` | `/api/v1/auth/login` | No | Login with email & password, returning JWT token pair |
| `POST` | `/api/v1/auth/refresh` | No | Rotate refresh token and issue new token pair |
| `POST` | `/api/v1/auth/logout` | No | Revoke refresh token session in database |
| `GET` | `/api/v1/auth/google` | No | Initiate Google OAuth flow via Goth |
| `GET` | `/api/v1/auth/google/callback` | No | Complete Google OAuth callback and issue tokens |

### User Profile & Encryption Identities

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/users/me` | **Yes** | Retrieve authenticated user profile and preferences |
| `PATCH` | `/api/v1/users/me` | **Yes** | Update user name, bio, avatar, or editor preferences |
| `GET` | `/api/v1/users/me/encryption-metadata` | **Yes** | Get user's salt and PBKDF2 parameters for deriving UEK |
| `POST` | `/api/v1/users/me/encryption-metadata` | **Yes** | Set or update user's encryption salt and PBKDF2 configuration |
| `GET` | `/api/v1/users/me/encryption-identity` | **Yes** | Retrieve authenticated user's ECDH P-256 identity keypair |
| `POST` | `/api/v1/users/me/encryption-identity` | **Yes** | Store or update user's ECDH P-256 identity keypair |
| `GET` | `/api/v1/users/:id/public-key` | **Yes** | Retrieve public key (SPKI) for another user by ID |

### Projects

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/projects` | **Yes** | List all projects belonging to the user |
| `POST` | `/api/v1/projects` | **Yes** | Create a new project |
| `GET` | `/api/v1/projects/:id` | **Yes** | Get project details (pure metadata) |
| `PATCH` | `/api/v1/projects/:id` | **Yes** | Update project metadata or status |
| `DELETE` | `/api/v1/projects/:id` | **Yes** | Delete project and cascade all related screenplays |
| `GET` | `/api/v1/projects/:id/screenplay` | **Yes** | Get default canonical screenplay for project |
| `GET` | `/api/v1/projects/:id/activities` | **Yes** | List project activity history audit log |

### Screenplays, Content, Keys & Versions

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/projects/:id/screenplays` | **Yes** | List all screenplays within a project with statistics |
| `POST` | `/api/v1/projects/:id/screenplays` | **Yes** | Create a screenplay with initial revision and statistics |
| `GET` | `/api/v1/screenplays/:id` | **Yes** | Get screenplay details, statistics, and current content |
| `PATCH` | `/api/v1/screenplays/:id` | **Yes** | Update screenplay title, description, or statistics |
| `DELETE` | `/api/v1/screenplays/:id` | **Yes** | Delete screenplay and cascade keys, content, and versions |
| `GET` | `/api/v1/screenplays/:id/key` | **Yes** | Retrieve authenticated user's wrapped SCK |
| `POST` | `/api/v1/screenplays/:id/key` | **Yes** | Store or update wrapped SCK |
| `GET` | `/api/v1/screenplays/:id/content` | **Yes** | Retrieve current content (ciphertext or plaintext) and revision |
| `PUT` | `/api/v1/screenplays/:id/content` | **Yes** | Autosave content & update statistics with OCC (409 on revision conflict) |
| `GET` | `/api/v1/screenplays/:id/versions` | **Yes** | List historical version checkpoints |
| `POST` | `/api/v1/screenplays/:id/versions` | **Yes** | Create a named version checkpoint (stores ciphertext snapshot) |
| `GET` | `/api/v1/screenplays/:id/versions/:versionId` | **Yes** | Retrieve a specific historical version snapshot |
| `POST` | `/api/v1/screenplays/:id/versions/:versionId/restore` | **Yes** | Transactionally restore screenplay to historical version |

---

## ⚙️ Environment Variables

Create `.env` in `/backend` based on `.env.example`:

```bash
cp .env.example .env
```

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `8080` | Server listening port |
| `APP_ENV` | `development` | Environment mode (`development`, `production`, `test`) |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/karu?sslmode=disable` | PostgreSQL connection URL |
| `DB_MAX_CONNS` | `25` | Maximum database pool connections |
| `DB_MIN_CONNS` | `2` | Minimum idle database pool connections |
| `JWT_ACCESS_SECRET` | *(secret)* | Secret key for signing access tokens |
| `JWT_ACCESS_EXPIRATION` | `60` | Access token lifespan in minutes |
| `JWT_REFRESH_SECRET` | *(secret)* | Secret key for signing refresh tokens |
| `JWT_REFRESH_EXPIRATION` | `7` | Refresh token lifespan in days |
| `GOTH_SESSION_SECRET` | *(secret)* | Cookie secret for OAuth sessions |
| `GOOGLE_CLIENT_ID` | *(client id)* | Google Cloud OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | *(client secret)* | Google Cloud OAuth Client Secret |
| `GOOGLE_REDIRECT_URL` | `http://localhost:8080/api/v1/auth/google/callback` | Google OAuth callback redirect URL |
| `FRONTEND_URL` | `http://localhost:3000` | Frontend application URL |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Allowed CORS origins (comma-separated) |

---

## 🚀 Development & Makefile Commands

```bash
# Start PostgreSQL container
make docker-up

# Stop PostgreSQL container
make docker-down

# Apply pending database migrations
make migrate-up

# Rollback last migration step
make migrate-down

# Regenerate sqlc Go code from db/queries/*.sql
make sqlc

# Run development server with live reload (Air)
make dev

# Run server without Air
make run

# Build production binary
make build
```

---

## 🧪 Testing

### Run Unit Tests

```bash
make test
```

### Run Integration Tests (Testcontainers)

```bash
make itest
```

### Run All Backend Tests

```bash
go test ./... -v
```
