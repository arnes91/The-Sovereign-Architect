
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { StorageService } from '../../services/storageService';

// Mock Types for YouTube API
interface VideoMetadata {
    title: string;
    description: string;
    tags: string[];
    privacyStatus: 'private' | 'public' | 'unlisted';
}

const UploadDeck: React.FC = () => {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [metadata, setMetadata] = useState<VideoMetadata>({
        title: '',
        description: '',
        tags: [],
        privacyStatus: 'private'
    });
    
    const [status, setStatus] = useState<'IDLE' | 'GENERATING_META' | 'UPLOADING' | 'DONE'>('IDLE');
    const [uploadProgress, setUploadProgress] = useState(0);

    // AI Generation for Metadata
    const generateMetadata = async () => {
        if (!process.env.API_KEY || !videoFile) return;
        setStatus('GENERATING_META');
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                I am uploading a new video to YouTube for the "Brzi Arzi" channel (Music/Tech/Balkan).
                Filename: ${videoFile.name}
                
                Generate optimized YouTube Metadata in JSON format:
                {
                    "title": "Clickbaity but honest title (Max 100 chars)",
                    "description": "Engaging description with timestamps and links.",
                    "tags": ["tag1", "tag2", "tag3"]
                }
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            
            const json = JSON.parse(response.text || "{}");
            setMetadata(prev => ({
                ...prev,
                title: json.title || prev.title,
                description: json.description || prev.description,
                tags: json.tags || prev.tags
            }));
            
        } catch (e) {
            console.error("Meta Gen Error", e);
            alert("Failed to generate metadata via AI.");
        } finally {
            setStatus('IDLE');
        }
    };

    const handleUpload = async () => {
        if (!videoFile) return;
        setStatus('UPLOADING');
        
        // --- REAL IMPLEMENTATION NOTES ---
        // To make this work for real, you need:
        // 1. A Google Cloud Project with YouTube Data API v3 enabled.
        // 2. An OAuth 2.0 Client ID.
        // 3. Use `gapi.client.youtube.videos.insert`
        
        // SIMULATION LOOP
        for (let i = 0; i <= 100; i += 5) {
            setUploadProgress(i);
            await new Promise(r => setTimeout(r, 200)); // Simulate network
        }
        
        setStatus('DONE');
        alert(`UPLOAD COMPLETE!\nVideo sent to channel: Brzi Arzi\nStatus: ${metadata.privacyStatus.toUpperCase()}`);
    };

    return (
        <div className="h-full flex flex-col p-6 max-w-5xl mx-auto">
             <div className="mb-8 border-b border-zinc-800 pb-4">
                <h2 className="text-3xl font-sans font-bold text-white">UPLOAD DECK</h2>
                <p className="text-zinc-500 font-mono text-sm">YouTube Deployment Pipeline</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* LEFT: ASSETS */}
                <div className="space-y-6">
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg">
                        <h3 className="text-cyber-green font-mono text-xs mb-4">1. VIDEO SOURCE (FROM VISUALIZER)</h3>
                        <input 
                            type="file" 
                            accept="video/*"
                            onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                            className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:bg-zinc-800 file:text-white hover:file:bg-zinc-700"
                        />
                        {videoFile && <div className="mt-2 text-xs text-zinc-500">Selected: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)</div>}
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg">
                        <h3 className="text-cyber-purple font-mono text-xs mb-4">2. THUMBNAIL (FROM CONCEPT STUDIO)</h3>
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                            className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:bg-zinc-800 file:text-white hover:file:bg-zinc-700"
                        />
                        {thumbnailFile && (
                            <div className="mt-4">
                                <img src={URL.createObjectURL(thumbnailFile)} className="w-full h-32 object-cover rounded border border-zinc-700" />
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: METADATA */}
                <div className="bg-black border border-zinc-800 p-6 rounded-lg flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4">
                         <h3 className="text-white font-mono text-xs">3. METADATA OPTIMIZATION</h3>
                         <button 
                            onClick={generateMetadata}
                            disabled={!videoFile || status === 'GENERATING_META'}
                            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded font-bold transition-colors disabled:opacity-50"
                         >
                            {status === 'GENERATING_META' ? 'AI THINKING...' : 'GENERATE WITH AI'}
                         </button>
                    </div>

                    <div className="space-y-4 flex-1">
                        <div>
                            <label className="text-xs text-zinc-500 block mb-1">TITLE</label>
                            <input 
                                value={metadata.title}
                                onChange={e => setMetadata(p => ({...p, title: e.target.value}))}
                                className="w-full bg-zinc-900 border border-zinc-700 p-2 text-white text-sm focus:border-indigo-500 outline-none rounded"
                                placeholder="Video Title..."
                            />
                        </div>
                        <div>
                            <label className="text-xs text-zinc-500 block mb-1">DESCRIPTION</label>
                            <textarea 
                                value={metadata.description}
                                onChange={e => setMetadata(p => ({...p, description: e.target.value}))}
                                className="w-full bg-zinc-900 border border-zinc-700 p-2 text-white text-sm h-32 focus:border-indigo-500 outline-none rounded resize-none"
                                placeholder="Video Description..."
                            />
                        </div>
                         <div>
                            <label className="text-xs text-zinc-500 block mb-1">TAGS (COMMA SEPARATED)</label>
                            <input 
                                value={metadata.tags.join(", ")}
                                onChange={e => setMetadata(p => ({...p, tags: e.target.value.split(',').map(t => t.trim())}))}
                                className="w-full bg-zinc-900 border border-zinc-700 p-2 text-white text-sm focus:border-indigo-500 outline-none rounded"
                            />
                        </div>
                         <div>
                            <label className="text-xs text-zinc-500 block mb-1">VISIBILITY</label>
                            <select 
                                value={metadata.privacyStatus}
                                onChange={e => setMetadata(p => ({...p, privacyStatus: e.target.value as any}))}
                                className="bg-zinc-900 border border-zinc-700 text-white text-sm p-2 rounded w-full outline-none"
                            >
                                <option value="private">Private</option>
                                <option value="unlisted">Unlisted</option>
                                <option value="public">Public</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-zinc-800">
                        {status === 'UPLOADING' ? (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-mono text-zinc-400">
                                    <span>UPLOADING TO YOUTUBE...</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div className="h-2 bg-zinc-800 rounded overflow-hidden">
                                    <div className="h-full bg-red-600 transition-all duration-200" style={{width: `${uploadProgress}%`}}></div>
                                </div>
                            </div>
                        ) : (
                            <button 
                                onClick={handleUpload}
                                disabled={!videoFile || !metadata.title}
                                className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded text-xl tracking-widest disabled:opacity-50 disabled:bg-zinc-800 transition-colors"
                            >
                                UPLOAD TO YOUTUBE
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UploadDeck;
