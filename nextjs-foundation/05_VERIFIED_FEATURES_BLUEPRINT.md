# Brzi.Ai Sovereign Architect: Verified Feature Blueprint

**Target Environment:** Next.js 15+ (App Router), Google AI Studio (Gemini 3.1)
**Purpose:** This document serves as the proven, verified conceptual blueprint for rebuilding the Sovereign Architect as a modular Next.js application. It outlines the exact working mechanics of each feature without dictating specific implementation details, allowing the AI to generate unbiased, native Next.js code.

---

## 1. Live Uplink (Real-Time Multimodal AI)
**Concept:** A low-latency, bidirectional audio and video streaming interface connecting directly to the Gemini 3.1 Native Audio model.
**Verified Mechanics:**
*   **Audio Ingestion:** Captures microphone input, processes it into raw PCM16 format at 16kHz, and streams it to the model.
*   **Vision Ingestion:** Captures webcam frames via a hidden video element, throttles the capture rate, encodes frames as Base64 JPEGs, and sends them alongside the audio stream.
*   **Audio Playback:** Receives raw PCM audio chunks from the model, decodes them, and queues them for seamless, gapless playback using the Web Audio API.
*   **State Management:** Maintains connection states (Idle, Connecting, Active, Error) and handles graceful connection termination and resource cleanup.

## 2. Content Studio (Generative Assets)
**Concept:** A centralized hub for generating, editing, and managing visual assets using Gemini/Imagen models.
**Verified Mechanics:**
*   **Generation:** Accepts text prompts and configuration parameters (aspect ratio, resolution) to generate high-quality images.
*   **Editing:** Supports image-to-image editing by passing a source image (Base64) alongside a text prompt for modifications.
*   **Asset Handling:** Parses multipart API responses to extract Base64 image data, converting it into renderable UI elements.
*   **Project History:** Maintains a chronological history of generated assets and their associated prompts, allowing users to "remix" or iterate on previous concepts.

## 3. Analytics Lab (Data Synthesis)
**Concept:** A data ingestion and visualization engine for tracking cross-platform performance.
**Verified Mechanics:**
*   **Data Ingestion:** Supports drag-and-drop functionality for CSV files containing platform metrics.
*   **Parsing & Structuring:** Parses raw tabular data into structured JSON arrays, calculating aggregates (totals, averages, growth percentages).
*   **Visualization:** Renders dynamic, responsive charts (e.g., line charts for trends, bar charts for comparisons) based on the parsed data.
*   **AI Integration:** Formats the structured data into a readable context string, allowing the AI Companion to analyze trends and provide strategic recommendations.

## 4. Distribution Pipelines (DistroKid & YouTube)
**Concept:** Automated workflows for preparing, packaging, and managing content releases across major platforms.
**Verified Mechanics:**
*   **Metadata Generation:** Analyzes track titles, audio context, or visual assets to automatically generate SEO-optimized YouTube descriptions, tags, and DistroKid release metadata.
*   **Asset Packaging:** Links generated cover art (from Content Studio) and audio files into a unified "Release Object."
*   **Pipeline Tracking:** Visualizes the release journey through distinct stages (e.g., "Draft", "Assets Ready", "Metadata Generated", "Ready for Upload").
*   **Export/Integration:** Formats the final release package into a structured format (JSON/CSV) ready for manual upload or future API integration.

## 5. The Visualizer (Audio-Reactive Rendering)
**Concept:** A WebGL-based rendering engine that generates cyberpunk-themed, audio-reactive music videos.
**Verified Mechanics:**
*   **Audio Analysis:** Uses the Web Audio API `AnalyserNode` to extract frequency data (Bass, Mid, High) from an audio source in real-time.
*   **Shader Injection:** Passes the frequency data as uniform variables to custom WebGL fragment shaders, driving visual mutations (glitches, pulses, color shifts).
*   **Flawless Export:** Initializes the WebGL context with drawing buffer preservation. Utilizes the `MediaRecorder` API to capture the canvas stream at 60fps, ensuring exported WebM videos have no dropped frames or blank screens.

---

## Architectural Directives for the AI
When rebuilding these modules in Next.js:
1.  **Server Authority:** All external API calls (Gemini, Image Gen) MUST occur in Next.js Server Actions or Route Handlers (`/api/...`).
2.  **Modularity:** Treat each feature above as an independent "Pod." They should not tightly couple their UI logic to one another.
3.  **State Persistence:** Assume all history, generated assets, and pipeline states will be backed by a server-side database (e.g., Supabase), replacing any legacy client-side storage.
