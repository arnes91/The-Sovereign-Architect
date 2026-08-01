# PROJECT DOCUMENTATION: THE SOVEREIGN ARCHITECT

## 1. Application Structure Audit & Technical Specification

### 1.1 Overview
The application is a modular, multi-view React (Vite) single-page application built for AI entrepreneurship and content creation. It uses a `Sidebar` for navigation to swap out components within the main viewport. Authentication is handled via Firebase (with an optional Guest session). A global `ModuleGuard` component catches and displays errors for individual modules without crashing the entire app.

### 1.2 Component Registry

**Core & Layout Components:**
* `App.tsx`: The root application component containing state for the active view, authentication session, and demo mode.
* `components/layout/Sidebar.tsx`: Handles primary navigation between modules.
* `components/core/ModuleGuard.tsx`: An Error Boundary component that isolates module crashes and displays themed error messages (e.g., Geo-restriction or generic module failures).
* `components/Auth.tsx`: Firebase authentication UI.
* `components/Dashboard.tsx`: Main entry view for the platform, metric tracking, and release pipeline visualization.

**Feature Modules (Views):**
* `components/DBZScanner.tsx`: A gamified HUD interface parsing camera frames to match characters and power scales.
* `components/modules/AIComposer.tsx`: Audio, music generation, and lyric writing module.
* `components/modules/AdinsPlayground.tsx`: A specialized retro/brutalist design sandbox playground module.
* `components/modules/ManagedAgentsLab.tsx`: Interface for managing AI agents and command console.
* `components/modules/AnalyticsLab.tsx`: Advanced data analytics dashboard with D3 visualizations.
* `components/modules/KnowledgeBase.tsx`: Vector search and knowledge retrieval interface with Google Workspace integrations.
* `components/DeepArchitect.tsx`: High-reasoning strategic advisor chat interface using Gemini (Thinking/Search/Fast modes).
* `components/LiveUplink.tsx`: Real-time Audio/Video connection module via WebSockets using Gemini Live API.
* `components/Visualizer.tsx`: Real-time audio visualizer utilizing WebGL (Three.js), Web Audio API, and Gemini for synced lyrics.
* `components/modules/UploadDeck.tsx`: Asset management, metadata validation, and release scheduling pipeline.
* `components/modules/YouTubePipeline.tsx`: Workflow automation for YouTube content generation, currently partially simulated.
* `components/modules/AICompanion.tsx`: Personalized AI chat partner with persistent long-term and short-term memory capabilities.
* `components/modules/ShowcaseController.tsx`: An overlay system that drives automated guided tours across modules.

---

## 2. Dependency Mapping

### 2.1 Firebase Dependencies
* **Authentication**: Handled via `firebase/auth` in `App.tsx` and `Auth.tsx`.
* **State Management**: The app uses `onAuthStateChanged` to verify user sessions before rendering restricted modules.
* **Database**: `firebase/firestore` is configured to persist global state, though local IndexedDB is used heavily for speed.

### 2.2 Hardware Peripheral Dependencies
* **Camera / Webcam**:
  * `DBZScanner.tsx`: Accesses `navigator.mediaDevices.getUserMedia({ video: true })` for the radar HUD and real-time analysis.
  * `LiveUplink.tsx`: Accesses the camera to capture frames and send them via WebSocket to the AI model.
* **Microphone / Audio**:
  * `LiveUplink.tsx`: Accesses the microphone via `navigator.mediaDevices.getUserMedia({ audio: true })` and uses `AudioContext` to process raw PCM data.
  * `DeepArchitect.tsx`: Uses the experimental `window.SpeechRecognition` (or `webkitSpeechRecognition`) API for voice-to-text input.

### 2.3 Other Key Dependencies
* **AI/LLM**: `@google/genai` (Gemini API used heavily for text reasoning, audio synthesis, visualizer lyrics sync, and Live API connections).
* **3D/Graphics**: `three` (Three.js used in `Visualizer.tsx` for complex WebGL shader backgrounds).
* **Storage**: `idb-keyval` (Used in `StorageService` for high-performance, non-blocking local IndexedDB persistence across sessions).
* **Workspace Integration**: Google Workspace APIs (Drive, Keep, Forms, Meet) authenticated via OAuth for cross-module functionality.

---

## 3. Known Bugs & Console Errors

### 3.1 [RESOLVED] "destroy is not a function" (DeepArchitect & AICompanion)
* **Symptom:** Opening or unmounting the Strategy Node (`DeepArchitect.tsx`) or `AICompanion.tsx` component caused a hard crash displaying `"destroy is not a function"` in the browser.
* **Component Affected:** `DeepArchitect.tsx` and `components/modules/AICompanion.tsx`.
* **Root Cause Analysis & File History Map:** Strict React unmount lifecycle error caused by returning a non-function (due to scoped condition blocks) inside `useEffect`.
* **Resolution:** Re-factored the `setInterval` in both components to properly hoist the timeout reference and reliably return a dedicated cleanup closure on unmount, bypassing the conditional block scope issue.

### 3.2 [RESOLVED] Live Uplink Initialization Failure & Zombie Sockets
* **Symptom:** The `LiveUplink.tsx` module failed to initialize cleanly, caused port hang-ups, and relied on a heavy `window.location.reload()` to shut down.
* **Component Affected:** `components/LiveUplink.tsx`.
* **Root Cause Analysis & File History Map:** Caused by severe race conditions in hardware and socket initialization, and lack of a structured tear-down process for WebSockets and Audio/Video Streams.
* **Resolution:** Implemented a robust async `disconnect` routine to clean up WebSockets, cancel animation frames, sever media tracks, and flush audio contexts safely without requiring page reloads. Hooked `disconnect` to the KILL PROCESS button and guarded `connect` to flush previous zombie instances before initiating.

### 3.3 [RESOLVED] Simulated YouTube Upload Replaced With Production API
* **Symptom:** The `YouTubePipeline.tsx` module simulated video uploads using `setTimeout` and hardcoded `SIMULATED_OAUTH_TOKEN`, failing to actually upload anything to the connected user's YouTube account.
* **Component Affected:** `components/modules/YouTubePipeline.tsx`, `services/workspaceService.ts`.
* **Resolution:** 
  1. Updated Google Workspace OAuth scopes to include `https://www.googleapis.com/auth/youtube.upload`.
  2. Ripped out all simulation timeouts and replaced them with fully authentic multipart `FormData` uploads to the YouTube Data API v3 (`/upload/youtube/v3/videos`).
  3. Engineered automatic extraction and decoding of the AI-generated Base64 thumbnail to be pushed directly to the YouTube API (`/upload/youtube/v3/thumbnails/set`) as a secondary request immediately following a successful video publish.

---

## 4. Development Workflow

To maintain system integrity, prevent feature degradation, and ensure stable execution of complex modules, the following strict workflow MUST be adhered to for all future engineering interactions:

1. **Mandatory Planning & Documentation Review Phase:**
   * Before writing or editing any code, the architect MUST review this `PROJECT_DOCUMENTATION.md` file.
   * Propose a concrete plan of action to the user based on the component registry and dependency map. No code is to be changed before the roadmap is established.
   
2. **Single-Scope Execution Rule:**
   * Modify only **ONE** module or component per interaction. 
   * Do not attempt massive sweeping rewrites across multiple files in a single turn. Isolate the target component, apply the fix/feature, compile the applet, and verify stability before proceeding to the next.

3. **Documentation Sync:**
   * Immediately after every successful code change or feature implementation, this `PROJECT_DOCUMENTATION.md` file MUST be updated to reflect the new state, new dependencies, or newly resolved bugs. This guarantees the architectural blueprint remains the absolute source of truth.
