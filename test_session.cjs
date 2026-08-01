const { GoogleGenAI, Modality } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function testModel() {
  return new Promise(async (resolve) => {
    let session = await ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      callbacks: {
        onopen: () => { console.log('OPENED'); },
        onmessage: (msg) => { console.log('MSG', !!msg.setupComplete); },
        onclose: (e) => { 
          const r = e?.reason || e?.[Symbol.for('kReason')];
          console.log('CLOSED:', r); 
          resolve(); 
        }
      }
    });
    console.log("METHODS:", Object.keys(session));
    // Let's look at prototype
    console.log("PROTO:", Object.getOwnPropertyNames(Object.getPrototypeOf(session)));
    
    // Attempt sending something wrong
    try {
      session.send({ foo: "bar" });
    } catch(e) {
      console.log("ERROR SEND:", e.message);
    }
  });
}
testModel();
