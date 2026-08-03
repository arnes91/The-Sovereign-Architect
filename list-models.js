import { GoogleGenAI } from "@google/genai";
import fs from "fs";
const env = fs.readFileSync('.env.example', 'utf8'); // Wait, env is not there
