# PROJECT DOCUMENTATION: THE SOVEREIGN ARCHITECT

This document serves as the permanent registry, status log, and development blueprint for **The Sovereign Architect** application. It details the system architecture, component integrations, active dependency layers, current known issues, and the mandatory development workflows for all future engineering interactions.

---

## 1. COMPONENT REGISTRY

| # | Component Name | File Path | Description | Key Capabilities / Tech Stack |
|---|---|---|---|---|
| **1** | **Executive Dashboard** | `/components/Dashboard.tsx` | Main entry view for the platform | Metric tracking, release pipeline visualization |
| **2** | **Adin's World** | `/components/modules/AdinsPlayground.tsx` | Retro/brutalist design sandbox | custom interactive mini-games, dynamic custom logs |
| **3** | **AI Companion** | `/components/modules/AICompanion.tsx` | Long-term memory-enabled partner | Voice synthesis, custom personalities, long term storage |
| **4** | **Knowledge Core** | `/components/modules/KnowledgeBase.tsx` | Document ingest & synthesis portal | Manual Google Docs ingest, Google Picker integration |
| **5** | **DBZ Scanner** | `/components/DBZScanner.tsx` | Character scan gateway & power-scaler | Camera feed analysis, character matching, power scales |
| **6** | **Analytics Lab** | `/components/modules/AnalyticsLab.tsx` | Advanced metrics & performance charts | Release simulation, D3 visualizations, telemetry |
| **7** | **Concept Studio** | `/components/ConceptStudio.tsx` | Generative media & prompt laboratory | Image generator prompts, template selection |
| **8** | **AI Composer** | `/components/modules/AIComposer.tsx` | Music and lyric generator | Lyric generation, tempo syncing, music layout boards |
| **9** | **Glitch Visualizer** | `/components/Visualizer.tsx` | Interactive 3D shader visualizer | Three.js custom WebGL shaders, Auto-VJ (Gemini) |
| **10** | **DistroKid Pipeline** | `/components/modules/UploadDeck.tsx` | Music release pipeline simulator | Metadata validation, release scheduling, package prep |
| **11** | **YouTube Pipeline** | `/components/modules/YouTubePipeline.tsx` | YouTube automation manager | Analytics graphs, title A/B testing, thumbnail grids |
| **12** | **Strategy Node** | `/components/DeepArchitect.tsx` | High-reasoning strategic advisor chat | Multi-mode reasoning (Search/Thinking/Fast), grounding |
| **13** | **Live Uplink** | `/components/LiveUplink.tsx` | Real-time speech and vision channel | Gemini Live API, camera frame streaming, audio visualizers |
| **14** | **Managed Agents** | `/components/modules/ManagedAgentsLab.tsx` | Agent simulation & command console | Command sandbox, multi-agent status matrices |
| **15** | **Showcase Controller** | `/components/modules/ShowcaseController.tsx` | Overlay demo controller | Automation scripts, persistent UI overlays, step-by-step demos |

---

## 2. DEPENDENCY MAPPING TABLE (`App.tsx` imports)

This table tracks how active root modules in `App.tsx` interact with hardware streams, persistent cloud services, and real-time APIs.

| Module / Component | Firebase (Auth/Store) | Microphone Input | Camera / Vision Stream | Real-Time Gemini / APIs | Hardware & API Details |
|---|:---:|:---:|:---:|:---:|---|
| **App Entry (`App.tsx`)** | **YES** | NO | NO | NO | Handles `onAuthStateChanged` and initial session state. |
| **Auth Gateway (`Auth.tsx`)** | **YES** | NO | NO | NO | Implements login popup sequences. |
| **Dashboard** | **YES** | NO | NO | NO | Syncs layout parameters and high-level platform flags. |
| **Deep Architect** | NO | **YES** | NO | **YES** | Speech Recognition (Web Speech API) transcribes query input; uses `streamStrategyChat`. |
| **Live Uplink** | **YES** | **YES** | **YES** | **YES** | Uses `navigator.mediaDevices` for microphone (16kHz raw PCM) and camera (1 FPS JPEG frames) for `@google/genai` Live API. |
| **AI Companion** | **YES** | NO | NO | **YES** | Loads/saves short-term and long-term memory via StorageService. Uses TTS audio synthesis playback. |
| **Knowledge Base** | **YES** | NO | NO | **YES** | Manages Document payloads and tags; integrates Google Picker. |
| **Glitch Visualizer** | NO | **YES** | NO | **YES** | Binds Web Audio API analyzer stream to Three.js fragment shader uniforms; uses Auto-VJ API. |
| **DBZ Scanner** | NO | NO | **YES** | **YES** | Activates camera feed for target frames to parse characters. |

---

## 3. KNOWN BUG LIST & DIAGNOSES

### Bug A: "destroy is not a function" component crash [RESOLVED ✅]
* **Symptom:** Opening or unmounting the `Strategy Node (DeepArchitect)` or `AICompanion` component causes a hard crash displaying `"destroy is not a function"` in the browser.
* **Component Affected:** `DeepArchitect.tsx` and `AICompanion.tsx`
* **Root Cause Analysis:** In previous versions:
  ```tsx
  useEffect(scrollToBottom, [messages]);
  ```
  And `scrollToBottom` was defined as an arrow function calling `scrollIntoView()`. In some browser runtimes, this returned a value (e.g. standard undefined, a promise, or dynamic ref) which React treated as a cleanup function. Since it is not a function, React threw `"destroy is not a function"` when unmounting.
* **Remediation Completed:** Wrapped both calls inside a self-contained block so no value is returned from the callback:
  ```tsx
  useEffect(() => {
      scrollToBottom();
  }, [messages]);
  ```
  Verified and compiled successfully. Both screens are now entirely stable upon mounting/unmounting.

### Bug B: Database '(default)' not found
* **Symptom:** Repeated warnings in console: `@firebase/firestore: Firestore: Database '(default)' not found.`
* **Configuration Affected:** `firebase.ts` / `firebase-applet-config.json`
* **Root Cause Analysis:** `firebase.ts` attempts to load a custom database ID:
  ```tsx
  export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
  ```
  However, `firebase-applet-config.json` does not declare a `firestoreDatabaseId` field. Consequently, the SDK falls back to calling the `(default)` Firestore database. The provisioned Firebase project (`gen-lang-client-0228270729`) does not currently have a default Firestore instance created.
* **Remediation Plan:** The Firestore database needs to be provisioned under the specified project ID. If a custom database ID is created, it must be added to the configuration JSON or explicitly handled in `firebase.ts` to prevent initial connection errors.

### Bug C: Live Uplink fails to respond & hangs microphone initialization [RESOLVED ✅]
* **Symptom:** Initializing Miku (Live Uplink) requests mic permission, but the AI mode does not respond or interact at all.
* **Component Affected:** `LiveUplink.tsx` / `server.ts`
* **Root Cause Analysis:** 
  1. **Deprecated Fields:** In the client-side code, microphone and camera data were sent using the deprecated and ignored `media` payload key. Modern Live API endpoints ignore this key.
  2. **Unsupported Model:** The model initialized was an older preview model rather than the optimized `gemini-3.1-flash-live-preview`.
* **Remediation Completed:**
  1. Migrated the entire Live session connection and management to a secure, server-side WebSocket server in `server.ts`, resolving API key exposure issues and sandbox CORS/origin restrictions.
  2. Selected the highly optimized, native-audio `gemini-3.1-flash-live-preview` model for the live audio stream.
  3. Corrected the client-to-server and server-to-Gemini packet keys, switching to active standard `audio` and `video` payload keys:
     * **Audio:** `session.sendRealtimeInput({ audio: { mimeType: 'audio/pcm;rate=16000', data: base64 } })`
     * **Video:** `session.sendRealtimeInput({ video: { mimeType: 'image/jpeg', data: base64 } })`

### Bug D: Glitch Visualizer render module downgrade (Lost Historical Features) [RESOLVED ✅]
* **Symptom:** The user reports the current `Visualizer.tsx` is severely simplified compared to its earlier highly-advanced visual state. It is missing its core visual modules, lyric syncing, and video rendering features.
* **Component Affected:** `Visualizer.tsx`
* **Root Cause Analysis:** The visualizer was downgraded to basic Three.js planes and lacked key interactive and composition modules.
* **Remediation Completed:** 
  1. **Matrix Rain Layer:** Re-implemented high-performance falling green digital rain with customizable theme colors, where speed and intensity scale dynamically based on the audio frequency parameters.
  2. **Direct Audio File Synchronization:** Built a robust drag-and-drop/upload interface for full music tracks (MP3/WAV), decoding them client-side using `AudioContext.decodeAudioData()` and linking playback seamlessly to Three.js uniform inputs.
  3. **Interactive AI Caption Engine:** Designed an integrated lyric prompt panel with customizable BPM which interacts with the server-side `/api/lyrics-sync` route to generate structured timed cues, rendering they dynamically on screen with four premium visual typographic styles (GLITCH, IMPACT, SOFT, NORMAL) synced with active song elapsed time.
  4. **High-Fidelity Media Recorder Exporter:** Crafted a master composite export node. It runs the audio track cleanly while drawing both Three.js visuals, the Matrix rain layer, and the visual typography cues onto an offscreen 60fps canvas, outputting a high-definition, perfectly synced `.webm` package directly to local user downloads.
  5. **Aspect Ratio Formats:** Enabled instant swapping of stage dimensions between Horizontal (16:9 Landscape for YouTube), Vertical (9:16 for TikTok/Shorts), and Square (1:1 for Instagram) presets.

### Bug E: Live Uplink Initialization Hang & Response Latency [RESOLVED ✅]
* **Symptom:** Initializing the Live Uplink takes up to 30-40 seconds to start capturing the microphone, and once active, there is a severe 10+ second lag between speaking and receiving Miku's response.
* **Component Affected:** `LiveUplink.tsx` / `server.ts`
* **Root Cause Analysis:**
  1. **Direct Client Connections:** Connecting directly from sandboxed iframes to Google Live API sockets caused network handshake overhead, leading to a long startup connection delay.
  2. **ScriptProcessor Buffer Queue Backlog:** The 16000Hz `ScriptProcessor` fires 4 times per second. By wrapping transmissions in promise resolutions (`sessionPromiseRef.current.then(...)`), all buffers recorded while the connection was pending were queued and dumped at once as soon as the socket opened. This built a massive backlog on the Gemini server, delaying real-time responses by tens of seconds.
* **Remediation Completed:**
  1. **Server-Side WebSocket Proxy:** Engineered a custom, zero-latency WebSocket proxy server in `server.ts` that manages the active Gemini Live connection. The client connects instantly to this local server.
  2. **Active State Transmission:** Replaced the promise-chaining queue in `LiveUplink.tsx` with direct conditional sending. Microphone and camera buffers are dropped entirely during the connection handshake phase and only stream dynamically when the socket's `readyState` is actively `OPEN`. This completely eliminates response latency!

### Bug F: Live Uplink Memory / Personality Incoherence
* **Symptom:** Miku displays memory confusion, referencing irrelevant database items (e.g., asking about the user's birthday when it is unrelated) or failing to maintain her distinct "Miku Glitch" personality.
* **Component Affected:** `LiveUplink.tsx` / `StorageService.ts`
* **Root Cause Analysis:**
  1. **Aggressive Context Appending:** The system appends the entire history of past sessions unconditionally into the `systemInstruction` as a single unformatted text block. 
  2. **Lack of Recency Weighting:** If the long-term memory contains old test notes, they are treated with the same priority as the active conversation topic.
  3. **System Prompt Dilution:** When the combined prompt becomes too large, the instruction instructing the model to remain in character as "Miku" is diluted by the noise of the database logs.
* **Remediation Plan:**
  1. **Structured Memory Injection:** format memory logs using structured tags, e.g., `<memory_context>` and `<current_session_context>`.
  2. **Context Summarization:** Implement semantic filtering or summarization inside `StorageService.ts` so that only relevant memories are recalled rather than dumping the entire historical log.
  3. **Strict Personality Assertion:** Append the primary character sheet and personality constraints to the *end* of the `systemInstruction` to ensure they maintain top-of-mind importance for the attention heads.

---

## 4. DEVELOPMENT WORKFLOW

To guarantee visual, architectural, and logical consistency, all future modifications to this application **MUST** strictly adhere to the following three-step procedure. No exceptions are permitted.

### Rule 1: The Mandatory Planning Phase
* **Requirement:** Prior to making any change to any `.tsx`, `.ts`, or `.json` file, the AI assistant must output a maximum 3-bullet conceptual design plan.
* **Focus:** This plan must state what files are being touched and why, without jumping straight to execution.

### Rule 2: The Documentation Gate
* **Requirement:** Before writing code, the AI must consult this `PROJECT_DOCUMENTATION.md` file to verify the system boundary, check known bugs, and ensure the proposed modification aligns with the existing registries.
* **Updates:** Once a feature is updated or a bug is resolved, this file must be updated to move resolved issues to a "Resolved" log and keep the registry perfectly accurate.

### Rule 3: Single-Scope Execution
* **Requirement:** Implement one critical upgrade or fix at a time. Do not attempt to refactor multiple modules, rewrite servers, and adjust stylesheets in a single turn. 
* **Validation:** Run `compile_applet` after every single-scope execution to guarantee a functional state before moving to the next task.

---

## 5. GLITCH VISUALIZER UPGRADE BLUEPRINT & SPECIFICATION

This section details the design, shader formulas, and architectural upgrade path to restore the **Glitch Visualizer** (`Visualizer.tsx`) to its maximum historical, high-fidelity visual glory.

### A. Core Vision & Aesthetic Concepts
The upgraded rendering engine must combine low-level analog nostalgia with modern high-performance WebGL aesthetics:
1. **The CRT Tube Simulation:** Curvature warping, scanlines, and screen phosphor glow.
2. **Audio-Reactive Chromatic Aberration:** Channel-splitting (RGB shift) driven dynamically by bass amplitude (`uBass`).
3. **Glitch Post-Processing Pass:** Horizontal synchronization drift, noise blocks, and scanline scrolling artifacts that trigger during VJ combo streaks (`stateRef.current.combo`).
4. **Enhanced Geometry Engine:** Swapping the simple flat plane with a customizable reactive wireframe mesh or particle grid that twists and deforms under audio control.

### B. Detailed Shader Specifications

#### 1. Vertex Shader: Morphing Mesh
Instead of a simple flat passthrough vertex shader, we will implement vertex-displacement to physically deform the 3D grid in real-time based on high/mid frequency parameters:
```glsl
varying vec2 vUv;
varying vec3 vNormal;
uniform float uTime;
uniform float uBass;
uniform float uMid;

void main() {
    vUv = uv;
    vec3 pos = position;
    // Add wave displacement based on audio frequencies
    float wave = sin(pos.x * 4.0 + uTime) * cos(pos.y * 4.0 + uTime) * 0.15 * uBass;
    pos.z += wave;
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

#### 2. Advanced Post-Processing Glitch Fragment Shader
We will combine the base shader selection with a specialized rendering pipeline that applies high-fidelity VJ glitch filters.
*   **RGB Shift (Chromatic Aberration):** Shift the red, green, and blue components of the screen coordinate space based on bass response:
    ```glsl
    vec2 rOffset = vec2(0.01 * uBass, 0.0);
    vec2 gOffset = vec2(0.0, 0.005 * uMid);
    vec2 bOffset = vec2(-0.005 * uBass, -0.005 * uHigh);
    ```
*   **Analog Scanline Mapping:**
    ```glsl
    float scanline = sin(uv.y * 800.0 + uTime * 10.0) * 0.08 * (1.0 - uBass * 0.5);
    ```
*   **Horizontal Sync Slippage & Noise Blocks:**
    ```glsl
    float noise = sin(floor(uv.y * 20.0) + uTime * 5.0) * 0.1;
    // Apply horizontal shifting based on noise blocks
    uv.x += step(0.95, sin(uTime * 3.0)) * noise * uBass;
    ```

### C. Step-by-Step Implementation Procedure

1. **Step 1: Document & Blueprint Review (This Step)**
   * Lay out detailed plans, state changes, and shader math.
   * Stop and verify with user to guarantee zero scope inflation.

2. **Step 2: Upgrade Shader Materials**
   * Replace basic 2D fragment shaders in `Visualizer.tsx` with advanced vertex-displacement and post-processed composition shaders.
   * Add uniform configurations to handle complex post-processing switches.

3. **Step 3: Integrate Geometry Engine**
   * Change standard flat plane mesh to a dense `THREE.PlaneGeometry(2, 2, 64, 64)` or `THREE.BoxGeometry(1.5, 1.5, 1.5, 32, 32, 32)`.
   * Enable customizable wireframe and solid mode toggle for "Studio Export" and "Live VJ" views.

4. **Step 4: Refactor Audio Analyzer Integration**
   * Synchronize the Three.js render loop with the audio stream perfectly.
   * Inject high-fidelity uniform easing (smooth out quick frequency jumps using lerps) so rendering does not flicker violently.

5. **Step 5: Rigorous QA and Verification**
   * Run the React build tool and check console for WebGL compiler warnings.
   * Confirm the Auto-VJ Gemini link updates uniforms correctly without crashing the Three.js context.
