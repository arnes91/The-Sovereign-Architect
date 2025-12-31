# Development Workflow: Creating a New Module

**Follow this sequence exactly to maintain sovereignty.**

## Phase 1: Definition
1.  **Name the Module:** (e.g., `LyricLab`, `MarketSniper`).
2.  **Define the Persona:** Does this module need a specific voice? (e.g., "The Grumpy Producer" for LyricLab). Add it to `config/personalities.ts`.

## Phase 2: Creation
1.  **Duplicate Template:**
    *   Copy content from `templates/ModuleTemplate.tsx`.
    *   Create `components/modules/YourModuleName.tsx`.
2.  **Paste & Rename:**
    *   Rename the component.
    *   Connect it to `services/geminiService` functions.

## Phase 3: Integration
1.  **Register the View:**
    *   Open `types.ts`.
    *   Add `YOUR_MODULE_NAME` to the `View` enum.
2.  **Add to Sidebar:**
    *   Open `components/layout/Sidebar.tsx`.
    *   Add an entry with an icon to the `menu` array.
3.  **Mount the Module:**
    *   Open `App.tsx`.
    *   Import your component.
    *   Add a case to the switch statement, **wrapping it in `<ModuleGuard>`**.

## Phase 4: Monetization Check (Optional)
If this module is successful:
1.  Copy `components/modules/YourModuleName.tsx`.
2.  Copy necessary functions from `services/geminiService.ts` into a local `utils.ts` file.
3.  You now have a standalone React file ready for a new repository.

---

## Checklist Before Committing
- [ ] Is the module wrapped in an Error Boundary in App.tsx?
- [ ] Are all prompts defined in the Config or Service, not hardcoded deeply in JSX?
- [ ] Does the module rely on *another* module's state? (If YES, refactor. It must be independent).
