# Karu

**Karu** is a modern, distraction-free film workspace and screenplay writing studio built for screenwriters, directors, and independent filmmakers. It combines industry-standard screenplay formatting with an 8.5" × 11" physical page canvas, real-time autosave with optimistic concurrency control, immutable version checkpointing, and project management tools.

---

## What Karu Is

Karu is designed to streamline the single-user screenwriting workflow from initial concept to production draft. Traditional screenwriting software is often cluttered, legacy-bound, or tied to proprietary desktop formats. Karu bridges this gap by delivering:

* **Cinematic Project Workspace**: Manage film projects with metadata including title, loglines, genre, format, and synopsis.
* **Physical Page Pagination**: Write on an industry-standard 8.5" × 11" screenplay canvas with real-time block-height pagination that flows text across page boundaries and displays header page numbers.
* **Screenplay Typography & Shortcuts**: Full Courier Prime 12pt typography with context-aware Tab and Enter keyboard shortcuts cycling through scene headings, action, character, dialogue, parentheticals, and transitions.
* **Robust Autosave with Optimistic Concurrency**: Debounced client autosave paired with database revision tracking that detects stale updates and prevents overwrite conflicts.
* **Version Checkpoints & Restore**: Snapshot named milestone drafts and transactionally restore historical versions with automatic restore points.
* **Screenplay Reader & Exporter**: Dedicated reading mode with zooming, printing, and multi-format export to PDF (print-ready), Fountain (`.fountain`), and Plain Text (`.txt`).
* **Multi-Provider Authentication**: Secure email/password authentication (bcrypt) and Google OAuth (via Goth) backed by rotating refresh token sessions.

---

## Current Status

Karu is currently implemented and operational as a **single-user filmmaking workspace**. 

* The **Frontend** is built with **Next.js 16 (Turbopack)**, **React 19**, **Tailwind CSS v4**, **shadcn/ui**, and **TipTap**.
* The **Backend** is a high-performance REST API built in **Go 1.24+** using **Gin**, **pgx/v5**, **sqlc**, **golang-migrate**, and **golang-jwt/v5**.
* The **Database** is **PostgreSQL 16** managed through versioned SQL migrations.

> [!NOTE]
> The current codebase is optimized for individual filmmakers and screenwriters. Multi-user collaboration, real-time co-authoring, and client-side end-to-end encryption (E2EE) are currently **planned future architecture** and are **not implemented** in the current release.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                      Next.js 16 Client                      │
│   React 19 • TipTap • TanStack Query • Zustand • Tailwind   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                        HTTPS / JSON API
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       Go API (Gin)                          │
│  Router • Middleware (JWT/CORS) • Services • Repositories   │
│            Goth (Google OAuth) • Token Manager              │
└──────────────────────────────┬──────────────────────────────┘
                               │
                            pgxpool
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL 16 Engine                     │
│    Users • Auth Identities • Refresh Tokens • Projects      │
│     Scenes • Screenplays • Contents • Versions • Activities  │
└─────────────────────────────────────────────────────────────┘
```

### Core Subsystems

1. **Client Tier (`/frontend`)**: Handles user interface rendering, client-side route protection via Next.js middleware, TipTap rich text editing, DOM/ProseMirror pagination calculations, and server cache synchronization via TanStack Query.
2. **API Tier (`/backend`)**: Enforces authentication, session token rotation, request validation, business logic, optimistic concurrency checks, and multi-tenant data isolation.
3. **Data Tier (PostgreSQL)**: Persists normalized domain models using generated type-safe sqlc queries within strict ACID transactions.

---

## Repository Structure

```text
karu/
├── README.md                          # Main project documentation (this file)
├── backend/                           # Go REST API backend service
│   ├── cmd/
│   │   ├── api/main.go                # API entry point & lifecycle bootstrapping
│   │   └── server/main.go             # Alternate server bootstrap
│   ├── db/
│   │   ├── migrations/                # Versioned SQL migrations (golang-migrate)
│   │   │   ├── 000001_initial_schema.up.sql
│   │   │   ├── 000001_initial_schema.down.sql
│   │   │   ├── 000002_auth_identities_and_screenplays.up.sql
│   │   │   └── 000002_auth_identities_and_screenplays.down.sql
│   │   └── queries/                   # sqlc source SQL queries
│   ├── internal/
│   │   ├── auth/                      # Password hashing (bcrypt), JWT, and Goth OAuth
│   │   ├── config/                    # Environment variable configuration loader
│   │   ├── database/                  # pgxpool lifecycle & migration runner
│   │   ├── handler/                   # Gin HTTP request handlers & input validation
│   │   ├── middleware/                # JWT auth, CORS, logging, recovery, request ID
│   │   ├── model/                     # Domain DTOs, API envelopes, and error codes
│   │   ├── repository/                # Data access layer wrapping sqlc queries
│   │   ├── router/                    # Route definition and dependency injection
│   │   ├── server/                    # HTTP server configuration
│   │   └── service/                   # Core business logic (Auth, Projects, Screenplays)
│   ├── sqlc/
│   │   └── generated/                 # Type-safe Go code generated by sqlc
│   ├── .air.toml                      # Hot-reload configuration for Air
│   ├── .env.example                   # Backend environment template
│   ├── docker-compose.yml             # Local PostgreSQL container service
│   ├── Dockerfile                     # Multi-stage production container build
│   ├── Makefile                       # Developer task runner
│   ├── go.mod                         # Go module definitions
│   └── sqlc.yaml                      # sqlc compiler configuration
└── frontend/                          # Next.js 16 frontend application
    ├── public/                        # Static assets and icons
    ├── src/
    │   ├── app/                       # Next.js App Router pages and layouts
    │   │   ├── (auth)/
    │   │   │   ├── login/page.tsx     # Sign-in page
    │   │   │   └── signup/page.tsx    # Registration page
    │   │   ├── auth/callback/page.tsx # Google OAuth token callback handler
    │   │   ├── dashboard/page.tsx     # Film project dashboard
    │   │   ├── projects/[id]/
    │   │   │   ├── page.tsx           # Project overview, activity & settings workspace
    │   │   │   ├── editor/page.tsx    # Screenplay writing studio
    │   │   │   └── preview/page.tsx   # Screenplay reader / print view
    │   │   ├── settings/page.tsx      # User profile & writing preferences
    │   │   ├── globals.css            # Global CSS, Tailwind tokens & paper styling
    │   │   ├── layout.tsx             # Root layout and font configurations
    │   │   └── page.tsx               # Cinematic public landing page
    │   ├── components/                # Reusable UI and domain components
    │   │   ├── dashboard/             # Project cards and stats
    │   │   ├── editor/                # TipTap editor, toolbar, scene nav & export modal
    │   │   ├── landing/               # Hero, showcase & footer sections
    │   │   ├── modals/                # Create project dialog
    │   │   ├── navigation/            # Main navigation header & workspace sidebar
    │   │   ├── preview/               # Screenplay preview canvas & page switcher
    │   │   ├── ui/                    # Base UI / shadcn design system primitives
    │   │   └── workspace/             # Overview, activity timeline & project settings
    │   ├── hooks/                     # Custom React Query & auth hooks
    │   ├── lib/                       # API client, date helpers, export utilities
    │   ├── middleware.ts              # Route protection & cookie redirection guard
    │   ├── providers/                 # React Query & Theme providers
    │   ├── stores/                    # Zustand client stores (auth, projects)
    │   └── types/                     # TypeScript domain models and interfaces
    ├── components.json                # shadcn/ui configuration
    ├── eslint.config.mjs              # ESLint configuration
    ├── next.config.ts                 # Next.js configuration
    ├── package.json                   # Frontend dependencies and scripts
    └── tsconfig.json                  # TypeScript compiler configuration
```

---

## Subsystem Documentation

* **[Frontend Documentation](./frontend/README.md)**: Details Next.js App Router architecture, TipTap extension design, physical page height calculations, state management, form validations, and client route protection.
* **[Backend Documentation](./backend/README.md)**: Details the Go Gin architecture, pgxpool database configuration, optimistic concurrency controls, version checkpoint restoration, multi-tenant security isolation, and complete API endpoint reference.

---

## Features

### Implemented Features

* **Landing Page**: Cinematic hero section, product showcase, clean navigation, and call-to-actions.
* **Multi-Provider Authentication**:
  * Email and password registration & login with bcrypt password hashing.
  * Google OAuth sign-in flow via Goth and session tokens.
  * Automatic account identity linking (e.g., linking Google auth to an existing email account).
  * Database-backed refresh tokens with SHA-256 hashing, strict token rotation, and instant logout revocation.
* **Route Protection & Security**: Next.js middleware intercepting unauthenticated requests to `/dashboard`, `/projects`, and `/settings`, with silent JWT refresh handling on 401 API responses.
* **Project Dashboard**:
  * Filter projects by status (`All`, `In Progress`, `Completed`, `Drafts`).
  * Live search across project titles, loglines, and genres.
  * Project creation modal with format selection and metadata input.
* **Project Workspace**:
  * **Overview Tab**: Project summary cards, live word/page/scene counters, last edited scene indicators, and recent activity log.
  * **Activity Tab**: Chronological audit trail of project creation, editing, and exports.
  * **Settings Tab**: Project title, logline, genre, format, synopsis updates, project archiving, and permanent deletion with confirmation guard.
* **Screenplay Editor**:
  * Custom TipTap nodes (`ScreenplayParagraph` and `ScreenplayHeading`) supporting 6 industry-standard element types: Scene Heading, Action, Character, Dialogue, Parenthetical, and Transition.
  * Keyboard navigation shortcuts: `Tab` cycles element types; `Enter` creates context-aware continuation blocks (e.g., Character $\rightarrow$ Dialogue $\rightarrow$ Action).
  * Element formatting toolbar with undo, redo, and element selection.
  * Collapsible Scene Navigator with slugline jumping.
  * Autosave with visual status indicators (`Saving...` / `Saved`) and optimistic concurrency conflict management.
* **Physical Page Pagination**:
  * ProseMirror decoration plugin dynamically calculating usable page heights (840px threshold).
  * Seamless multi-page document flow on an 8.5" × 11" canvas preventing visual text overflow.
  * Visual page breaks with header page numbering (e.g., `Page 2.`).
* **Screenplay Reader & Preview**:
  * Dedicated multi-page reading mode with thumbnail page selector.
  * Zoom scaling (75%, 100%, 125%, 150%) and fullscreen toggle.
  * Direct browser print integration.
* **Screenplay Export**:
  * **PDF**: Print-ready formatted layout via browser print engine.
  * **Fountain**: Standard plain text `.fountain` format with scene and character tags.
  * **Plain Text**: Standard indented `.txt` screenplay format.
* **Screenplay Version History (Backend)**:
  * Named checkpoint creation (`POST /api/v1/screenplays/:id/versions`).
  * Checkpoint listing and historical version retrieval.
  * Transactional version restoration with automatic restore checkpoints (`POST /api/v1/screenplays/:id/versions/:versionId/restore`).
* **Multi-Tenant Ownership Isolation**: Strict database query filters preventing cross-tenant project or screenplay access, returning `404 Not Found` on unauthorized access attempts.

### In Progress

* Frontend UI integration for the backend screenplay version history snapshots and rollback modal.
* Automated offline draft caching in IndexedDB.

### Planned (Future Roadmap)

* **End-to-End Encryption (E2EE)**: Client-side encryption of screenplay content using AES-GCM before transmission to the database.
* **Multi-User Collaboration & Sharing**: Project invitation system, role-based access control (Viewer, Commenter, Co-Writer), and public/private key wrapping for secure screenplay key distribution.
* **Server-Side PDF Rendering**: Dedicated headless Chromium or Typst PDF generation pipeline.

---

## Authentication & Security Overview

### Implemented Security Controls

| Security Layer | Implementation |
| :--- | :--- |
| **Password Storage** | Passwords hashed using `bcrypt` (cost 10). |
| **Access Tokens** | Short-lived signed JWTs (HS256) expiring in 60 minutes. |
| **Refresh Tokens** | Cryptographically secure random 32-byte tokens, hashed with SHA-256 before storage in PostgreSQL. |
| **Token Rotation** | Every refresh request revokes the existing refresh token and issues a new token pair. |
| **Session Revocation** | Explicit logout marks refresh tokens as revoked in the database. |
| **Route Protection** | Next.js Edge Middleware checks `karu_access_token` cookies for protected routes. |
| **Tenant Isolation** | All backend queries enforce `user_id` ownership checks across `projects`, `screenplays`, `contents`, and `versions`. Unauthorized queries return `404 Not Found`. |
| **CORS Policy** | Strict origin validation configured via `CORS_ALLOWED_ORIGINS`. |

### Security Limitations & Disclaimers

* **End-to-End Encryption (E2EE)**: **Not currently implemented.** Screenplay text is stored in PostgreSQL as plaintext in `screenplay_contents` and `screenplay_versions`.
* **Collaborative Sharing**: **Not currently implemented.** Screenplay access is restricted strictly to the project owner.

---

## Screenplay Engine

### Element Hierarchy & Rules

```text
Scene Heading (H2) ──[Enter]──> Action
Action ───────────────[Tab]────> Character
Character ────────────[Enter]──> Dialogue
Dialogue ─────────────[Enter]──> Action
Parenthetical ────────[Enter]──> Dialogue
Transition ───────────[Enter]──> Scene Heading
```

### Optimistic Concurrency Control (OCC)

When multiple tabs or clients edit a screenplay, Karu prevents overwriting newer drafts using revision integers:

```text
Client A (Rev 3) ─── PUT /content (rev=3) ───► Backend [DB Rev=3] ──► Success (DB Rev=4)
Client B (Rev 3) ─── PUT /content (rev=3) ───► Backend [DB Rev=4] ──► 409 Conflict (REVISION_CONFLICT)
```

If a client attempts to save with a stale revision number, the server returns `409 Conflict` with error code `REVISION_CONFLICT`.

---

## Local Development

### Prerequisites

* [Node.js](https://nodejs.org/) (v20+ recommended)
* [pnpm](https://pnpm.io/) (v10+ or v11)
* [Go](https://go.dev/) (v1.24+ or v1.27)
* [Docker Desktop](https://www.docker.com/) (for PostgreSQL)

---

### 1. Clone Repository

```bash
git clone git@github.com:senthil-karthikeyan/karu.git
cd karu
```

---

### 2. Start PostgreSQL Backend

Navigate to the `backend` directory:

```bash
cd backend
cp .env.example .env
```

Start the PostgreSQL container:

```bash
make docker-up
```

Run database schema migrations:

```bash
make migrate-up
```

Start the Go backend server (with live reload via Air):

```bash
make dev
```

Or run directly using standard Go:

```bash
make run
```

The Go API server will be live at `http://localhost:8080`.

---

### 3. Start Next.js Frontend

In a separate terminal, navigate to the `frontend` directory:

```bash
cd frontend
cp .env.example .env.local    # or verify NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
pnpm install
pnpm dev
```

The frontend development server will be available at `http://localhost:3000`.

---

## Testing & Quality Assurance

### Backend Verification

Run unit tests:

```bash
cd backend
make test
```

Run full integration tests (with Testcontainers PostgreSQL instance):

```bash
cd backend
make itest
```

Or run all backend tests directly:

```bash
cd backend
go test ./... -v
```

Verify backend binary build:

```bash
cd backend
go build ./...
```

### Frontend Verification

Run TypeScript typecheck:

```bash
cd frontend
pnpm exec tsc --noEmit
```

Run ESLint:

```bash
cd frontend
pnpm lint
```

Verify production build:

```bash
cd frontend
pnpm build
```

---

## Environment Variables

### Backend (`/backend/.env`)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `8080` | Port for the Go HTTP API server |
| `APP_ENV` | `development` | Environment mode (`development`, `production`, `test`) |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/karu?sslmode=disable` | Unified PostgreSQL connection string (Single Source of Truth) |
| `DB_MAX_CONNS` | `25` | Maximum database pool connections |
| `DB_MIN_CONNS` | `2` | Minimum idle database pool connections |
| `JWT_ACCESS_SECRET` | *(secret)* | Secret key for signing JWT access tokens |
| `JWT_ACCESS_EXPIRATION` | `60` | Access token lifetime in minutes |
| `JWT_REFRESH_SECRET` | *(secret)* | Secret key for signing JWT refresh tokens |
| `JWT_REFRESH_EXPIRATION` | `7` | Refresh token lifetime in days |
| `GOTH_SESSION_SECRET` | *(secret)* | Secret for Goth session cookie store |
| `GOOGLE_CLIENT_ID` | *(client id)* | Google Cloud OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | *(client secret)* | Google Cloud OAuth 2.0 Client Secret |
| `GOOGLE_REDIRECT_URL` | `http://localhost:8080/api/v1/auth/google/callback` | Google OAuth redirect callback URL |
| `FRONTEND_URL` | `http://localhost:3000` | Frontend application base URL |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Allowed CORS origins (comma-separated) |

### Frontend (`/frontend/.env.local`)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080/api/v1` | Base URL of the Go backend API |

---

## Future Architecture (Planned)

### 1. End-to-End Encryption (E2EE) Pipeline

When implemented, screenplays will be encrypted on the client device before transmission:

```text
Screenplay Content
       │
       ▼
Generate Random 256-bit Key (DEK)
       │
       ▼
AES-GCM-256 Encryption ────────► Encrypted Screenplay Blob ──► PostgreSQL
       │
       ▼
Wrap DEK with User Master Key ──► Encrypted Key Storage
```

### 2. Multi-Party Key Wrapping for Collaboration

When project sharing is introduced, the Document Encryption Key (DEK) will be wrapped with each recipient's public key:

```text
Document Key (DEK)
       ├── Wrapped with Owner Public Key ────► Owner Key Wrapper
       └── Wrapped with Collaborator Public Key ──► Collaborator Key Wrapper
```

---

## License

This project is proprietary and confidential. All rights reserved.
