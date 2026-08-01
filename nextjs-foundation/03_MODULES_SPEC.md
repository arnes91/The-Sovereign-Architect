# Module Specifications (The Pods)

## 1. AI Companion (The Brain)
- **Purpose:** A persistent chat interface with persona switching and Long-Term Memory (LTM).
- **Architecture:** Next.js Server Actions or `/api/chat` route.
- **Memory (RAG):** Uses Supabase `pgvector`. Every user message and AI response is embedded using Gemini `text-embedding-004` and stored in Postgres. Before generating a response, the server queries the vector database for relevant past context and injects it into the system prompt.
- **UI:** A chat window with Markdown support, auto-scrolling, and a persona selector (e.g., "Arzi", "Tech Advisor").

## 2. Visualizer (The Factory)
- **Purpose:** A WebGL-based rendering engine for audio-reactive, cyberpunk-themed music videos.
- **Architecture:** Client-side heavy (WebGL, Canvas, Web Audio API), but relies on the server for initial configuration or saving exported assets to Supabase Storage.
- **Key Requirement:** Must initialize WebGL with `preserveDrawingBuffer: true` to ensure `MediaRecorder` captures frames correctly without green screens or dropped frames.
- **Features:** Audio frequency analysis (Bass, Mid, High) driving shader uniforms. AI-synced lyrics overlay.

## 3. Live Uplink (Miku Vajfuša)
- **Purpose:** Real-time, low-latency Audio/Video connection to the Gemini 3.1 Native Audio model.
- **Architecture:** WebSockets (WebRTC) via the `@google/genai` SDK.
- **Security:** The WebSocket connection requires a short-lived, secure token or must be proxied through a Next.js backend route to avoid exposing the `GEMINI_API_KEY` on the client.
- **Features:** Microphone input (PCM16 encoding), Webcam frame capture (throttled JPEG Base64 via `requestAnimationFrame`), and raw PCM audio decoding for playback.

## 4. Otto Bridge (Autonomous Agents)
- **Purpose:** Background task execution and synchronization with external workflows (e.g., agpt.co).
- **Architecture:** Next.js API Routes (`/api/webhooks/otto`) and Vercel Cron Jobs.
- **Features:** The UI displays the status of background agents (e.g., "Market Watcher", "Content Synthesizer"). The actual execution happens on the server, even if the user closes the browser tab.

## 5. DBZ Scanner (Gamified Analytics)
- **Purpose:** A gamified tool that scans a user's face (via webcam), calculates a "Power Level," and delivers a persona-driven taunt (e.g., "Whis" or "Frieza").
- **Architecture:** Client-side webcam capture -> Server-side Gemini Vision API analysis -> Server-side text generation -> Client-side display.
- **Persistence:** The "Power Level" and scan history are saved to the user's Supabase profile to track growth over time.
