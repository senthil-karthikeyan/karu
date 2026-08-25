# Karu Backend

The backend service for **Karu**, a high-performance screenplay writing and film project development platform. Built with **Go 1.24+**, **Gin HTTP framework**, **PostgreSQL 16**, **pgx/v5**, **sqlc**, **golang-migrate**, and **Testcontainers-Go**.

---

## 🛠 Tech Stack

* **Language**: [Go](https://go.dev/) 1.24+ / 1.27
* **HTTP Framework**: [Gin Web Framework](https://github.com/gin-gonic/gin)
* **Database Driver**: [pgx/v5](https://github.com/jackc/pgx/v5) with `pgxpool.Pool`
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
                    │      CORS • AuthMiddleware      │
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
│   └── server/main.go         # Alternate server entry point
├── db/
│   ├── migrations/            # Versioned SQL migrations (golang-migrate)
│   │   ├── 000001_initial_schema.up.sql
│   │   ├── 000001_initial_schema.down.sql
│   │   ├── 000002_auth_identities_and_screenplays.up.sql
│   │   └── 000002_auth_identities_and_screenplays.down.sql
│   └── queries/               # sqlc SQL query definitions
│       ├── activities.sql
│       ├── auth_identities.sql
│       ├── projects.sql
│       ├── refresh_tokens.sql
│       ├── scenes.sql
│       ├── screenplay_contents.sql
│       ├── screenplay_versions.sql
│       ├── screenplays.sql
│       └── users.sql
├── internal/
│   ├── auth/                  # Password hashing (bcrypt), JWT, and Goth OAuth
│   │   ├── goth.go            # Google OAuth provider & mock authenticator
│   │   ├── jwt.go             # JWT TokenManager and SHA-256 token hashing
│   │   └── password.go        # bcrypt hash and comparison functions
│   ├── config/                # Environment variable loader and parser
│   ├── database/              # pgxpool lifecycle, health checks & migration runner
│   ├── handler/               # Gin HTTP request handlers & validation
│   ├── middleware/            # JWT authentication, CORS, logging, recovery, request ID
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

### 3. Testing OAuth Abstraction
The `auth.OAuthAuthenticator` interface decouples the HTTP layer from external OAuth networks:
* `InitGoth(...)`: Production implementation using Goth and Google OAuth.
* `MockOAuthAuthenticator`: Test implementation enabling automated CI/CD unit and integration testing without external network requests.

---

## 📜 Screenplay Engine & Concurrency

### Domain Model Hierarchy

```text
users
  └── projects
        ├── scenes
        ├── activities
        └── screenplays
              ├── screenplay_contents (current content + revision)
              └── screenplay_versions (immutable checkpoints)
```

### 1. Autosave with Optimistic Concurrency Control (OCC)

To prevent multiple editing sessions from overwriting each other, the `screenplay_contents` table maintains an integer `revision` counter:

```sql
UPDATE screenplay_contents
SET
    content = $3,
    revision = revision + 1,
    updated_at = NOW()
WHERE screenplay_id = $1 AND revision = $2
RETURNING id, screenplay_id, content, revision, updated_at;
```

* **Save Request**: The client sends `PUT /api/v1/screenplays/:id/content` with `{ "content": "...", "revision": N }`.
* **Success**: If the database revision matches $N$, the content is updated, `revision` is incremented to $N+1$, and the updated record is returned with `200 OK`.
* **Conflict**: If the database revision is already higher (e.g., modified by another tab or device), the query updates 0 rows. The handler immediately returns `409 Conflict` with error code `REVISION_CONFLICT`.

### 2. Version History & Checkpoints

* **Create Checkpoint**: `POST /api/v1/screenplays/:id/versions` creates an immutable named snapshot in `screenplay_versions` with an auto-incrementing `version_number`.
* **Retrieve Historical Checkpoints**: List all versions or fetch a specific historical snapshot by ID.
* **Transactional Restoration**: `POST /api/v1/screenplays/:id/versions/:versionId/restore` performs an atomic transaction that:
  1. Retrieves the target historical snapshot content.
  2. Overwrites the live `screenplay_contents` content and increments its `revision`.
  3. Automatically inserts a new version checkpoint titled `"Restored from Version X (...) "` to preserve audit history.

---

## 🛡 Authorization & Multi-Tenant Isolation

The backend enforces multi-tenant data isolation at the database query layer:
* Every project, screenplay, scene, content, and version query joins through `projects.user_id = :authenticated_user_id`.
* Unauthorized attempts to access, modify, or delete another user's projects or screenplays return `404 Not Found` rather than `403 Forbidden` to prevent resource enumeration.

---

## 🗄 Database & Migrations

### Unified `DATABASE_URL` Configuration

The database connection is managed entirely through a single `DATABASE_URL` connection string:

```text
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/karu?sslmode=disable
```

* **Connection Pooling**: Managed via `pgxpool.Pool` with configurable `DB_MAX_CONNS` and `DB_MIN_CONNS`.
* **Migration Compatibility**: `internal/database/migrate.go` normalizes `postgres://` or `postgresql://` connection strings to `pgx5://` for the `golang-migrate` pgx driver.

### Applied Database Migrations

1. `000001_initial_schema`: Initial schema defining `users`, `projects`, `scenes`, and `activities`.
2. `000002_auth_identities_and_screenplays`: Adds `auth_identities`, `refresh_tokens`, `screenplays`, `screenplay_contents`, and `screenplay_versions`.

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

### User Profile

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/users/me` | **Yes** | Retrieve authenticated user profile and preferences |
| `PATCH` | `/api/v1/users/me` | **Yes** | Update user name, bio, avatar, or editor preferences |

### Projects & Scenes

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/projects` | **Yes** | List all projects belonging to the user |
| `POST` | `/api/v1/projects` | **Yes** | Create a new project |
| `GET` | `/api/v1/projects/:id` | **Yes** | Get project details including scene list |
| `PATCH` | `/api/v1/projects/:id` | **Yes** | Update project metadata or status |
| `DELETE` | `/api/v1/projects/:id` | **Yes** | Delete project and cascade all related data |
| `GET` | `/api/v1/projects/:id/scenes` | **Yes** | List scenes for a project in order |
| `POST` | `/api/v1/projects/:id/scenes` | **Yes** | Create a new scene |
| `PATCH` | `/api/v1/projects/:id/scenes/:sceneId` | **Yes** | Update scene slugline, location, or summary |
| `DELETE` | `/api/v1/projects/:id/scenes/:sceneId` | **Yes** | Delete a scene |
| `GET` | `/api/v1/projects/:id/activities` | **Yes** | List project activity history audit log |

### Screenplays, Content & Versions

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/projects/:id/screenplays` | **Yes** | List all screenplays within a project |
| `POST` | `/api/v1/projects/:id/screenplays` | **Yes** | Create a screenplay with initial revision |
| `GET` | `/api/v1/screenplays/:id` | **Yes** | Get screenplay details and current content |
| `PATCH` | `/api/v1/screenplays/:id` | **Yes** | Update screenplay title or description |
| `DELETE` | `/api/v1/screenplays/:id` | **Yes** | Delete screenplay |
| `GET` | `/api/v1/screenplays/:id/content` | **Yes** | Retrieve current content and revision number |
| `PUT` | `/api/v1/screenplays/:id/content` | **Yes** | Autosave content with OCC (returns 409 on revision conflict) |
| `GET` | `/api/v1/screenplays/:id/versions` | **Yes** | List historical version checkpoints |
| `POST` | `/api/v1/screenplays/:id/versions` | **Yes** | Create a named version checkpoint |
| `GET` | `/api/v1/screenplays/:id/versions/:versionId` | **Yes** | Retrieve a specific historical version snapshot |
| `POST` | `/api/v1/screenplays/:id/versions/:versionId/restore` | **Yes** | Transactionally restore screenplay to historical version |

---

## 📬 Response Envelope Format

### Success Response (`200 OK` / `201 Created`)

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "The Quantum Paradox",
    "revision": 3
  }
}
```

### Error Response (`4xx` / `5xx`)

```json
{
  "success": false,
  "error": {
    "code": "REVISION_CONFLICT",
    "message": "Screenplay content has been modified by another session. Please refresh."
  }
}
```

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

Runs unit tests across `./internal/auth`, `./internal/service`, `./internal/handler`, and `./internal/server`.

### Run Integration Tests (Testcontainers)

```bash
make itest
```

Spins up a temporary `postgres:16-alpine` Docker container using Testcontainers-Go, executes all migrations, tests connection health, ACID transactions, multi-provider auth identities, refresh token rotation, project creation, optimistic concurrency autosave, version rollback, and multi-tenant isolation.

### Run All Tests

```bash
go test ./... -v
```

---

## ⚠️ Current Limitations

* **End-to-End Encryption (E2EE)**: **Not currently implemented.** Screenplay content is persisted in plaintext in the database.
* **Project Sharing & Collaboration**: **Not currently implemented.** Projects and screenplays are strictly isolated to the creating user account.
