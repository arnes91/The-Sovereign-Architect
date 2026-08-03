import { GoogleGenAI } from "@google/genai";
async function test() {
  try {
    const ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY || "dummy", 
      httpOptions: { apiVersion: "v1alpha" } 
    });
    console.log(ai.httpOptions);
  } catch (e) {
    console.error(e.message);
  }
}
test();
