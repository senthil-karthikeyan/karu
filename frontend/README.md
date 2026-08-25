# Karu Frontend

The frontend client for **Karu**, an immersive screenplay writing studio and film development workspace. Built with **Next.js 16 (App Router & Turbopack)**, **React 19**, **TypeScript**, **Tailwind CSS v4**, **shadcn/ui**, and **TipTap**.

---

## 🛠 Tech Stack

* **Framework**: [Next.js 16.3.1](https://nextjs.org/) (App Router, Turbopack, Server & Client Components)
* **Library**: [React 19.2.8](https://react.dev/)
* **Language**: [TypeScript 5.9](https://www.typescriptlang.org/)
* **Styling**: [Tailwind CSS v4.3.3](https://tailwindcss.com/) with PostCSS
* **UI Components**: [shadcn/ui](https://ui.shadcn.com/) / [@base-ui/react](https://base-ui.com/)
* **Screenplay Editor**: [TipTap 3.30](https://tiptap.dev/) with ProseMirror (`@tiptap/pm`)
* **Server State & Cache**: [@tanstack/react-query 5.101](https://tanstack.com/query)
* **Client State Management**: [Zustand 5.0](https://zustand-demo.pmnd.rs/)
* **Form Validation**: [React Hook Form 7.85](https://react-hook-form.com/) + [Zod 4.4](https://zod.dev/)
* **Icons**: [Lucide React 1.31](https://lucide.dev/)
* **Notifications**: [Sonner 2.0](https://sonner.emilkowal.ski/)
* **Date Utilities**: [date-fns 4.4](https://date-fns.org/)
* **Package Manager**: [pnpm 11](https://pnpm.io/)

---

## 🏗 Architecture

The frontend follows Next.js App Router patterns, utilizing Server Components for high-performance static rendering and Client Components (`"use client"`) for rich interactive workspaces and stateful forms.

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
                                │       State & Data Layer    │
                                │ TanStack Query (Server)     │
                                │ Zustand Stores (Client)     │
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
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── (auth)/            # Authentication group routes
│   │   │   ├── login/         # /login page
│   │   │   └── signup/        # /signup page
│   │   ├── auth/callback/     # /auth/callback (OAuth token handling)
│   │   ├── dashboard/         # /dashboard (Project listing & search)
│   │   ├── projects/[id]/     # Project workspace routes
│   │   │   ├── editor/        # /projects/[id]/editor (TipTap editor)
│   │   │   ├── preview/       # /projects/[id]/preview (Reading view)
│   │   │   └── page.tsx       # /projects/[id] (Overview, Activity, Settings)
│   │   ├── settings/          # /settings (User profile & preferences)
│   │   ├── globals.css        # Global CSS & screenplay styling tokens
│   │   ├── layout.tsx         # Root layout with providers & fonts
│   │   └── page.tsx           # Public landing page
│   ├── components/            # Component design system
│   │   ├── dashboard/         # Project cards, metrics, filters
│   │   ├── editor/            # Screenplay editor, toolbar, scene nav, export
│   │   ├── landing/           # Hero, feature showcase, footer
│   │   ├── modals/            # Create project modal
│   │   ├── navigation/        # Main navigation header & workspace sidebar
│   │   ├── preview/           # Multi-page preview canvas & pagination strip
│   │   ├── ui/                # shadcn / Base UI primitives
│   │   └── workspace/         # Overview, activity log & project settings
│   ├── hooks/                 # React Query & auth hooks
│   │   ├── use-auth.ts        # Session verification and guard hook
│   │   ├── use-projects.ts    # React Query hooks for projects, scenes, activities
│   │   └── use-user.ts        # React Query hooks for user profile & settings
│   ├── lib/                   # Utility libraries & API client
│   │   ├── api/               # Typed API client modules
│   │   │   ├── client.ts      # Core fetch wrapper with 401 token refresh queue
│   │   │   ├── auth.ts        # Authentication endpoints
│   │   │   ├── projects.ts    # Project CRUD endpoints
│   │   │   ├── screenplays.ts # Screenplay content, revisions & versions
│   │   │   ├── scenes.ts      # Scene management endpoints
│   │   │   └── activities.ts  # Activity history endpoints
│   │   ├── date.ts            # Relative time formatting
│   │   ├── export-utils.ts    # PDF, Fountain & Plain Text converters
│   │   ├── initial-data.ts    # Default screenplay seed template
│   │   └── utils.ts           # clsx / tailwind-merge helper
│   ├── middleware.ts          # Edge middleware for route protection & cookies
│   ├── providers/             # React Query & Theme providers
│   ├── stores/                # Zustand client state stores
│   │   ├── auth-store.ts      # Authentication session state
│   │   ├── project-store.ts   # Project activity and local project state
│   │   ├── app-store.ts       # Global UI toggles
│   │   └── user-store.ts      # Local profile state
│   └── types/                 # TypeScript interfaces and domain types
│       └── screenplay.ts      # Screenplay, Scene, Project & Export types
├── components.json            # shadcn/ui configuration
├── eslint.config.mjs          # ESLint 9 configuration
├── next.config.ts             # Next.js configuration
├── package.json               # Package dependencies & scripts
├── pnpm-lock.yaml             # pnpm dependency lockfile
├── postcss.config.mjs         # PostCSS configuration for Tailwind v4
└── tsconfig.json              # TypeScript compiler configuration
```

---

## 🗺 Application Routes

| Route | Access | Purpose |
| :--- | :--- | :--- |
| `/` | Public | Cinematic landing page showcasing product features, hero, and CTA. |
| `/login` | Public (Guest) | Sign-in form (email/password & Google OAuth). Redirects to `/dashboard` if authenticated. |
| `/signup` | Public (Guest) | Account registration form with terms consent and Google OAuth. Redirects to `/dashboard` if authenticated. |
| `/auth/callback` | Public | Receives OAuth redirect tokens (`?token=...&refresh_token=...`), initializes session, and routes to `/dashboard`. |
| `/dashboard` | **Protected** | Personal film studio dashboard with project cards, search, status tabs, and creation modal. |
| `/projects/:id` | **Protected** | Project workspace hub containing Overview, Scene breakdown, Activity history, and Project Settings. |
| `/projects/:id/editor` | **Protected** | Fullscreen screenplay editor with TipTap, real-time pagination, scene navigator, and export tools. |
| `/projects/:id/preview` | **Protected** | Dedicated screenplay reading and print preview mode with page-level navigation and zoom controls. |
| `/settings` | **Protected** | User profile settings, editor preferences (autoSave, spellCheck, wordWrap), and password updates. |

---

## 🎨 UI Architecture & Design System

* **Tailwind CSS v4**: Utilizes CSS variables and theme tokens for dark/light mode consistency.
* **Screenplay Paper Canvas**: Custom CSS classes (`screenplay-paper`, `dark:screenplay-paper-dark`) emulate physical 8.5" × 11" screenplay parchment.
* **Typography**: Industry-standard **Courier Prime 12pt** styling with accurate letter-spacing, line-height, and element indentation:
  * **Scene Heading**: Uppercase bold with top/bottom margin spacing.
  * **Action**: Full page margin width (60-70 characters per line).
  * **Character**: Centered uppercase (indent ~3.7").
  * **Dialogue**: Centered text block (width ~3.5", indent ~2.5").
  * **Parenthetical**: Dialogue annotation (indent ~3.1").
  * **Transition**: Right-aligned uppercase (e.g., `FADE OUT:`).

---

## ⚡ State Management

1. **Server State (TanStack Query v5)**:
   * Automatic caching, background revalidation, and optimistic mutations for projects, screenplays, scenes, and user profiles.
   * Query keys structured hierarchically (`["projects"]`, `["projects", id]`, `["screenplays", id]`, etc.).
2. **Client State (Zustand v5)**:
   * `auth-store`: Tracks user profile, authentication state, login/register/logout actions, and token initialization.
   * `project-store`: Manages active project context, client activity timeline, and local overrides.

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
* Calculates block heights in real-time based on DOM offset measurements and character counts (using an 840px usable page height threshold).
* Injects non-editable ProseMirror widget decorations (`screenplay-page-break-widget`) at page boundary positions.
* Displays header page numbers (e.g., `Page 2.`) and bottom page breaks without splitting the single underlying editable document.

### 4. Dynamic Scene Extraction
* Automatically extracts sluglines from `<h2>` elements in the screenplay HTML.
* Powers the collapsible **Scene Navigator** sidebar, enabling instant jump-to-scene selection.

---

## 🔒 Authentication & Route Protection

### 1. Edge Middleware (`src/middleware.ts`)
* Intercepts incoming requests before rendering.
* Checks for the presence of the `karu_access_token` cookie.
* **Unauthenticated users** accessing protected prefixes (`/dashboard`, `/projects`, `/settings`, `/workspace`) are redirected to `/login`.
* **Authenticated users** accessing `/login` or `/signup` are redirected to `/dashboard`.

### 2. API Client with Silent Token Refresh (`src/lib/api/client.ts`)
* Automatically injects `Authorization: Bearer <token>` into API requests.
* Intercepts `401 Unauthorized` responses and queues pending requests.
* Calls `POST /api/v1/auth/refresh` using the stored refresh token.
* On successful token rotation, updates local storage and cookies, then retries all queued requests.
* If refresh fails, tokens are cleared and the user is redirected to `/login`.

---

## 📤 Export Engine (`src/lib/export-utils.ts`)

* **PDF Export**: Triggers the browser's high-fidelity print engine configured with screenplay print CSS stylesheets.
* **Fountain Export**: Converts screenplay HTML nodes into plain `.fountain` text format adhering to the standard Fountain screenwriting syntax.
* **Plain Text Export**: Generates industry-standard indented plain text screenplay documents (`.txt`).

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

## 🧪 Verification & Build

### Type Check

```bash
pnpm exec tsc --noEmit
```

### Run ESLint

```bash
pnpm lint
```

### Production Build

```bash
pnpm build
```

---

## ⚠️ Current Limitations

* **Single-User Workflow**: Project collaboration and multi-user live editing are not currently supported in the frontend UI.
* **Client-Side Encryption**: Screenplay content is transmitted in plaintext to the Go API (E2EE is not implemented).
* **PDF Rendering**: PDF export currently relies on the browser's `window.print()` dialog rather than a server-side PDF compilation service.
