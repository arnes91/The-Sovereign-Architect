import { GoogleGenAI, Modality } from "@google/genai";
import { PERSONALITIES } from '../config/personalities';
import { PROMPT_TEMPLATES } from '../config/promptTemplates';
import { HumeService } from './humeService';

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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
async function safeApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
        return await apiCall();
    } catch (error: any) {
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
        model: 'gemini-3-flash-preview',
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
            model: 'gemini-3-flash-preview',
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
            model: "gemini-2.5-flash-preview-tts",
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

export const generateImage = async (prompt: string, aspectRatio: string = "1:1") => {
    return safeApiCall(async () => {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }],
            },
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio as any,
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

export const editImage = async (base64Image: string, mimeType: string, prompt: string) => {
    return safeApiCall(async () => {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
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

// --- Content Analyzer & Analytics Lab ---

export const analyzeDataFile = async (content: string, fileName: string) => {
    return safeApiCall(async () => {
        const ai = getAI();
        const prompt = PROMPT_TEMPLATES.ANALYTICS_INTERPRETER(fileName);
        
        const safeContent = content.length > 500000 ? content.substring(0, 500000) + "\n...[TRUNCATED]" : content;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `
                ${prompt}
                
                --- DATA START ---
                ${safeContent}
                --- DATA END ---
            `,
            config: {
                thinkingConfig: { thinkingBudget: 16000 }
            }
        });
        
        return response.text;
    });
};

export const analyzeImage = async (prompt: string, image: { data: string, mimeType: string }) => {
    return safeApiCall(async () => {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
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
            model: 'gemini-3-flash-preview',
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
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
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
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { data: media.data, mimeType: media.mimeType } },
                    { text: prompt }
                ]
            },
            config: {
                thinkingConfig: { thinkingBudget: 16000 }
            }
        });
        return response.text || "Analysis failed.";
    });
};


// --- Deep Architect (Chat + Strategy) ---

export const streamStrategyChat = async function* (history: any[], newMessage: string, mode: 'THINKING' | 'SEARCH' | 'FAST' | 'STANDARD', systemInstruction?: string) {
  const ai = getAI();
  
  let model = 'gemini-3-flash-preview';
  let config: any = {};
  
  if (mode === 'THINKING') {
      model = 'gemini-3-pro-preview';
      config = {
          thinkingConfig: { thinkingBudget: 16000 }
      };
  } else if (mode === 'SEARCH') {
      model = 'gemini-3-flash-preview';
      config = {
          tools: [{ googleSearch: {} }]
      };
  } else if (mode === 'FAST') {
      model = 'gemini-flash-lite-latest';
  } else if (mode === 'STANDARD') {
      model = 'gemini-3-flash-preview';
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

// --- AI Composer ---

export const generateMusicalConcept = async (genre: string, mood: string, elements: string) => {
    return safeApiCall(async () => {
        const ai = getAI();
        const prompt = PROMPT_TEMPLATES.AI_COMPOSER(genre, mood, elements);
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
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