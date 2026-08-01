# Technical Architecture: The Sovereign Protocols

## 1. The Micro-Kernel Pattern

To ensure stability, we use a pattern where the `App.tsx` acts as a kernel that loads isolated modules.

### The Error Boundary
Every module in `App.tsx` is wrapped in a `<ModuleGuard>`. This is a React Error Boundary.

**Behavior:**
*   If `DBZScanner` throws a fatal error (e.g., `undefined is not a function`), the screen for that specific tab will show a "Module Offline" glitch screen.
*   The Sidebar, Navigation, and *other* modules remain 100% functional.
*   The user can click "Reboot Module" to try resetting just that component state.

## 2. Shared Services (The "Supply Lines")

Modules need access to the AI Brain. We use `services/geminiService.ts` as the unified pipeline.

**Rules for Services:**
*   **Generic Functions:** `generateContent`, `generateImage`.
*   **Specific Functions:** `generateDBZTaunt` is allowed in the service *only* if it is purely data-processing. UI logic stays in the module.

## 3. Personality Engine (`config/personalities.ts`)

We do not hardcode system instructions in components. We use a configuration file.

**Structure:**
```typescript
export const PERSONALITIES = {
  SYSTEM: {
    name: "The Sovereign Architect",
    instruction: "You are a strategic advisor..."
  },
  DBZ_SCANNER: {
    voices: {
       LOW_TIER: "Frieza",
       HIGH_TIER: "Whis"
    },
    prompts: { ... }
  }
}
```

This allows us to tweak the "Soul" of the application without touching the "Body" (UI Code).

## 4. Audio Pipeline

*   We use raw PCM decoding via `geminiService` helpers.
*   **Goal:** Low-latency voice output for all modules.
*   **Standard:** All audio is 24kHz (Gemini Default).

## 5. Antigravity Analysis & Next.js Migration Path

**Current State Assessment:**
The application currently operates as a Client-Side Monolith (Vite + React). While this allowed for rapid prototyping of the WebGL Visualizer and Gemini Live WebRTC connections, it presents critical security and persistence flaws:
1.  **API Key Exposure:** `GEMINI_API_KEY` and other sensitive tokens are currently bundled into the client.
2.  **Ephemeral State:** `StorageService` relies on `localStorage` and `IndexedDB`.
3.  **Agent Limitations:** The `OttoBridge` cannot execute background tasks if the browser tab is closed.

**The Next.js Solution:**
To achieve true "Sovereign" status, the architecture must evolve:
*   **App Router:** Migrate to Next.js `app/` directory.
*   **Server Actions & API Routes:** Move all `geminiService` calls to the server (`/api/gemini/...`).
*   **Secure WebSockets:** Proxy the Gemini Live WebRTC connection through a secure backend route or manage tokens securely.
*   **Background Execution:** Utilize Vercel Cron or custom Node.js background workers for the Otto Copilot agents.
