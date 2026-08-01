const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const ret = ai.live.connect({
  model: "gemini-3.1-flash-live-preview",
  callbacks: { onopen: () => console.log('OPENED') }
});
console.log("Returned:", typeof ret, ret instanceof Promise ? "Promise" : "Not Promise");
