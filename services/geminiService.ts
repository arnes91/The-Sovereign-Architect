import { GoogleGenAI, Type, Modality } from "@google/genai";
import { PERSONALITIES } from '../config/personalities';
import { PROMPT_TEMPLATES } from '../config/promptTemplates';

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

// --- DBZ Scanner ---

export const generateDBZTaunt = async (powerLevel: number, stats: any) => {
  const ai = getAI();
  const tiers = PERSONALITIES.DBZ_SCANNER.tiers;
  const isHighTier = powerLevel > tiers.HIGH.threshold;
  const selectedPersona = isHighTier ? tiers.HIGH : tiers.LOW;
  
  const prompt = PROMPT_TEMPLATES.DBZ_TAUNT(
    selectedPersona.instruction,
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
};

export const generateSpeech = async (text: string, voiceName: string) => {
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
};

// --- Concept Studio (Image Gen/Edit) ---

export const generateImage = async (prompt: string, aspectRatio: string = "1:1") => {
    const ai = getAI();
    // Using gemini-2.5-flash-image for standard free generation
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
                return part.inlineData.data; // Return raw base64
            }
        }
    }
    return null;
};

export const editImage = async (base64Image: string, mimeType: string, prompt: string) => {
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
                return part.inlineData.data; // Return raw base64
            }
        }
    }
    return null;
};

// --- Content Analyzer ---

export const analyzeImage = async (prompt: string, image: { data: string, mimeType: string }) => {
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
};

export const analyzeVideo = async (prompt: string, video: { data: string, mimeType: string }) => {
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
};

export const transcribeAudio = async (prompt: string, audio: { data: string, mimeType: string }) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        contents: {
            parts: [
                { inlineData: { data: audio.data, mimeType: audio.mimeType } },
                { text: prompt }
            ]
        }
    });
    return response.text || "Transcription failed.";
};

export const complexAnalysis = async (prompt: string, media: { data: string, mimeType: string }) => {
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
};


// --- Deep Architect (Chat + Strategy) ---

export const streamStrategyChat = async function* (history: any[], newMessage: string, mode: 'THINKING' | 'SEARCH' | 'FAST', systemInstruction?: string) {
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
  }

  const chat = ai.chats.create({
      model: model,
      history: history,
      config: {
          ...config,
          systemInstruction: systemInstruction || PERSONALITIES.SOVEREIGN_ARCHITECT.instruction,
      }
  });

  const stream = await chat.sendMessageStream({ message: newMessage });
  
  for await (const chunk of stream) {
      yield chunk;
  }
};

// --- AI Composer ---

export const generateMusicalConcept = async (genre: string, mood: string, elements: string) => {
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
};
