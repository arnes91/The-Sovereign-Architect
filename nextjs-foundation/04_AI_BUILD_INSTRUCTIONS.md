# AI Build Instructions (The Genesis Protocol)

## Context for the Next AI Agent
You are tasked with building "The Sovereign Architect OS" from scratch using Next.js 15 (App Router). You must strictly follow the architectural principles outlined in `01_README.md`, `02_ARCHITECTURE.md`, and `03_MODULES_SPEC.md`.

**CRITICAL DIRECTIVE:** Do NOT attempt to fix or reference any previous React/Vite implementations. This is a pristine, forward-looking build.

## Phase 1: Foundation & Authentication
1. **Initialize Next.js:** Create the standard Next.js App Router structure with Tailwind CSS.
2. **Setup Supabase:** Configure the Supabase client (`@supabase/supabase-js`) for both Server Components and Client Components.
3. **Authentication:** Implement a secure login page (`/login`) using Supabase Auth (Email/Password or OAuth).
4. **The Hull (Layout):** Build the protected `app/(dashboard)/layout.tsx`. This must include a responsive Sidebar navigation and a global theme provider (Cyberpunk/Void aesthetic). Ensure unauthenticated users are redirected to `/login`.

## Phase 2: The Brain (Gemini 3.1 Integration)
1. **Server-Side API Routes:** Create `/api/gemini/chat` and `/api/gemini/vision` to securely wrap the `@google/genai` SDK.
2. **Vector Memory (RAG):** Implement a Supabase `pgvector` schema for storing chat history embeddings. Create a utility function to generate embeddings using `text-embedding-004` and query the database for context before generating a response.
3. **AI Companion Module:** Build the `AICompanion.tsx` client component that communicates with the secure `/api/gemini/chat` route. It must support Markdown, auto-scrolling, and persona switching.

## Phase 3: Advanced Media (Visualizer & Live Uplink)
1. **Visualizer Module:** Implement the WebGL rendering engine (`Visualizer.tsx`) with audio reactivity (Web Audio API). Ensure `preserveDrawingBuffer: true` is set for the WebGL context to allow flawless `MediaRecorder` exports.
2. **Live Uplink Module:** Build the real-time Audio/Video connection to Gemini 3.1 Native Audio. **Security Check:** You must proxy the WebSocket connection or manage tokens securely so the `GEMINI_API_KEY` is never exposed in the browser. Implement raw PCM decoding for playback and throttled JPEG capture for vision.

## Phase 4: Autonomous Agents (Otto Bridge)
1. **Background Workers:** Create Next.js API routes (`/api/webhooks/otto`) to handle incoming webhooks from external agents (agpt.co).
2. **Cron Jobs:** Set up Vercel Cron (or a custom Node.js worker) to periodically execute tasks (e.g., checking analytics) even when the user is offline.
3. **Otto Bridge UI:** Build the dashboard component to display the real-time status of these background agents.

## Phase 5: Gamification (DBZ Scanner)
1. **Scanner Module:** Implement the webcam capture and UI for the DBZ Scanner.
2. **Server Action:** Create a Server Action that takes the captured image, sends it to the Gemini Vision API for analysis, calculates a "Power Level," and generates a persona-driven taunt.
3. **Persistence:** Save the scan result to the user's Supabase profile.

**Final Verification:** Ensure all modules are wrapped in Error Boundaries, all API keys are secure on the server, and the UI is fully responsive.
