/**
 * External API Service
 * Handles connections to YouTube and Spotify for Brzi Ecosystem data.
 */

const YOUTUBE_API_KEY = (import.meta as any).env.VITE_YOUTUBE_API_KEY;
const SPOTIFY_CLIENT_ID = (import.meta as any).env.VITE_SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = (import.meta as any).env.VITE_SPOTIFY_CLIENT_SECRET;
const SPOTIFY_ARTIST_ID = (import.meta as any).env.VITE_SPOTIFY_ARTIST_ID;

const YOUTUBE_CHANNELS = {
    BRZI_ARZI: '@brziarzi',
    BRZI_AI: '@BrziAi'
};

export const ExternalApiService = {
    
    // --- YouTube ---
    fetchYouTubeStats: async () => {
        if (!YOUTUBE_API_KEY) {
            console.warn("YOUTUBE_API_KEY not found, using simulated data.");
            return {
                BRZI_ARZI: {
                    handle: "@brziarzi",
                    title: "Brzi Arzi",
                    stats: { subscriberCount: "15000", viewCount: "2500000", videoCount: "45" }
                },
                BALKAN_AI: {
                    handle: "@balkanai",
                    title: "Balkan AI",
                    stats: { subscriberCount: "8500", viewCount: "1200000", videoCount: "120" }
                }
            };
        }
        try {
            const results: any = {};
            
            for (const [key, handle] of Object.entries(YOUTUBE_CHANNELS)) {
                // 1. Get Channel ID from Handle
                const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${handle}&key=${YOUTUBE_API_KEY}`;
                const searchRes = await fetch(searchUrl);
                const searchData = await searchRes.json();
                
                if (searchData.items?.[0]?.id?.channelId) {
                    const channelId = searchData.items[0].id.channelId;
                    
                    // 2. Get Statistics
                    const statsUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${YOUTUBE_API_KEY}`;
                    const statsRes = await fetch(statsUrl);
                    const statsData = await statsRes.json();
                    
                    if (statsData.items?.[0]) {
                        results[key] = {
                            handle,
                            title: statsData.items[0].snippet.title,
                            stats: statsData.items[0].statistics
                        };
                    }
                }
            }
            return results;
        } catch (e) {
            console.warn("YouTube Fetch Error, using simulated data:", e);
            return {
                BRZI_ARZI: {
                    handle: "@brziarzi",
                    title: "Brzi Arzi",
                    stats: { subscriberCount: "15000", viewCount: "2500000", videoCount: "45" }
                },
                BALKAN_AI: {
                    handle: "@balkanai",
                    title: "Balkan AI",
                    stats: { subscriberCount: "8500", viewCount: "1200000", videoCount: "120" }
                }
            };
        }
    },

    // --- Spotify ---
    fetchSpotifyStats: async () => {
        // Spotify Client Credentials flow cannot be done securely from the browser
        // and is blocked by CORS. Using simulated data for the demo.
        return {
            artist: {
                name: "Brzi Arzi",
                followers: { total: 12500 },
                popularity: 65,
                genres: ["balkan hip hop", "cyberpunk trap"]
            },
            top_tracks: [
                { name: "Cyber Balkan", popularity: 72, album: "Neon Sarajevo", release_date: "2025-10-15" },
                { name: "Rakija & Code", popularity: 68, album: "Neon Sarajevo", release_date: "2025-10-15" },
                { name: "Sovereign Core", popularity: 60, album: "Singles", release_date: "2026-01-20" }
            ]
        };
    }
};
