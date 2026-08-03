
import { GoogleGenAI, Modality } from "@google/genai";
import { PERSONALITIES } from '../config/personalities';
import { PROMPT_TEMPLATES } from '../config/promptTemplates';
import { HumeService } from './humeService';

export const getAI = () => {
    let key = '';
    if (typeof window !== 'undefined') {
        key = (window as any)._geminiToken || (import.meta as any).env.VITE_GEMINI_API_KEY || '';
    } else {
        key = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    }
    return new GoogleGenAI({ 
        apiKey: key,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
};

const getPaidAI = async () => {
    // @ts-ignore
    if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
    }
    return new GoogleGenAI({ 
        apiKey: process.env.API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
};

// --- Helpers ---

export function base64ToUint8Array(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decodePCM(base64: string, ctx: AudioContext, sampleRate: number = 24000): AudioBuffer {
  const bytes = base64ToUint8Array(base64);
  const dataInt16 = new Int16Array(bytes.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  
  for (let i = 0; i < dataInt16.length; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

/**
 * Wraps API calls to handle Geo-Blocking (403) and other API errors gracefully.
 */
export async function safeApiCall<T>(apiCall: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
        return await apiCall();
    } catch (error: any) {
        // Handle Rate Limiting (429)
        if ((error.status === 429 || error.code === 429) && retries > 0) {
            console.warn(`Gemini API Rate Limited (429). Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return safeApiCall(apiCall, retries - 1, delay * 2);
        }

        console.error("Gemini API Error:", error);
        
        const errorMsg = error.toString().toLowerCase();
        const responseMsg = error.response ? JSON.stringify(error.response).toLowerCase() : "";
        
        if (errorMsg.includes("403") || errorMsg.includes("region not supported") || responseMsg.includes("region not supported")) {
            throw new Error("REGION_LOCKED: The requested AI model is currently unavailable in your geographic location.");
        }
        
        if (errorMsg.includes("503") || errorMsg.includes("overloaded")) {
            throw new Error("SYSTEM_OVERLOAD: The Neural Network is at capacity. Retrying...");
        }

        throw error;
    }
}

// --- DBZ Scanner ---

export const generateDBZTaunt = async (powerLevel: number, stats: any) => {
  return safeApiCall(async () => {
      const ai = getAI();
      
      const selectedPersona = HumeService.determinePersona(powerLevel, stats);
      
      const prompt = PROMPT_TEMPLATES.DBZ_TAUNT(
        selectedPersona.name,
        powerLevel.toLocaleString(),
        JSON.stringify(stats)
      );

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { temperature: 0.9 }
      });

      return {
        text: response.text || "Reading failed...",
        voice: selectedPersona.voice
      };
  });
};

export const analyzeDBZVision = async (base64Image: string) => {
    return safeApiCall(async () => {
        const ai = getAI();
        const prompt = PROMPT_TEMPLATES.DBZ_VISION_ANALYSIS;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: 'application/json'
            }
        });

        const json = JSON.parse(response.text || "{}");
        return json;
    });
};

export const generateSpeech = async (text: string, voiceName: string) => {
    return safeApiCall(async () => {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-tts-preview",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName as any },
                    },
                },
            },
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    });
};

// --- Concept Studio (Image Gen/Edit) ---

export const generateImage = async (prompt: string, aspectRatio: string = "1:1", imageSize: string = "1K") => {
    return safeApiCall(async () => {
        const ai = await getPaidAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }],
            },
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio as any,
                    imageSize: imageSize as any
                },
            },
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) {
                    return part.inlineData.data; 
                }
            }
        }
        return null;
    });
};

export const generateVideo = async (prompt: string, aspectRatio: string = "16:9", imageBase64?: string, imageMimeType?: string) => {
    return safeApiCall(async () => {
        const ai = await getPaidAI();
        
        const params: any = {
            model: 'veo-3.1-lite-generate-preview',
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: aspectRatio as any
            }
        };

        if (prompt) {
            params.prompt = prompt;
        }

        if (imageBase64 && imageMimeType) {
            params.image = {
                imageBytes: imageBase64,
                mimeType: imageMimeType
            };
        }

        let operation = await ai.models.generateVideos(params);

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({operation: operation});
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) return null;

        return downloadLink;
    });
};

export const editImage = async (base64Image: string, mimeType: string, prompt: string) => {
    return safeApiCall(async () => {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType,
                        },
                    },
                    { text: prompt },
                ],
            },
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) {
                    return part.inlineData.data; 
                }
            }
        }
        return null;
    });
};

export const generateEmbedding = async (text: string) => {
    return safeApiCall(async () => {
        const res = await fetch('/api/gemini/embed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return data.embedding || [];
    });
};

// --- Content Analyzer & Analytics Lab ---

export const analyzeDataFile = async (content: string, fileName: string) => {
    return safeApiCall(async () => {
        const ai = getAI();
        const prompt = PROMPT_TEMPLATES.ANALYTICS_INTERPRETER(fileName);
        
        const safeContent = content.length > 500000 ? content.substring(0, 500000) + "\n...[TRUNCATED]" : content;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
                ${prompt}
                
                --- DATA START ---
                ${safeContent}
                --- DATA END ---
            `,
            config: {
                // @ts-ignore
                thinkingConfig: { thinkingLevel: 1 } // ThinkingLevel.HIGH
            }
        });
        
        return response.text;
    });
};

export const analyzeImage = async (prompt: string, image: { data: string, mimeType: string }) => {
    return safeApiCall(async () => {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: image.data, mimeType: image.mimeType } },
                    { text: prompt }
                ]
            }
        });
        return response.text || "No analysis available.";
    });
};

export const analyzeVideo = async (prompt: string, video: { data: string, mimeType: string }) => {
    return safeApiCall(async () => {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: video.data, mimeType: video.mimeType } },
                    { text: prompt }
                ]
            }
        });
        return response.text || "No analysis available.";
    });
};

export const transcribeAudio = async (prompt: string, audio: { data: string, mimeType: string }) => {
    return safeApiCall(async () => {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: audio.data, mimeType: audio.mimeType } },
                    { text: prompt }
                ]
            }
        });
        return response.text || "Transcription failed.";
    });
};

export const complexAnalysis = async (prompt: string, media: { data: string, mimeType: string }) => {
    return safeApiCall(async () => {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: media.data, mimeType: media.mimeType } },
                    { text: prompt }
                ]
            },
            config: {
                // @ts-ignore
                thinkingConfig: { thinkingLevel: 1 } // ThinkingLevel.HIGH
            }
        });
        return response.text || "Analysis failed.";
    });
};


// --- Deep Architect (Chat + Strategy) ---

export const streamStrategyChat = async function* (history: any[], newMessage: string, mode: 'THINKING' | 'SEARCH' | 'FAST' | 'STANDARD', systemInstruction?: string) {
  const ai = getAI();
  
  let model = 'gemini-2.5-flash';
  let config: any = {};
  
  if (mode === 'THINKING') {
      model = 'gemini-2.5-flash';
      config = {
          thinkingConfig: { thinkingLevel: 1 } // ThinkingLevel.HIGH
      };
  } else if (mode === 'SEARCH') {
      model = 'gemini-2.5-flash';
      config = {
          tools: [{ googleSearch: {} }]
      };
  } else if (mode === 'FAST') {
      model = 'gemini-2.5-flash-lite';
  } else if (mode === 'STANDARD') {
      model = 'gemini-2.5-flash';
  }

  // Use Centralized Prompt if default
  const instruction = systemInstruction || PROMPT_TEMPLATES.SOVEREIGN_ARCHITECT;

  try {
      const chat = ai.chats.create({
          model: model,
          history: history,
          config: {
              ...config,
              systemInstruction: instruction,
          }
      });

      const stream = await chat.sendMessageStream({ message: newMessage });
      
      for await (const chunk of stream) {
          yield chunk;
      }
  } catch (error: any) {
        console.error("Gemini Stream Error:", error);
        const errorMsg = error.toString().toLowerCase();
        if (errorMsg.includes("403") || errorMsg.includes("region not supported")) {
            throw new Error("REGION_LOCKED: The requested AI model is currently unavailable in your geographic location.");
        }
        throw error;
  }
};

// --- Knowledge Base Synthesis ---

export const synthesizeKnowledgeBase = async (rawDataDump: string) => {
    return safeApiCall(async () => {
        const prompt = PROMPT_TEMPLATES.KNOWLEDGE_SYNTHESIS;
        const safeData = rawDataDump.substring(0, 100000);
        
        const contents = `
            ${prompt}
            
            --- RAW DATA DUMP START ---
            ${safeData}
            --- RAW DATA DUMP END ---
        `;

        const res = await fetch('/api/gemini/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-2.5-flash',
                contents,
                responseMimeType: "application/json"
            })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        try {
            return JSON.parse(data.text || "[]");
        } catch (e) {
            console.error("Failed to parse synthesized knowledge JSON", e);
            return [];
        }
    });
};

// --- AI Composer ---

export const generateMusicalConcept = async (genre: string, mood: string, elements: string) => {
    return safeApiCall(async () => {
        const ai = getAI();
        const prompt = PROMPT_TEMPLATES.AI_COMPOSER(genre, mood, elements);
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 1
            }
        });

        try {
            return JSON.parse(response.text || "{}");
        } catch (e) {
            console.error("Failed to parse music JSON", e);
            return null;
        }
    });
};
