import { safeApiCall } from './geminiService';

const HEDRA_API_URL = 'https://mercury.hedra.com/v1';

export const generateHedraCharacterVideo = async (
    imageUrl: string,
    audioUrl: string,
    aspectRatio: '16:9' | '1:1' | '9:16' = '1:1'
) => {
    return safeApiCall(async () => {
        const apiKey = import.meta.env.VITE_HEDRA_API_KEY;
        if (!apiKey) throw new Error("VITE_HEDRA_API_KEY is missing.");

        // 1. Initiate Generation
        const initResponse = await fetch(`${HEDRA_API_URL}/characters`, {
            method: 'POST',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                avatarImage: imageUrl,
                audioSource: 'audio',
                voiceUrl: audioUrl,
                aspectRatio: aspectRatio
            })
        });

        if (!initResponse.ok) {
            const err = await initResponse.text();
            throw new Error(`Hedra API Error: ${err}`);
        }

        const { jobId } = await initResponse.json();

        // 2. Poll for completion
        let videoUrl = null;
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max (5s * 60)

        while (!videoUrl && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            attempts++;

            const statusResponse = await fetch(`${HEDRA_API_URL}/projects/${jobId}`, {
                headers: {
                    'X-API-KEY': apiKey
                }
            });

            if (!statusResponse.ok) continue;

            const statusData = await statusResponse.json();
            
            if (statusData.status === 'Completed') {
                videoUrl = statusData.videoUrl;
            } else if (statusData.status === 'Failed') {
                throw new Error("Hedra video generation failed.");
            }
        }

        if (!videoUrl) {
            throw new Error("Hedra video generation timed out.");
        }

        return videoUrl;
    });
};
