const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  console.log("STARTING");
  try {
    const session = await ai.live.connect({
      model: "gemini-3.1-flash-live-preview"
    });
    console.log("METHODS:", Object.getOwnPropertyNames(Object.getPrototypeOf(session)));
    console.log("session keys:", Object.keys(session));
  } catch(e) {
    console.log("ERR:", e.message);
  }
}
run();
