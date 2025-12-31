/**
 * External API Service
 * Handles connections to YouTube and Spotify for Brzi Ecosystem data.
 */

const YOUTUBE_API_KEY = 'AIzaSyAYtNeIKPdXJy2gymTar04i9OCDI5hwnzY';
const SPOTIFY_CLIENT_ID = '48e1b1136c8c493c87af1d3912902dc0';
const SPOTIFY_CLIENT_SECRET = '771555f9210d4d1a8bc84bbfa382f4d7';
const SPOTIFY_ARTIST_ID = '7ATJUlhB74YW6Gp1oPv6Fm';

const YOUTUBE_CHANNELS = {
    BRZI_ARZI: '@brziarzi',
    BRZI_AI: '@BrziAi'
};

export const ExternalApiService = {
    
    // --- YouTube ---
    fetchYouTubeStats: async () => {
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
            console.error("YouTube Fetch Error", e);
            throw new Error("Failed to fetch YouTube Data");
        }
    },

    // --- Spotify ---
    fetchSpotifyStats: async () => {
        try {
            // 1. Get Token
            const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + btoa(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET)
                },
                body: 'grant_type=client_credentials'
            });

            if (!tokenRes.ok) throw new Error("Spotify Auth Failed");
            const tokenData = await tokenRes.json();
            const accessToken = tokenData.access_token;

            // 2. Get Artist Data
            const artistRes = await fetch(`https://api.spotify.com/v1/artists/${SPOTIFY_ARTIST_ID}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const artistData = await artistRes.json();

            // 3. Get Top Tracks
            const tracksRes = await fetch(`https://api.spotify.com/v1/artists/${SPOTIFY_ARTIST_ID}/top-tracks?market=US`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const tracksData = await tracksRes.json();

            return {
                artist: artistData,
                top_tracks: tracksData.tracks?.map((t: any) => ({
                    name: t.name,
                    popularity: t.popularity,
                    album: t.album.name,
                    release_date: t.album.release_date
                }))
            };

        } catch (e) {
            console.error("Spotify Fetch Error", e);
            throw new Error("Failed to fetch Spotify Data. (Check CORS/Network)");
        }
    }
};
