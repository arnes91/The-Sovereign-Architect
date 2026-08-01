const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  console.log("Calling connect...");
  const ret = await ai.live.connect({
    model: "gemini-3.1-flash-live-preview"
  });
  console.log("Connect resolved!");
  console.log("Keys:", Object.keys(ret));
}
run();
