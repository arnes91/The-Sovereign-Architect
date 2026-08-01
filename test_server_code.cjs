const { GoogleGenAI, Modality } = require('@google/genai');
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});
async function run() {
  let sessionPromise = null;
  let session = null;
  const config = {
    model: "gemini-3.1-flash-live-preview",
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
      systemInstruction: "You are Miku, a sassy AI."
    },
    callbacks: {
      onopen: () => {
        console.log("OPENED");
        // Simulate what server.ts does
      },
      onmessage: (msg) => {
        console.log("MSG", JSON.stringify(msg));
      },
      onclose: (e) => {
        console.log("CLOSED", e);
      }
    }
  };
  console.log("Calling...");
  sessionPromise = ai.live.connect(config);
  session = await sessionPromise;
  console.log("Session resolved!", Object.keys(session));
}
run();
