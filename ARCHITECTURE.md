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
