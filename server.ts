import express from "express";
import path from "path";
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { WebSocketServer } from "ws";
import fs from "fs";

function loadLocalEnv() {
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      content.split("\n").forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const parts = trimmed.split("=");
          const key = parts[0].trim();
          const val = parts.slice(1).join("=").trim();
          if (key) {
            process.env[key] = val;
          }
        }
      });
      console.log("Loaded custom .env file successfully.");
    }
  } catch (e) {
    console.error("Failed to load .env file:", e);
  }
}

loadLocalEnv();

function debugLog(message: string) {
  const logMsg = `[${new Date().toISOString()}] ${message}\n`;
  try {
    fs.appendFileSync(path.join(process.cwd(), "server_debug.log"), logMsg);
  } catch (e) {
    console.error("Failed to write to server_debug.log:", e);
  }
  console.log(logMsg.trim());
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Generic Gemini API Proxy for Chat and VJ
  app.get("/api/gemini/token", (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) return res.status(401).json({ error: "Missing API Key" });
    res.json({ token: apiKey });
  });

  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) return res.status(401).json({ error: "Missing API Key" });
      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const { model, contents, systemInstruction, responseMimeType } = req.body;
      const response = await ai.models.generateContent({
        model: model || 'gemini-3.1-pro-preview',
        contents,
        config: { systemInstruction, responseMimeType }
      });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Generate Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Embeddings API
  app.post("/api/gemini/embed", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) return res.status(401).json({ error: "Missing API Key" });
      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const { text } = req.body;
      const response = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: text
      });
      res.json({ embedding: response.embeddings?.[0]?.values });
    } catch (error: any) {
      console.error("Embed Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Lyrics Sync API
  app.post("/api/lyrics-sync", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) return res.status(401).json({ error: "Missing API Key" });
      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const { lyrics, bpm } = req.body;
      const prompt = `Analyze the following lyrics. The song is ${bpm} BPM. Provide a JSON array of visual cues for a music visualizer. Each cue should have a timestamp (in seconds, approximate based on typical song structure and BPM), the lyric text, and a suggested visual style (NORMAL, GLITCH, IMPACT, SOFT). Only output the JSON array.\n\nLyrics:\n${lyrics}`;
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      res.json({ cues: JSON.parse(response.text || '[]') });
    } catch (error: any) {
      console.error("Lyrics Sync Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  // Agents API Route
  app.post("/api/agents/interact", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        return res.status(401).json({ error: "Missing API Key. Please set it in AI Studio settings." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const { input, previousInteractionId } = req.body;

      // Ensure model/agent selection as per the gemini-interactions-api instructions
      // For general Managed Agent: "antigravity-preview-05-2026"
      const interactionParams: any = {
        agent: "antigravity-preview-05-2026",
        input: input,
        environment: "remote",
      };

      if (previousInteractionId) {
        interactionParams.previous_interaction_id = previousInteractionId;
      }

      const interaction = await ai.interactions.create(interactionParams, { timeout: 300000 });
      
      let fullOutput = "";
      for (const step of interaction.steps) {
        if (step.type === 'model_output') {
          const textContent = step.content?.find(c => c.type === 'text');
          if (textContent && textContent.text) {
            fullOutput += textContent.text;
          }
        }
      }

      res.json({
        output: fullOutput || interaction.output_text,
        interactionId: interaction.id,
        steps: interaction.steps
      });
    } catch (error: any) {
      console.error("Agent Interaction Error:", error.body || error);
      let errorMessage = "Failed to interact with the agent.";
      if (error.body) {
        try {
          const bodyArr = JSON.parse(error.body);
          if (Array.isArray(bodyArr) && bodyArr[0]?.error?.message) {
            errorMessage = bodyArr[0].error.message;
          }
        } catch (e) {
          errorMessage = error.body;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  const wss = new WebSocketServer({ server });

  function getSupportedVoice(voice?: string): string {
    if (!voice) return "Kore";
    const supported = ["Puck", "Charon", "Kore", "Fenrir", "Zephyr"];
    const matched = supported.find(v => v.toLowerCase() === voice.toLowerCase());
    if (matched) return matched;
    
    // Custom mappings for standard DBZ/Miku presets to Live API supported voices
    const voiceLower = voice.toLowerCase();
    if (voiceLower === "aoede" || voiceLower === "leda") return "Kore";
    if (voiceLower === "rasalgethi") return "Charon";
    
    return "Kore"; // Default fallback
  }

  wss.on("connection", (clientWs) => {
    let sessionPromise: any = null;
    let session: any = null;

    clientWs.on("message", async (messageBuffer) => {
      try {
        const msg = JSON.parse(messageBuffer.toString());
        if (msg.type === "setup") {
          const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
          if (!apiKey) {
            debugLog("Setup Failed: API Key is missing on the server.");
            clientWs.send(JSON.stringify({ type: "error", message: "API key is missing on the server. Please check Settings > Secrets." }));
            clientWs.close();
            return;
          }
          
          const voiceSelected = getSupportedVoice(msg.voice);
          const modelToUse = msg.model || "gemini-3.1-flash-live-preview";
          debugLog(`Initiating Gemini Live connect setup: model=${modelToUse}, voice=${voiceSelected}, promptLength=${msg.systemPrompt?.length || 0}, memoryLength=${msg.memory?.length || 0}`);
          clientWs.send(JSON.stringify({ type: "status", message: "CONNECTING TO COGNITIVE CORE..." }));
          
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          });

          const memoryInjection = msg.memory 
            ? `\n\n[SYSTEM MEMORY DETECTED - DO NOT IGNORE]:\n${msg.memory}\n\n[INSTRUCTION]: You MUST acknowledge previous interactions found in the memory above. If the user mentions something from before, recall it.` 
            : "";

          const systemInstruction = msg.systemPrompt + memoryInjection;

          const config = {
            model: modelToUse,
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceSelected } }
              },
              systemInstruction: systemInstruction
            },
            callbacks: {
              onopen: () => {
                debugLog("Gemini Live API: Socket Connection opened successfully.");
                // We will send ready after setupComplete is received.
              },
              onmessage: (message: LiveServerMessage) => {
                try {
                  const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                  if (base64Audio) {
                    clientWs.send(JSON.stringify({ type: "audio", data: base64Audio }));
                  }

                  const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
                  if (text) {
                    clientWs.send(JSON.stringify({ type: "text", text: text }));
                  }

                  if (message.serverContent?.turnComplete) {
                    clientWs.send(JSON.stringify({ type: "turnComplete" }));
                  }
                } catch (e: any) {
                  debugLog("Error in onmessage: " + e.message);
                }
              },
              onclose: (e: any) => {
                debugLog(`Gemini Live API: Connection closed. Details: ${JSON.stringify(e)}`);
                const reason = e?.reason || e?.[Symbol.for('kReason')] || '';
                
                if (!session) {
                  // We never resolved the session, meaning we dropped before setupComplete.
                  // This usually means invalid API key or model issue.
                  clientWs.send(JSON.stringify({ 
                    type: "error", 
                    message: `Cognitive Core Connection Aborted. Verify your Gemini API Key in Settings > Secrets. (Reason: ${reason})` 
                  }));
                } else {
                  clientWs.send(JSON.stringify({ type: "status", message: "COGNITIVE CORE OFFLINE" }));
                }
                clientWs.close();
              },
              onerror: (err: any) => {
                debugLog(`Gemini Live API: Error event received: ${err?.message || err || 'Unknown error'}`);
                if (err?.stack) {
                  debugLog(`Error Stack: ${err.stack}`);
                }
                clientWs.send(JSON.stringify({ type: "error", message: err?.message || "Cognitive core error" }));
              }
            }
          };

          try {
            const configToLog = { ...config };
            // @ts-ignore
            delete configToLog.callbacks;
            debugLog("Calling ai.live.connect with full config: " + JSON.stringify(configToLog));
            // @ts-ignore
            sessionPromise = ai.live.connect(config);
            session = await sessionPromise;
            debugLog("ai.live.connect promise resolved successfully. setupComplete received.");
            try {
              clientWs.send(JSON.stringify({ type: "status", message: "UPLINK STABLE. SESSION STARTED." }));
              clientWs.send(JSON.stringify({ type: "ready" }));
            } catch (e: any) {
              debugLog("Error sending ready: " + e.message);
            }
          } catch (connectErr: any) {
            debugLog(`CRITICAL: ai.live.connect threw synchronous exception: ${connectErr.message}`);
            clientWs.send(JSON.stringify({ type: "error", message: `Live Connection Failed: ${connectErr.message}` }));
            clientWs.close();
          }
          
        } else if (msg.type === "ping") {
          clientWs.send(JSON.stringify({ type: "pong" }));
        } else if (msg.type === "audio") {
          if (session) {
            session.sendRealtimeInput({
              audio: {
                mimeType: "audio/pcm;rate=16000",
                data: msg.data
              }
            });
          }
        } else if (msg.type === "video") {
          if (session) {
            session.sendRealtimeInput({
              video: {
                mimeType: "image/jpeg",
                data: msg.data
              }
            });
          }
        }
      } catch (err: any) {
        console.error("WebSocket server message error:", err);
        clientWs.send(JSON.stringify({ type: "error", message: err.message || "Internal bridge processing error" }));
      }
    });

    clientWs.on("close", () => {
      if (session) {
        try {
          session.close();
        } catch (e) {}
      }
    });
  });
}

startServer();
