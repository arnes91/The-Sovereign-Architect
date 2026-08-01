# Architectural Blueprint & Security Posture

## 1. Directory Structure (Next.js App Router)
```
/
├── app/
│   ├── api/                 # Secure Server Routes (Gemini, Supabase, Webhooks)
│   ├── (dashboard)/         # Protected Routes Group
│   │   ├── layout.tsx       # The "Hull" (Sidebar, Auth Check, Global State)
│   │   ├── page.tsx         # Dashboard Overview
│   │   ├── companion/       # AI Companion Module
│   │   ├── visualizer/      # WebGL Visualizer Module
│   │   └── uplink/          # Live Uplink Module
│   ├── login/               # Public Auth Route
│   ├── layout.tsx           # Root HTML/Body, Global Providers
│   └── globals.css          # Tailwind CSS
├── components/
│   ├── modules/             # The "Pods" (Independent Feature Components)
│   ├── ui/                  # Reusable UI Elements (Buttons, Modals, Inputs)
│   └── layout/              # Sidebar, Header, Navigation
├── lib/                     # Shared Utilities
│   ├── supabase/            # Database Clients (Server & Browser)
│   ├── gemini/              # Server-Side AI Wrappers
│   └── utils.ts             # Tailwind Merge, Formatting
├── types/                   # Global TypeScript Definitions
└── .env.local               # Secure Environment Variables
```

## 2. Security Posture (CRITICAL)
- **API Keys:** `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc., MUST NOT be prefixed with `NEXT_PUBLIC_`. They are strictly server-side variables.
- **Client-Side Fetching:** The client UI (React Components) must call internal Next.js API routes (e.g., `fetch('/api/gemini/chat')`), which then securely append the API key and forward the request to Google.
- **Authentication:** Supabase Auth or Firebase Auth handles user sessions. Server Actions and API Routes must verify the user's session token before executing any logic or database queries.

## 3. The "Hull & Pod" Modularity Pattern
- **The Hull (`app/(dashboard)/layout.tsx`):** Manages the user session, the sidebar navigation, and the global theme. It provides context to the children.
- **The Pods (`components/modules/*`):** Self-contained features (e.g., `Visualizer.tsx`, `AICompanion.tsx`). They fetch their own data via Server Actions or SWR/React Query. They do not rely on other modules to function.
- **Error Boundaries:** Every page route (`app/(dashboard)/[module]/page.tsx`) must export an `error.tsx` file to catch module-specific crashes without bringing down the Hull.
