# Karu Frontend

The frontend client for **Karu**, an immersive screenplay writing studio and film development workspace. Built with **Next.js 16 (App Router & Turbopack)**, **React 19**, **TypeScript**, **Tailwind CSS v4**, **shadcn/ui**, **TipTap**, and **Zero-Knowledge Web Crypto API (E2EE)**.

---

## 🛠 Tech Stack

* **Framework**: [Next.js 16.3.1](https://nextjs.org/) (App Router, Turbopack, Server & Client Components)
* **Library**: [React 19.2.8](https://react.dev/)
* **Language**: [TypeScript 5.9](https://www.typescriptlang.org/)
* **Cryptography (E2EE)**: [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) (`SubtleCrypto`, AES-256-GCM, PBKDF2-SHA256, ECDH P-256)
* **Styling**: [Tailwind CSS v4.3.3](https://tailwindcss.com/) with PostCSS
* **UI Components**: [shadcn/ui](https://ui.shadcn.com/) / [@base-ui/react](https://base-ui.com/)
* **Screenplay Editor**: [TipTap 3.30](https://tiptap.dev/) with ProseMirror (`@tiptap/pm`)
* **Server State & Cache**: [@tanstack/react-query 5.101](https://tanstack.com/query)
* **Client State Management**: [Zustand 5.0](https://zustand-demo.pmnd.rs/) (Non-persistent in-memory cryptographic key store)
* **Form Validation**: [React Hook Form 7.85](https://react-hook-form.com/) + [Zod 4.4](https://zod.dev/)
* **Browser Automation & Testing**: [Playwright](https://playwright.dev/) + [tsx](https://github.com/privatenumber/tsx)
* **Icons**: [Lucide React 1.31](https://lucide.dev/)
* **Notifications**: [Sonner 2.0](https://sonner.emilkowal.ski/)
* **Date Utilities**: [date-fns 4.4](https://date-fns.org/)
* **Package Manager**: [pnpm 11](https://pnpm.io/)

---

## 🏗 Architecture

The frontend follows Next.js App Router patterns, utilizing Server Components for high-performance static rendering and Client Components (`"use client"`) for rich interactive workspaces, TipTap editing, and client-side encryption.

```text
┌─────────────────────────────────────────────────────────────┐
│                      Next.js App Router                     │
│    /(auth) • /dashboard • /projects/[id] • /settings       │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│      Server Components      │ │      Client Components      │
│   Landing • Layout Shells   │ │  Screenplay Editor • Forms  │
│     Static Metadata SEO     │ │  Workspace Tabs • Modals    │
└─────────────────────────────┘ └──────────────┬──────────────┘
                                               │
                                               ▼
                                ┌─────────────────────────────┐
                                │      E2EE Crypto Engine     │
                                │   Web Crypto (SubtleCrypto) │
                                │  UEK • SCK • ECDH P256      │
                                └──────────────┬──────────────┘
                                               │
                                               ▼
                                ┌─────────────────────────────┐
                                │       State & Data Layer    │
                                │ TanStack Query (Server)     │
                                │ Zustand Stores (In-Memory)  │
                                │ Local Statistics Engine     │
                                └──────────────┬──────────────┘
                                               │
                                               ▼
                                ┌─────────────────────────────┐
                                │      API Client Layer       │
                                │ Fetch • Bearer Auth • Queue │
                                │ Token Refresh Interceptor   │
                                └─────────────────────────────┘
```

---

## 📁 Directory Structure

```text
frontend/
├── public/                    # Static image assets and icons
├── scripts/
│   ├── e2e-browser-test.mjs   # Full 21-test Playwright browser automation suite
│   └── run-crypto-tests.mjs   # 17-test Web Crypto unit test runner
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── (auth)/            # Authentication group routes
│   │   │   ├── login/         # /login page
│   │   │   └── signup/        # /signup page
│   │   ├── auth/callback/     # /auth/callback (OAuth token handling)
│   │   ├── dashboard/         # /dashboard (Project listing & search)
│   │   ├── projects/[id]/     # Project workspace routes
│   │   │   ├── editor/        # /projects/[id]/editor (TipTap editor)
│   │   │   ├── preview/       # /projects/[id]/preview (Reading & print view)
│   │   │   └── page.tsx       # /projects/[id] (Overview, Activity, Settings)
│   │   ├── settings/          # /settings (Profile, Security, Migration tab)
│   │   ├── globals.css        # Global CSS & screenplay styling tokens
│   │   ├── layout.tsx         # Root layout with providers & fonts
│   │   └── page.tsx           # Public landing page
│   ├── components/            # Component design system
│   │   ├── crypto/            # E2EE components
│   │   │   ├── encryption-badge.tsx           # Visual lock/unlocked tooltip badge
│   │   │   ├── encryption-banner.tsx          # Setup prompt banners
│   │   │   ├── encryption-dialog.tsx          # Passphrase unlock/setup modal
│   │   │   ├── encryption-onboarding-modal.tsx # First-time setup wizard
│   │   │   └── legacy-migration-card.tsx      # In-place batch encryption migration
│   │   ├── dashboard/         # Project cards, metrics, filters
│   │   ├── editor/            # Screenplay editor, toolbar, scene nav, export
│   │   ├── landing/           # Hero, feature showcase, footer
│   │   ├── modals/            # Create project modal
│   │   ├── navigation/        # Main navigation header & workspace sidebar
│   │   ├── preview/           # Multi-page preview canvas & pagination strip
│   │   ├── ui/                # Base UI / shadcn design system primitives
│   │   └── workspace/         # Overview, activity log & project settings
│   ├── hooks/                 # React Query & auth hooks
│   │   ├── use-auth.ts        # Session verification and guard hook
│   │   ├── use-projects.ts    # React Query hooks for projects, screenplays, activities
│   │   └── use-user.ts        # React Query hooks for user profile & settings
│   ├── lib/                   # Utility libraries & API client
│   │   ├── api/               # Typed API client modules
│   │   │   ├── client.ts      # Core fetch wrapper with 401 token refresh queue
│   │   │   ├── auth.ts        # Authentication & encryption identity endpoints
│   │   │   ├── projects.ts    # Project CRUD endpoints (pure project metadata)
│   │   │   ├── screenplays.ts # Screenplay content, revisions, versions, statistics & keys
│   │   │   └── activities.ts  # Activity history endpoints
│   │   ├── crypto/            # Client-Side Cryptographic Engine (E2EE)
│   │   │   ├── aes-gcm.ts     # AES-256-GCM encryption & decryption
│   │   │   ├── crypto-types.ts # TypeScript interfaces for keys & payloads
│   │   │   ├── encoding.ts    # Lossless UTF-8 & Base64 conversions
│   │   │   ├── index.ts       # Barrel export
│   │   │   ├── key-derivation.ts # PBKDF2-SHA256 (600,000 rounds)
│   │   │   ├── key-manager.ts # 2-tier key wrapping & ECDH P-256 identity
│   │   │   ├── recovery.ts    # Emergency recovery key generator & kit
│   │   │   └── screenplay-encryption.ts # TipTap JSON AST encryption & parsing
│   │   ├── date.ts            # Relative time formatting
│   │   ├── export-utils.ts    # PDF, Fountain & Plain Text converters
│   │   ├── initial-data.ts    # Default screenplay seed template
│   │   └── utils.ts           # clsx / tailwind-merge helper
│   ├── middleware.ts          # Edge middleware for route protection & cookies
│   ├── providers/             # React Query & Theme providers
│   ├── stores/                # Zustand client state stores
│   │   ├── auth-store.ts      # Authentication session state
│   │   ├── encryption-store.ts # In-memory cryptographic key state
│   │   ├── project-store.ts   # Project activity and local project state
│   │   ├── app-store.ts       # Global UI toggles
│   │   └── user-store.ts      # Local profile state
│   └── types/                 # TypeScript interfaces and domain types
│       └── screenplay.ts      # Screenplay, Project & Export types
├── package.json               # Package dependencies & scripts
└── tsconfig.json              # TypeScript compiler configuration
```

---

## 🔐 Zero-Knowledge Cryptographic Engine (`src/lib/crypto`)

### 1. Key Hierarchy

Karu implements a 2-tier direct key architecture:

1. **Tier 1 — User Encryption Key (`UEK`)**:
   - Derived client-side via `PBKDF2-SHA256` using the user's secret passphrase, 32-byte CSPRNG salt, and **600,000 iterations**.
   - Held strictly in non-persistent JavaScript memory (Zustand). Never stored in `localStorage`, `sessionStorage`, or cookies.
2. **Tier 2 — Screenplay Content Key (`SCK`) & Document Encryption**:
   - `SCK`: Unique 256-bit AES-GCM key generated per screenplay and directly wrapped with the user's `UEK`.
   - `Document Payload`: Serialized TipTap JSON encrypted with `SCK` using a fresh 12-byte random IV.

### 2. Client-Side Statistics Calculation

Because the backend holds zero knowledge of the plaintext screenplay content, statistics calculation is performed entirely client-side:
- **Word Count**: Computed from active TipTap document text.
- **Page Count**: Real-time physical page measurement from `ScreenplayPagination` ProseMirror plugin (840px usable page height threshold).
- **Scene Count**: Computed by traversing the TipTap AST (`sceneHeading` nodes).
- Statistics are passed alongside the encrypted document payload during autosave (`PUT /screenplays/:id/content`) and stored at the screenplay level (`screenplays.word_count`, `screenplays.page_count`, `screenplays.scene_count`).

---

## 📝 Screenplay Editor Implementation

The writing studio in `components/editor/screenplay-editor.tsx` is powered by TipTap with bespoke extensions in `components/editor/screenplay-extensions.ts`:

### 1. Custom Nodes
* `ScreenplayParagraph`: Block node retaining a `data-type` attribute (`action`, `character`, `dialogue`, `parenthetical`, `transition`).
* `ScreenplayHeading`: Level 2 heading configured specifically for scene headings (`data-type="scene-heading"`).

### 2. Context-Aware Keyboard Shortcuts
* **`Tab` Shortcut**: Intelligently cycles the active block's element type:
  $$\text{Action} \longrightarrow \text{Character} \longrightarrow \text{Dialogue} \longrightarrow \text{Parenthetical} \longrightarrow \text{Transition} \longrightarrow \text{Scene Heading}$$
* **`Enter` Shortcut**: Automatically predicts the next logical screenplay element:
  * Heading $\rightarrow$ Action
  * Character $\rightarrow$ Dialogue
  * Dialogue $\rightarrow$ Action
  * Parenthetical $\rightarrow$ Dialogue
  * Transition $\rightarrow$ Scene Heading

### 3. Real-Time Physical Page Pagination
* Implemented via a custom **ProseMirror Plugin** (`ScreenplayPagination`).
* Calculates block heights in real-time based on DOM offset measurements and character counts (840px usable page height threshold).
* Injects non-editable ProseMirror widget decorations (`screenplay-page-break-widget`) at page boundary positions.
* Displays header page numbers (e.g., `Page 2.`) and bottom page breaks without splitting the single underlying editable document.

---

## ⚙️ Environment Variables

Create a `.env.local` file in `/frontend`:

```bash
# Backend API Base URL
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

---

## 🚀 Development & Scripts

### Install Dependencies

```bash
pnpm install
```

### Start Development Server (Turbopack)

```bash
pnpm dev
```

The application will be running at [http://localhost:3000](http://localhost:3000).

---

## 🧪 Verification & Testing

### 1. Run Cryptographic Unit Tests (17 Suites)

```bash
pnpm test:crypto
```

### 2. Run Automated Playwright Browser E2E Tests (21 Tests)

```bash
node scripts/e2e-browser-test.mjs
```

### 3. Type Check & Lint

```bash
pnpm exec tsc --noEmit
pnpm lint
```

### 4. Production Build

```bash
pnpm build
```
