const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  console.log("Without callbacks:");
  let p1 = ai.live.connect({ model: "gemini-3.1-flash-live-preview" });
  console.log("p1 is Promise?", p1 instanceof Promise);
  p1.then(() => console.log("p1 resolved!")).catch(() => console.log("p1 rejected!"));

  console.log("With callbacks:");
  let p2 = ai.live.connect({ 
    model: "gemini-3.1-flash-live-preview",
    callbacks: { onopen: () => console.log("p2 opened") }
  });
  console.log("p2 is Promise?", p2 instanceof Promise);
  p2.then(() => console.log("p2 resolved!")).catch(() => console.log("p2 rejected!"));
}
run();
