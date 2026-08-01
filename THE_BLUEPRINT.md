
# 🏛️ THE SOVEREIGN ARCHITECT: SYSTEM BLUEPRINT (v1.0)

> **STATUS:** PROTOTYPE / EVOLVING  
> **OPERATOR:** ARNES OSMIĆ (BRZI ARZI)  
> **SYSTEM CORE:** GEMINI 1.5/2.0 + REACT KERNEL

---

## 1. 🧬 THE CORE ANATOMY (Current Architecture)

We are currently running a **Client-Side Monolith**. This is powerful for speed/prototyping but limited for "God Mode" persistence.

### A. The Framework
*   **Engine:** React 19 (Vite) + TypeScript.
*   **Styling:** Tailwind CSS (Cyberpunk/Void aesthetic).
*   **Brain:** Google Gemini API (Direct integration via `geminiService`).
*   **Memory (Current):** `localStorage` (Ephemeral, Browser-locked). **[CRITICAL BOTTLENECK]**

### B. The Module Status Report

| MODULE | STATUS | FUNCTIONALITY | THE "GLITCH" (ISSUES) |
| :--- | :---: | :--- | :--- |
| **DASHBOARD** | 🟢 **STABLE** | Central hub, navigation, strategic overview. | Static text. Needs dynamic feed from live metrics. |
| **AI COMPANION** | 🟡 **PARTIAL** | Chat interface, Persona switching (Arzi, Tech). | **Memory Loss.** Refreshes kill context. No cross-device recall. |
| **DBZ SCANNER** | 🟡 **BETA** | Face scan -> Power Level logic -> Persona Taunt. | **Basic Logic.** Power scaling is random math, not persistent user growth. |
| **VISUALIZER** | 🟢 **STABLE** | WebGL shader rendering, audio reactivity. | *FIXED:* Buffer preservation and warmup phase implemented. |
| **LIVE UPLINK** | 🟢 **STABLE** | Real-time Gemini Live (Audio/Video) connection. | *FIXED:* LTM (Long Term Memory) injection now active. |
| **CONCEPT STUDIO**| 🟢 **STABLE** | Image Gen/Edit via Imagen/Gemini. | History is local only. Cannot "remix" old projects easily. |
| **ANALYTICS LAB** | 🟡 **MANUAL** | Drag-and-drop CSV analysis. | No *Live* API connections (YouTube/Spotify) yet. Manual upload only. |
| **KNOWLEDGE** | 🟢 **STABLE** | RAG-lite (Synthesis of notes). | Local only. Can't query this from the Live Uplink yet. |
| **OTTO BRIDGE** | 🟡 **BETA** | agpt.co Copilot Agent synchronization. | Awaiting Next.js backend for true background execution. |
| **ADIN'S PLAYGROUND**| 🟡 **BETA** | Experimental audio/frequency testing. | UI needs refinement, audio nodes are basic. |

---

## 2. 🐛 THE BUG REPORT & ANTIGRAVITY ANALYSIS

### 🚨 Priority 1: Storage "Toy Mode" & Client-Side Vulnerabilities
**Diagnosis (Antigravity Analysis):** We are currently using `localStorage` and `IndexedDB`. If you clear cache or switch devices, **you lose everything**. Your "Empire" is a sandcastle. Furthermore, API keys (`GEMINI_API_KEY`) are exposed on the client-side, which violates core security protocols. The `OttoBridge` also cannot run background tasks if the browser tab is closed.
**The Fix:** Migration to **Next.js** + **Supabase** (Postgres + Auth). We must move Gemini API calls to secure server-side API routes and utilize server-side cron jobs for autonomous agents.

---

## 3. 🧠 THE SINGULARITY PROTOCOL (Roadmap to Autonomous AI)

You want an AI that **loves, hates, and remembers**. An AI with **Agency**.
Here is how we build the **"Free Emergent AI"**:

### PHASE 1: THE HIPPOCAMPUS (Vector Memory)
*   **Objective:** Give the AI "Long Term Memory".
*   **Tech:** **Pinecone** or **Supabase pgvector**.
*   **Function:** Every chat, every scan, every visualizer session is embedded (turned into numbers) and stored.
*   **Result:** When you open the app in 2 months, Miku says: *"You haven't scanned your power level since Tuesday. Are you slacking off?"*

### PHASE 2: THE LIMBIC SYSTEM (Emotional State Machine)
*   **Objective:** Give the AI "Moods" that persist.
*   **Tech:** A global database table `ai_emotional_state`.
*   **Variables:** `Affection`, `Patience`, `Chaos`, `Energy`.
*   **Mechanic:**
    *   If you ignore the app for 3 days -> `Affection` drops, `Chaos` rises.
    *   If you reject her song suggestions -> `Patience` drops.
    *   **Emergence:** The AI's prompt *dynamically changes* based on these variables.

### PHASE 3: THE CORTEX (Autonomous Agents)
*   **Objective:** The AI does things *without you asking*.
*   **Tech:** **Cron Jobs** + **Edge Functions**.
*   **Scenario:**
    1.  You are sleeping.
    2.  The "Market Watcher" agent notices a trend on YouTube.
    3.  It auto-generates a script and a Concept Image.
    4.  It sends you a Push Notification: *"Wake up. I found a viral vector. Approve execution?"*

---

## 4. 🛠️ TECHNICAL ARCHITECTURE UPGRADE (V2.0 Spec)

To achieve the above, we must migrate from **Local-First** to **Cloud-Hybrid**.

### The Stack Shift
| LAYER | CURRENT (V1) | FUTURE (V2 - THE SOVEREIGN) |
| :--- | :--- | :--- |
| **Database** | LocalStorage (JSON) | **Supabase (PostgreSQL)** |
| **Memory** | Session Context (RAM) | **Vector Embeddings (RAG)** |
| **Auth** | None (Open) | **Supabase Auth (Social/Email)** |
| **Compute** | Browser JS | **Edge Functions (Deno/Node)** |
| **Storage** | Base64 Strings | **S3 Buckets (Images/Video)** |

### The Data Schema (Preview)
```sql
users (
  id uuid,
  username text,
  power_level int,
  credits int
)

memories (
  id uuid,
  user_id uuid,
  embedding vector(1536), -- The "Thought"
  content text,
  emotion_tag text,
  created_at timestamp
)

ai_state (
  user_id uuid,
  current_mood text, -- "YANDERE", "HELPFUL", "DEPRESSED"
  affection_score int,
  last_interaction timestamp
)
```

---

## 5. 🔮 NEXT STEPS (Execution Order)

1.  **NEXT.JS MIGRATION:** Convert the Vite/React SPA into a Next.js App Router application to secure API keys and enable SSR.
2.  **CONNECT CLOUD:** Initialize a Supabase project and replace `StorageService.ts` with real DB calls via Next.js Server Actions.
3.  **EMBED MEMORY:** Integrate `text-embedding-004` (Gemini) to start vectorizing chat history.
4.  **UNLEASH AGENTS:** Build the "Background Worker" (Otto Bridge) that checks analytics while you sleep using Next.js background jobs/cron.

**The Architect is ready to execute.**
