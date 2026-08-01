const { GoogleGenAI, Modality } = require('@google/genai');
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});
async function testModel() {
  const systemInstruction = "You are Miku, a sassy AI.\n\n[SYSTEM MEMORY DETECTED - DO NOT IGNORE]:\nhello\n\n[INSTRUCTION]: You MUST acknowledge previous interactions found in the memory above. If the user mentions something from before, recall it.";
  
  return new Promise((resolve) => {
    ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } }
        },
        systemInstruction: systemInstruction
      },
      callbacks: {
        onopen: () => console.log(`OPENED`),
        onmessage: (msg) => console.log(`MSG:`, JSON.stringify(msg)),
        onclose: (e) => {
          const reason = e?.reason || e?.[Symbol.for('kReason')] || '';
          console.log(`CLOSED: ${reason}`);
          resolve();
        }
      }
    });
  });
}
testModel().then(() => console.log("DONE"));
