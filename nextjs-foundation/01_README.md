# The Sovereign Architect OS (Next.js Edition)

## Vision
The Sovereign Architect is a modular, high-frequency content creation operating system. It is designed as a secure, persistent, and autonomous workspace for creators, leveraging state-of-the-art multimodal AI.

## Core Technology Stack
- **Framework:** Next.js 15+ (App Router)
- **Language:** TypeScript (Strict Mode)
- **Styling:** Tailwind CSS (Cyberpunk/Void Aesthetic: Zinc, Cyber-Green, Glitch Pink)
- **Database & Auth:** Supabase (PostgreSQL, pgvector, Firebase/Supabase Auth)
- **AI Engine:** Google Gemini 3.1 API (Text, Vision, Native Audio, Embeddings)
- **Autonomous Agents:** Node.js Background Workers / Vercel Cron (Otto Copilot)

## Architectural Principles
1. **The "Hull & Pod" Pattern:** The application is divided into a central "Hull" (Global Layout, Auth, Navigation, Sidebar) and independent "Pods" (Feature Modules).
2. **Zero Horizontal Dependency:** Modules (Pods) do not import from each other. They communicate via shared context or database state.
3. **Server-Side Authority:** ALL external API calls (Gemini, Hedra, etc.) MUST be executed securely on the server via Next.js Route Handlers (`/api/...`) or Server Actions. **No API keys are ever exposed to the client.**
4. **Persistent State:** User data, chat history, and generated assets are stored in Supabase. `localStorage` is strictly forbidden for critical data.
5. **Graceful Degradation:** If a specific module crashes, the Error Boundary isolates it, allowing the rest of the OS to function normally.
