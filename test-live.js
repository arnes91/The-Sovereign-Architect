import { GoogleGenAI } from "@google/genai";
import fs from "fs";
const env = fs.readFileSync('.env', 'utf8');
const key = env.match(/GEMINI_API_KEY=(.*)/)?.[1];
const ai = new GoogleGenAI({ apiKey: key });
async function test() {
  const models = ["gemini-3.1-flash-live-preview", "gemini-3.1-flash", "gemini-2.0-flash-exp"];
  for (const model of models) {
    try {
      const session = await ai.live.connect({ model });
      console.log("Success with", model);
      session.close();
    } catch (e) {
      console.error("Failed", model, e.message);
    }
  }
}
test();
