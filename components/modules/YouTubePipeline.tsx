import React, { useState } from 'react';
import { Type } from "@google/genai";
import { StorageService } from '../../services/storageService';
import { safeApiCall, getAI } from '../../services/geminiService';
import { getAccessToken, googleSignIn } from '../../services/workspaceService';
import { Copy, Download, Video, Image as ImageIcon, CheckCircle2, Loader2, Sparkles, Youtube } from 'lucide-react';
import { useAppOrchestrator } from '../../context/AppOrchestratorContext';

interface YouTubeMetadata {
    id: string;
    thumbnailPrompt: string;
    optimizedTitle: string;
    description: string;
    tags: string;
    thumbnailUrl?: string;
    timestamp: string;
}

const YouTubePipeline: React.FC = () => {
    const { logAnalytics } = useAppOrchestrator();
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaBase64, setMediaBase64] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<YouTubeMetadata | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'ANALYZING' | 'GENERATING_IMAGE' | 'DONE'>('IDLE');
    const [error, setError] = useState<string | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMediaFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                setMediaBase64(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const analyzeAndPrepare = async () => {
        if (!process.env.GEMINI_API_KEY || !mediaFile || !mediaBase64) {
            setError("Missing API Key or Media File");
            return;
        }
        
        setStatus('ANALYZING');
        setError(null);
        
        try {
            const ai = getAI();
            
            // Step 1: Analyze Media & Generate Metadata
            const latestReports = await StorageService.getAnalyticsReports();
            const recentAnalytics = latestReports.length > 0 ? latestReports[0].summary : "No recent analytics available.";
            
            const prompt = `
                You are a "YouTube SEO & Content Strategist" for a music producer/creator (Brzi Arzi).
                Analyze the provided media file (audio or video).
                
                Based on the content, generate optimized metadata for a YouTube upload.
                Use your search tools to find the latest 2025-2026 trends for YouTube titles, descriptions, and tags in this niche.
                
                Here is the latest Analytics Strategy Report for context:
                ${recentAnalytics}
                
                Requirements:
                1. thumbnailPrompt: A highly detailed, visually striking prompt for an AI image generator to create the YouTube thumbnail (16:9 aspect ratio). Make it eye-catching, high contrast, and click-worthy.
                2. optimizedTitle: A catchy, high-CTR, trend-optimized YouTube video title (under 100 characters, ideally under 60).
                3. description: A comprehensive YouTube description including a hook, details about the track/video, and relevant hashtags.
                4. tags: A comma-separated list of highly relevant, high-volume search tags (max 500 characters total).
            `;
            
            const response = await safeApiCall(async () => await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [
                        { inlineData: { mimeType: mediaFile.type || 'audio/mp3', data: mediaBase64 } },
                        { text: prompt }
                    ]
                },
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            thumbnailPrompt: { type: Type.STRING },
                            optimizedTitle: { type: Type.STRING },
                            description: { type: Type.STRING },
                            tags: { type: Type.STRING }
                        },
                        required: ["thumbnailPrompt", "optimizedTitle", "description", "tags"]
                    }
                }
            }));
            
            const json = JSON.parse(response.text || "{}");
            const newMetadata: YouTubeMetadata = {
                id: (Date.now() + Math.random()).toString(),
                ...json,
                timestamp: new Date().toISOString()
            };
            
            setMetadata(newMetadata);
            setStatus('GENERATING_IMAGE');
            logAnalytics('YOUTUBE_METADATA_GENERATED', newMetadata.optimizedTitle, newMetadata);
            
            
            // Step 2: Generate Thumbnail Image
            try {
                const ai = getAI();
                const imageResponse = await safeApiCall(async () => await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: {
                        parts: [{ text: newMetadata.thumbnailPrompt }]
                    },
                    config: {
                        imageConfig: {
                            aspectRatio: "16:9",
                            imageSize: "2K"
                        }
                    }
                }));
                
                let imageUrl = '';
                for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
                    if (part.inlineData) {
                        imageUrl = `data:image/jpeg;base64,${part.inlineData.data}`;
                        break;
                    }
                }
                
                if (imageUrl) {
                    newMetadata.thumbnailUrl = imageUrl;
                    setMetadata({...newMetadata});
                }
            } catch (imgErr) {
                console.error("Image Generation Error", imgErr);
                // Continue even if image fails
            }
            
            // Step 3: Save to Knowledge Base
            await StorageService.saveKnowledgeItem({
                id: (Date.now() + Math.random()).toString(),
                type: 'CONTEXTUAL',
                title: `YouTube Release: ${newMetadata.optimizedTitle}`,
                content: `YouTube Release Package Generated:\n\nTitle: ${newMetadata.optimizedTitle}\n\nTags: ${newMetadata.tags}\n\nDescription:\n${newMetadata.description}\n\nThumbnail Prompt:\n${newMetadata.thumbnailPrompt}`,
                tags: ['youtube', 'release', 'video'],
                createdAt: Date.now()
            });
            
        } catch (e: any) {
            console.error("Pipeline Error", e);
            setError(e.message || "Failed to process YouTube pipeline.");
        } finally {
            setStatus('DONE');
        }
    };

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const downloadImage = () => {
        if (!metadata?.thumbnailUrl) return;
        const a = document.createElement('a');
        a.href = metadata.thumbnailUrl;
        a.download = `${metadata.optimizedTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_thumbnail.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const uploadToYouTube = async () => {
        if (!metadata || !mediaFile) return;
        
        try {
            // Check if user is authenticated with Google
            let accessToken = await getAccessToken();
            if (!accessToken) {
                const signInResult = await googleSignIn();
                if (signInResult) {
                    accessToken = signInResult.accessToken;
                } else {
                    alert("Please authenticate with Google first.");
                    return;
                }
            }

            setStatus('ANALYZING'); // Reusing status for loading state
            
            addLog("Initiating YouTube Upload Protocol...");
            
            // ACTUAL API UPLOAD LOGIC (Ready for production with real token)
            addLog("Authenticating with YouTube Data API v3...");
            const formData = new FormData();
            formData.append('snippet', new Blob([JSON.stringify({
                snippet: { 
                    title: metadata.optimizedTitle, 
                    description: metadata.description, 
                    tags: metadata.tags.split(',').map(t => t.trim()), 
                    categoryId: '10' // Music
                },
                status: { privacyStatus: 'private' } // Private for testing
            })], { type: 'application/json' }));
            
            formData.append('video', mediaFile);
            
            addLog("Uploading to YouTube servers...");
            const response = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}` },
                body: formData
            });
            
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`YouTube API Error: ${response.statusText} - ${errText}`);
            }
            
            const data = await response.json();
            addLog(`Upload successful! Video ID: ${data.id}`);
            
            if (metadata.thumbnailUrl) {
                addLog("Uploading custom thumbnail...");
                try {
                    const base64Parts = metadata.thumbnailUrl.split(';base64,');
                    const raw = window.atob(base64Parts[1]);
                    const rawLength = raw.length;
                    const uInt8Array = new Uint8Array(rawLength);
                    for (let i = 0; i < rawLength; ++i) {
                        uInt8Array[i] = raw.charCodeAt(i);
                    }
                    const thumbBlob = new Blob([uInt8Array], { type: 'image/jpeg' });
                    
                    const thumbResponse = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${data.id}`, {
                        method: 'POST',
                        headers: { 
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'image/jpeg'
                        },
                        body: thumbBlob
                    });
                    
                    if (!thumbResponse.ok) {
                        const errText = await thumbResponse.text();
                        console.warn(`Thumbnail upload failed: ${thumbResponse.statusText} - ${errText}`);
                        addLog("Warning: Custom thumbnail upload failed. Using auto-generated thumbnail.");
                    } else {
                        addLog("Custom thumbnail uploaded successfully!");
                    }
                } catch (thumbErr) {
                    console.error("Thumbnail Upload Error:", thumbErr);
                    addLog("Warning: Could not upload thumbnail.");
                }
            }
            
            alert("Video successfully uploaded to YouTube!");
            setStatus('DONE');
        } catch (err: any) {
            console.error("Upload Error:", err);
            addLog(`CRITICAL ERROR: ${err.message}`);
            alert(`Upload failed: ${err.message}`);
            setStatus('DONE');
        }
    };

    const [uploadLogs, setUploadLogs] = useState<string[]>([]);
    const addLog = (msg: string) => setUploadLogs(prev => [...prev, msg]);

    return (
        <div className="h-full flex flex-col p-6 max-w-6xl mx-auto overflow-y-auto">
             <div className="mb-8 border-b border-zinc-800 pb-4">
                <h2 className="text-3xl font-sans font-black text-white tracking-tighter flex items-center gap-3">
                    <Youtube className="text-red-500" size={32} />
                    YOUTUBE PIPELINE
                </h2>
                <p className="text-zinc-500 font-mono text-sm mt-1">Automated Media Analysis, SEO Optimization & Thumbnail Generation</p>
            </div>
            
            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6 text-sm font-mono">
                    ERROR: {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT: INPUT & CONTROLS */}
                <div className="space-y-6 lg:col-span-1">
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-xl">
                        <h3 className="text-red-400 font-mono text-xs font-bold mb-4 flex items-center gap-2">
                            <Video size={16} />
                            1. UPLOAD MEDIA (AUDIO/VIDEO)
                        </h3>
                        <div className="relative border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center hover:border-red-500 transition-colors cursor-pointer bg-black/50">
                            <input 
                                type="file" 
                                accept="audio/*,video/*"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Video className="mx-auto text-zinc-600 mb-3" size={32} />
                            <p className="text-sm text-zinc-400 font-medium">
                                {mediaFile ? mediaFile.name : "Drag & Drop or Click to Browse"}
                            </p>
                            {mediaFile && (
                                <p className="text-xs text-zinc-600 mt-2 font-mono">
                                    {(mediaFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            )}
                        </div>
                    </div>

                    <button 
                        onClick={analyzeAndPrepare}
                        disabled={!mediaFile || status === 'ANALYZING' || status === 'GENERATING_IMAGE'}
                        className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 px-6 rounded-xl tracking-widest disabled:opacity-50 disabled:bg-zinc-800 transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-500/20"
                    >
                        {status === 'ANALYZING' && <><Loader2 className="animate-spin" size={20} /> ANALYZING MEDIA...</>}
                        {status === 'GENERATING_IMAGE' && <><Loader2 className="animate-spin" size={20} /> GENERATING THUMBNAIL...</>}
                        {status === 'IDLE' && 'INITIALIZE PIPELINE'}
                        {status === 'DONE' && 'RUN AGAIN'}
                    </button>
                    
                    {status !== 'IDLE' && (
                        <div className="bg-black border border-zinc-800 p-4 rounded-xl font-mono text-xs text-zinc-400 space-y-2">
                            <div className={`flex items-center gap-2 ${status === 'ANALYZING' ? 'text-red-400 animate-pulse' : 'text-emerald-500'}`}>
                                <CheckCircle2 size={14} /> 1. Deep Media Analysis
                            </div>
                            <div className={`flex items-center gap-2 ${status === 'GENERATING_IMAGE' ? 'text-red-400 animate-pulse' : (status === 'DONE' ? 'text-emerald-500' : 'text-zinc-700')}`}>
                                <CheckCircle2 size={14} /> 2. Thumbnail Generation
                            </div>
                            <div className={`flex items-center gap-2 ${status === 'DONE' ? 'text-emerald-500' : 'text-zinc-700'}`}>
                                <CheckCircle2 size={14} /> 3. Knowledge Base Sync
                            </div>
                        </div>
                    )}

                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-xl mt-6">
                        <h3 className="text-zinc-400 font-mono text-xs font-bold mb-2 flex items-center gap-2">
                            <Youtube size={16} />
                            YOUTUBE API INTEGRATION
                        </h3>
                        <p className="text-xs text-zinc-500 mb-4">
                            To enable direct uploading to YouTube, you must configure the YouTube Data API v3 in your Google Cloud Console and set the OAuth credentials.
                        </p>
                        <div className="bg-black p-3 rounded border border-zinc-800 font-mono text-[10px] text-zinc-400">
                            Required Scopes:<br/>
                            - https://www.googleapis.com/auth/youtube.upload<br/>
                            - https://www.googleapis.com/auth/youtube.readonly
                        </div>
                    </div>
                </div>

                {/* RIGHT: OUTPUT */}
                <div className="lg:col-span-2 space-y-6">
                    {metadata ? (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-zinc-800 bg-black/50 flex justify-between items-center">
                                <h3 className="text-emerald-400 font-mono text-sm font-bold flex items-center gap-2">
                                    <CheckCircle2 size={18} />
                                    YOUTUBE PACKAGE READY
                                </h3>
                                <span className="text-xs text-zinc-500 font-mono">{new Date(metadata.timestamp).toLocaleString()}</span>
                            </div>
                            
                            <div className="p-6 grid grid-cols-1 gap-8">
                                {/* Thumbnail */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                        <ImageIcon size={14} /> Thumbnail (16:9)
                                    </h4>
                                    {metadata.thumbnailUrl ? (
                                        <div className="relative group rounded-lg overflow-hidden border border-zinc-800 aspect-video bg-black">
                                            <img src={metadata.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                <button 
                                                    onClick={downloadImage}
                                                    className="bg-white text-black px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:scale-105 transition-transform"
                                                >
                                                    <Download size={16} /> DOWNLOAD JPG
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="aspect-video bg-black border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-600 font-mono text-xs">
                                            {status === 'GENERATING_IMAGE' ? 'GENERATING...' : 'IMAGE FAILED'}
                                        </div>
                                    )}
                                    
                                    <div className="bg-black p-3 rounded border border-zinc-800">
                                        <div className="text-[10px] text-zinc-500 mb-1 uppercase">Image Prompt Used</div>
                                        <p className="text-xs text-zinc-400 line-clamp-3">{metadata.thumbnailPrompt}</p>
                                    </div>
                                </div>

                                {/* Metadata Fields */}
                                <div className="space-y-4">
                                    <MetadataField 
                                        label="Optimized Title" 
                                        value={metadata.optimizedTitle} 
                                        onCopy={() => copyToClipboard(metadata.optimizedTitle, 'title')}
                                        copied={copiedField === 'title'}
                                        highlight
                                    />
                                    <MetadataField 
                                        label="Tags (Comma Separated)" 
                                        value={metadata.tags} 
                                        onCopy={() => copyToClipboard(metadata.tags, 'tags')}
                                        copied={copiedField === 'tags'}
                                    />
                                    <div className="pt-2">
                                        <MetadataField 
                                            label="YouTube Description" 
                                            value={metadata.description} 
                                            onCopy={() => copyToClipboard(metadata.description, 'desc')}
                                            copied={copiedField === 'desc'}
                                            multiline
                                        />
                                    </div>
                                    
                                    <div className="pt-6 border-t border-zinc-800">
                                        <button
                                            onClick={uploadToYouTube}
                                            disabled={status === 'ANALYZING' || status === 'GENERATING_IMAGE'}
                                            className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 px-6 rounded-xl tracking-widest disabled:opacity-50 disabled:bg-zinc-800 transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-500/20"
                                        >
                                            <Youtube size={20} />
                                            PUBLISH TO YOUTUBE
                                        </button>
                                        
                                        {uploadLogs.length > 0 && (
                                            <div className="mt-4 bg-black border border-zinc-800 p-4 rounded-xl font-mono text-xs text-zinc-400 space-y-2 max-h-40 overflow-y-auto">
                                                {uploadLogs.map((log, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <span className="text-emerald-500">►</span> {log}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full min-h-[400px] border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-zinc-600 p-8 text-center bg-black/20">
                            <Youtube size={48} className="mb-4 opacity-20" />
                            <p className="font-mono text-sm">Awaiting Media Input...</p>
                            <p className="text-xs mt-2 max-w-md">
                                The Deep Architect will analyze your media, research current YouTube trends, and generate a complete SEO-optimized release package including a 16:9 thumbnail.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const MetadataField: React.FC<{
    label: string;
    value: string;
    onCopy: () => void;
    copied: boolean;
    highlight?: boolean;
    multiline?: boolean;
}> = ({ label, value, onCopy, copied, highlight, multiline }) => (
    <div className="relative group">
        <label className="text-[10px] font-bold text-zinc-500 block mb-1 uppercase tracking-wider">{label}</label>
        <div className={`bg-black border ${highlight ? 'border-red-500/50' : 'border-zinc-800'} rounded p-3 pr-10 text-sm ${highlight ? 'text-white font-bold' : 'text-zinc-300'}`}>
            {multiline ? (
                <p className="whitespace-pre-wrap text-xs leading-relaxed">{value}</p>
            ) : (
                <p className="truncate">{value}</p>
            )}
        </div>
        <button 
            onClick={onCopy}
            className={`absolute right-2 top-6 p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors ${copied ? 'text-emerald-400' : 'text-zinc-400'}`}
            title="Copy to clipboard"
        >
            {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
        </button>
    </div>
);

export default YouTubePipeline;
