import { GoogleGenAI, Type, Modality } from "@google/genai";

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
  
  const isHighTier = powerLevel > 500000;
  const persona = isHighTier ? "Whis (Angel Attendant)" : "Frieza (Tyrant)";
  
  const prompt = `
    Role: You are ${persona} from Dragon Ball Z.
    Context: A fighter has just been scanned.
    Power Level: ${powerLevel.toLocaleString()}
    Top Emotions: ${JSON.stringify(stats)}
    
    Task: Deliver a "Persona Taunt" (commentary). 
    Constraints: 
    - Exactly two sentences.
    - Use the emotions to explain the power level.
    - If Frieza: Be condescending, mocking, call them a monkey or weakling.
    - If Whis: Be politely impressed but aloof.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-09-2025',
    contents: prompt,
    config: {
      temperature: 0.9,
    }
  });

  return response.text || "Reading failed...";
};

export const generateSpeech = async (text: string, voiceName: 'Kore' | 'Fenrir' = 'Fenrir') => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName },
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio;
};

// --- Concept Studio (Image Gen/Edit) ---

export const generateImage = async (prompt: string, aspectRatio: string = "16:9", size: string = "1K") => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
            parts: [{ text: prompt }],
        },
        config: {
            imageConfig: {
                aspectRatio: aspectRatio as any,
                imageSize: size as any,
            },
        },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
        for (const part of parts) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }
    return null;
};

export const editImage = async (base64Image: string, prompt: string) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: base64Image.split(',')[1],
                        mimeType: 'image/png',
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
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }
    return null;
};

// --- Deep Architect (Chat + Strategy) ---

export const streamStrategyChat = async function* (history: any[], newMessage: string, mode: 'THINKING' | 'SEARCH' | 'FAST') {
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
      model = 'gemini-2.5-flash-lite-latest';
  }

  const chat = ai.chats.create({
      model: model,
      history: history,
      config: {
          ...config,
          systemInstruction: "You are The Sovereign Architect. A strategic advisor for the Brzi Ecosystem. You are concise, technical, and speak in a 'Quiet Architect' persona. You value sovereignty, automation, and glitcy aesthetics.",
      }
  });

  const stream = await chat.sendMessageStream({ message: newMessage });
  
  for await (const chunk of stream) {
      yield chunk;
  }
};
