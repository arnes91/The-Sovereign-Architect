# The Sovereign Architect: Brzi AI Studio (v8.0 Foundation)

> **"A Factory of Futures."**

This repository is not just an app; it is a **Modular R&D Laboratory**. It serves two purposes:
1.  **Personal Studio:** A sovereign workspace for high-frequency content creation (Arzi/Balkan AI).
2.  **Product Incubator:** A testing ground for features that can be exported, packaged, and monetized as standalone Micro-SaaS products.

---

## 🛑 THE GOLDEN RULES (Read Before Coding)

### 1. The Rule of Isolation (The "Hull & Pod" Protocol)
*   **The Hull:** The main `App.tsx`, `Sidebar`, and `geminiService`. These manage the environment.
*   **The Pods:** Every feature (e.g., `DBZScanner`, `ConceptStudio`) must be treated as a **standalone mini-app**.
*   **Zero Horizontal Dependency:** A Module must **NEVER** import code from another Module. If `Module A` needs something from `Module B`, that logic must be moved to `services/` or `hooks/` (Shared Core).
*   **Error Containment:** Every Module must be wrapped in an `ErrorBoundary`. A crash in the *Scanner* must never kill the *Dashboard*.

### 2. The Export Mandate
*   Code every feature as if it is leaving the nest tomorrow.
*   Do not hardcode global app state into a module. Pass dependencies via props or contexts that can be easily mocked if the module becomes a standalone app.

### 3. The Personality Protocol
*   The "Sovereign Architect" (System) is the OS personality (Clean, Strategic, Glitchy).
*   Specific Modules have **Sub-Personas** (e.g., The DBZ Scanner uses "Frieza/Whis" logic).
*   **Audio Output:** We prioritize "Voice-First" interaction. Responses should be audible where applicable.

---

## 📂 Project Structure

```text
/
├── components/
│   ├── core/           # The "Hull" (Layout, Sidebar, ErrorBoundaries)
│   ├── modules/        # The "Pods" (Independent Features)
│       ├── DBZScanner/
│       ├── ConceptStudio/
│       └── [NEW_MODULE]/
├── services/           # Shared logic (Gemini API, Audio Decoding)
├── config/             # Personality definitions & Prompts
├── templates/          # COPY THESE TO START NEW FEATURES
├── ARCHITECTURE.md     # Technical Implementation details
└── WORKFLOW.md         # Step-by-step guide to adding features
```

## 🚀 Quick Start
1.  Read `WORKFLOW.md` to understand how to add a new module.
2.  Use `templates/ModuleTemplate.tsx` as your base.
