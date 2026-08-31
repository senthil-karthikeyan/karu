# Karu

**Karu** is a modern, distraction-free film workspace and screenplay writing studio built for screenwriters, directors, and independent filmmakers. It combines industry-standard screenplay formatting with an 8.5" × 11" physical page canvas, real-time autosave with optimistic concurrency control, immutable version checkpointing, and **Zero-Knowledge 3-Tier End-to-End Encryption (E2EE)**.

---

## What Karu Is

Karu is designed to streamline the filmmaking and screenwriting workflow from initial concept to production draft with military-grade privacy. Traditional screenwriting software is often cluttered, legacy-bound, or tied to proprietary desktop formats with unencrypted cloud storage. Karu delivers:

* **Zero-Knowledge End-to-End Encryption (E2EE)**: Client-side AES-256-GCM encryption ensures screenplay drafts, character bios, dialogue, and revision history are encrypted before leaving your browser. The database and backend hold zero knowledge of your creative work.
* **3-Tier Cryptographic Key Hierarchy**: Master User Encryption Key (`UEK`) $\rightarrow$ Scoped Project Encryption Key (`PEK`) $\rightarrow$ Document Screenplay Content Key (`SCK`) with ECDH P-256 asymmetric identity for secure offline key distribution.
* **Emergency Recovery Kit**: Base32 checksummed emergency recovery keys (`KARU-XXXX-XXXX-...`) with downloadable recovery kits preventing data lock-out.
* **Cinematic Project Workspace**: Manage film projects with rich metadata including title, loglines, genre, format, and synopsis.
* **Physical Page Pagination**: Write on an industry-standard 8.5" × 11" screenplay canvas with real-time block-height pagination that flows text across page boundaries with header page numbering.
* **Screenplay Typography & Shortcuts**: Full Courier Prime 12pt typography with context-aware `Tab` and `Enter` keyboard shortcuts cycling through scene headings, action, character, dialogue, parentheticals, and transitions.
* **Robust Autosave with Optimistic Concurrency**: Debounced client autosave paired with database revision tracking that detects stale updates and prevents overwrite conflicts.
* **Version Checkpoints & Zero-Knowledge Restore**: Snapshot named milestone drafts and transactionally restore historical versions without server-side plaintext exposure.
* **Screenplay Reader & Exporter**: Dedicated reading mode with zooming, printing, and multi-format export to PDF (print-ready), Fountain (`.fountain`), and Plain Text (`.txt`).
* **Multi-Provider Authentication**: Secure email/password authentication (bcrypt) and Google OAuth (via Goth) backed by rotating refresh token sessions.
* **Legacy Plaintext Migration**: One-click in-place batch migration to convert unencrypted legacy projects into the 3-tier E2EE scheme.

---

## Current Status

Karu is fully implemented, hardened, and operational:

* **Frontend**: Built with **Next.js 16 (Turbopack)**, **React 19**, **Tailwind CSS v4**, **shadcn/ui**, **TipTap (ProseMirror)**, and **Web Crypto API (SubtleCrypto)**.
* **Backend**: High-performance REST API built in **Go 1.24+** using **Gin**, **pgx/v5**, **sqlc**, **golang-migrate**, **golang-jwt/v5**, and security middleware.
* **Database**: **PostgreSQL 16** managed through versioned SQL migrations (`000001` through `000006`).
* **Security & E2EE**: 100% Zero-Knowledge 3-tier key hierarchy verified via 12 cryptographic unit tests and 21 automated Playwright browser tests.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                      Next.js 16 Client                      │
│   React 19 • TipTap • Web Crypto API • TanStack Query       │
│    Zustand (In-Memory Crypto Keys) • Tailwind CSS v4        │
└──────────────────────────────┬──────────────────────────────┘
                               │
               Encrypted Payloads (AES-256-GCM)
               HTTPS / JSON API • Bearer JWT
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       Go API (Gin)                          │
│   Router • Security Headers • Auth & Refresh Token Rotation │
│       Services • Repositories • Goth (Google OAuth)         │
│          Zero-Knowledge Backend (Opaque Ciphertext)         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                             pgxpool
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL 16 Engine                     │
│    Users • Auth Identities • Refresh Tokens • Projects      │
│    Project Keys • User Encryption Identities • Scenes       │
│    Screenplays • Screenplay Keys • Contents • Versions      │
└─────────────────────────────────────────────────────────────┘
```

---

## Cryptographic Key Hierarchy

```text
               +----------------------------------+
               |        Master Passphrase         |
               +----------------------------------+
                                |
                                | PBKDF2-SHA256 (600,000 iterations)
                                v
               +----------------------------------+
               |   User Encryption Key (UEK)      |  (Tier 1: Master Key in Memory)
               +----------------------------------+
                     /                      \
      AES-256-GCM   /                        \  AES-256-GCM
                   v                          v
    +---------------------------+     +-----------------------------+
    | User Identity Keypair     |     | Project Encryption Key (PEK)|  (Tier 2: Scoped Key)
    | (ECDH P-256 Private Key)  |     | (Random AES-256-GCM Key)    |
    +---------------------------+     +-----------------------------+
                                                     |
                                                     | AES-256-GCM
                                                     v
                                      +-----------------------------+
                                      | Screenplay Content Key (SCK)|  (Tier 3: Document Key)
                                      | (Random AES-256-GCM Key)    |
                                      +-----------------------------+
                                                     |
                                                     | AES-256-GCM (Fresh 12-byte IV)
                                                     v
                                      +-----------------------------+
                                      | Serialized TipTap JSON      |
                                      | (Ciphertext + 128-bit Tag)  |
                                      +-----------------------------+
```

---

## Repository Structure

```text
karu/
├── README.md                          # Main project documentation (this file)
├── docs/
│   └── SECURITY_ARCHITECTURE.md       # Cryptographic specification & threat model
├── backend/                           # Go REST API backend service
│   ├── cmd/
│   │   ├── api/main.go                # API entry point & service bootstrap
│   │   └── server/main.go             # Alternate server bootstrap
│   ├── db/
│   │   ├── migrations/                # Versioned SQL migrations (golang-migrate)
│   │   │   ├── 000001_initial_schema.up.sql
│   │   │   ├── 000002_auth_identities_and_screenplays.up.sql
│   │   │   ├── 000003_e2ee_support.up.sql
│   │   │   ├── 000004_e2ee_support.up.sql
│   │   │   ├── 000005_user_encryption_identities.up.sql
│   │   │   └── 000006_project_keys.up.sql
│   │   └── queries/                   # sqlc source SQL queries
│   │       ├── activities.sql
│   │       ├── auth_identities.sql
│   │       ├── project_keys.sql
│   │       ├── projects.sql
│   │       ├── refresh_tokens.sql
│   │       ├── scenes.sql
│   │       ├── screenplay_contents.sql
│   │       ├── screenplay_versions.sql
│   │       ├── screenplays.sql
│   │       ├── user_encryption_identities.sql
│   │       └── users.sql
│   ├── internal/
│   │   ├── auth/                      # Password hashing (bcrypt), JWT, and Goth OAuth
│   │   ├── config/                    # Environment variable configuration loader
│   │   ├── database/                  # pgxpool lifecycle & migration runner
│   │   ├── handler/                   # Gin HTTP request handlers & input validation
│   │   ├── middleware/                # Security headers, JWT, CORS, logging, recovery
│   │   ├── model/                     # Domain DTOs, encryption payloads, error codes
│   │   ├── repository/                # Data access layer wrapping sqlc queries
│   │   ├── router/                    # Route definition and dependency injection
│   │   ├── server/                    # HTTP server configuration
│   │   └── service/                   # Core business logic (Auth, Projects, Screenplays, Keys)
│   ├── sqlc/
│   │   └── generated/                 # Type-safe Go code generated by sqlc
│   ├── Dockerfile                     # Multi-stage production container build
│   ├── docker-compose.yml             # Local PostgreSQL container service
│   ├── Makefile                       # Developer task runner
│   ├── go.mod                         # Go module definitions
│   └── sqlc.yaml                      # sqlc compiler configuration
└── frontend/                          # Next.js 16 frontend application
    ├── public/                        # Static assets and icons
    ├── scripts/
    │   ├── e2e-browser-test.mjs       # Automated 21-step Playwright browser test
    │   └── run-crypto-tests.mjs       # 12-suite cryptographic unit test runner
    ├── src/
    │   ├── app/                       # Next.js App Router pages and layouts
    │   │   ├── (auth)/login/page.tsx  # Sign-in page
    │   │   ├── (auth)/signup/page.tsx # Registration page
    │   │   ├── auth/callback/page.tsx # OAuth token callback handler
    │   │   ├── dashboard/page.tsx     # Film project dashboard
    │   │   ├── projects/[id]/         # Project workspace hub
    │   │   │   ├── editor/page.tsx    # Screenplay writing studio
    │   │   │   └── preview/page.tsx   # Screenplay reader / print view
    │   │   ├── settings/page.tsx      # User profile, security & migration tab
    │   │   └── globals.css            # Global CSS, Tailwind tokens & paper styling
    │   ├── components/                # Reusable UI and domain components
    │   │   ├── crypto/                # E2EE badges, banners, unlock dialog, migration card
    │   │   ├── dashboard/             # Project cards and stats
    │   │   ├── editor/                # TipTap editor, toolbar, scene nav & export modal
    │   │   ├── landing/               # Hero, showcase & footer sections
    │   │   ├── modals/                # Create project dialog with auto-PEK generation
    │   │   ├── navigation/            # Main navigation header & workspace sidebar
    │   │   ├── preview/               # Screenplay preview canvas & decryption
    │   │   └── ui/                    # Base UI / shadcn design system primitives
    │   ├── hooks/                     # Custom React Query & auth hooks
    │   ├── lib/
    │   │   ├── api/                   # Typed API client modules
    │   │   ├── crypto/                # Web Crypto API E2EE engine
    │   │   │   ├── aes-gcm.ts         # AES-256-GCM encrypt/decrypt primitives
    │   │   │   ├── crypto-types.ts    # Key & payload interfaces
    │   │   │   ├── encoding.ts        # UTF-8 & Base64 chunked converters
    │   │   │   ├── key-derivation.ts  # PBKDF2-SHA256 (600,000 iterations)
    │   │   │   ├── key-manager.ts     # 3-tier key wrapping & ECDH P-256 identity
    │   │   │   ├── recovery.ts        # Emergency recovery key kit generator
    │   │   │   └── screenplay-encryption.ts # TipTap JSON AST encryption
    │   │   └── export-utils.ts        # PDF, Fountain & Plain Text converters
    │   ├── middleware.ts              # Route protection & cookie redirection guard
    │   ├── stores/                    # Zustand client stores (auth, encryption)
    │   └── types/                     # TypeScript domain models and interfaces
    ├── package.json                   # Frontend dependencies and scripts
    └── tsconfig.json                  # TypeScript compiler configuration
```

---

## Subsystem Documentation

* **[Frontend Documentation](./frontend/README.md)**: Details Next.js 16 App Router architecture, TipTap extension design, physical page height calculations, client-side cryptographic engine (`lib/crypto`), state management, form validations, and route protection.
* **[Backend Documentation](./backend/README.md)**: Details the Go Gin architecture, pgxpool database configuration, 3-tier key persistence, optimistic concurrency controls, version checkpoint restoration, multi-tenant security isolation, and complete API endpoint reference.
* **[Security Architecture & Threat Model](./docs/SECURITY_ARCHITECTURE.md)**: Comprehensive cryptographic specifications, threat models, attack surface mitigations, and defense-in-depth security policies.

---

## Features

### Implemented Features

* **Zero-Knowledge End-to-End Encryption (E2EE)**:
  * **3-Tier Key Hierarchy**: $\text{UEK} \rightarrow \text{PEK} \rightarrow \text{SCK} \rightarrow \text{AES-256-GCM Document}$.
  * **User Encryption Identity**: ECDH P-256 asymmetric keypairs with encrypted private keys stored in `user_encryption_identities`.
  * **Emergency Recovery Kit**: Base32 checksummed recovery key generation and downloadable recovery kit (`.txt`).
  * **Automatic PEK Generation**: Project creation modals automatically generate and wrap a `PEK` with the active `UEK`.
  * **Autosave Encryption Loop**: TipTap document JSON is encrypted client-side with fresh 12-byte IVs before transmission.
  * **Secure Decrypt & Load Flow**: Automatic decryption in editor, preview mode, and export modal when the encryption session is unlocked.
  * **Locked Workspace Canvas**: Elegant lock banner preventing plaintext/ciphertext leaks when the session is locked.
  * **E2EE Version Checkpoints**: Named snapshots and zero-knowledge atomic restorations preserving ciphertext and IVs.
  * **Legacy Plaintext Migration**: In-place batch migration tool in Settings converting legacy unencrypted projects to 3-tier E2EE.
* **Landing Page**: Cinematic hero section, product showcase, clean navigation, and call-to-actions.
* **Multi-Provider Authentication**:
  * Email/password registration & login with bcrypt (cost 10).
  * Google OAuth sign-in flow via Goth and session tokens.
  * Automatic account identity linking.
  * Database-backed refresh tokens with SHA-256 hashing, strict token rotation, and instant logout revocation.
* **Route Protection & Security**: Next.js Edge middleware intercepting unauthenticated requests, with silent JWT refresh handling on 401 API responses.
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
  * Keyboard navigation shortcuts: `Tab` cycles element types; `Enter` creates context-aware continuation blocks.
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
* **Multi-Tenant Ownership Isolation**: Strict database query filters preventing cross-tenant project or screenplay access, returning `404 Not Found` on unauthorized access attempts.

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
cp .env.example .env.local
pnpm install
pnpm dev
```

The frontend development server will be available at `http://localhost:3000`.

---

## Testing & Quality Assurance

### Cryptographic Unit Test Suite

Run the full 12-suite Web Crypto E2EE tests:

```bash
cd frontend
pnpm test:crypto
```

### End-to-End Browser Automation (Playwright)

Run the full 21-test browser automation suite against the live frontend and backend:

```bash
cd frontend
node scripts/e2e-browser-test.mjs
```

### Backend Verification

Run unit & integration tests:

```bash
cd backend
make test
go test ./... -v
```

Verify backend binary build:

```bash
cd backend
go build ./...
```

### Frontend Verification

Run TypeScript typecheck & lint:

```bash
cd frontend
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

---

## License

This project is proprietary and confidential. All rights reserved.
