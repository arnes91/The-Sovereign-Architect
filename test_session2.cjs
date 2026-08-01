const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function testModel() {
  let session = await ai.live.connect({
    model: "gemini-2.0-flash-exp",
    callbacks: {
      onopen: () => {},
      onmessage: () => {},
      onclose: () => {}
    }
  }).catch(e => {
    console.log("Connect Error:", e.message);
  });
  
  if (session) {
    console.log("METHODS:", Object.keys(session));
    console.log("PROTO:", Object.getOwnPropertyNames(Object.getPrototypeOf(session)));
  }
}
testModel();
