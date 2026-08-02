
import React, { useState, useRef } from 'react';
import { Type } from "@google/genai";
import { getAI, safeApiCall } from '../../services/geminiService';
import { StorageService } from '../../services/storageService';
import { Copy, Download, Music, Image as ImageIcon, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

interface ReleaseMetadata {
    id: string;
    coverImagePrompt: string;
    language: string;
    primaryGenre: string;
    secondaryGenre: string;
    electronicSubgenre: string;
    optimizedTitle: string;
    description: string;
    coverImageUrl?: string;
    timestamp: string;
}

const UploadDeck: React.FC = () => {
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [audioBase64, setAudioBase64] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<ReleaseMetadata | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'ANALYZING' | 'GENERATING_IMAGE' | 'DONE'>('IDLE');
    const [error, setError] = useState<string | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAudioFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                setAudioBase64(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const analyzeAndPrepare = async () => {
        if (!process.env.GEMINI_API_KEY || !audioFile || !audioBase64) {
            setError("Missing API Key or Audio File");
            return;
        }
        
        setStatus('ANALYZING');
        setError(null);
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            
            // Step 1: Analyze Audio & Generate Metadata
            const latestReports = await StorageService.getAnalyticsReports();
            const recentAnalytics = latestReports.length > 0 ? latestReports[0].summary : "No recent analytics available.";
            
            const prompt = `
                You are a "Content Analyzer & Deep Architect" for a music producer (Brzi Arzi).
                Listen to the provided audio track.
                
                Based on the audio, generate optimized metadata for a DistroKid release.
                Use your search tools to find the latest 2025-2026 trends for song titles and genres in this style.
                
                Here is the latest Analytics Strategy Report for context:
                ${recentAnalytics}
                
                Requirements:
                1. coverImagePrompt: A highly detailed, visually striking prompt for an AI image generator to create the cover art (3000x3000 square JPG). Make it epic, cyberpunk, or glitch-core if it fits the vibe.
                2. language: The language of the vocals (or "Instrumental").
                3. primaryGenre: The best matching DistroKid primary genre.
                4. secondaryGenre: The best matching DistroKid secondary genre.
                5. electronicSubgenre: If the genre is electronic, provide the specific subgenre (e.g., Dubstep, House, Techno). Otherwise, leave empty.
                6. optimizedTitle: A catchy, trend-optimized song title.
                7. description: A short, engaging pitch/description of the track.
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-3.1-pro-preview',
                contents: {
                    parts: [
                        { inlineData: { mimeType: audioFile.type || 'audio/mp3', data: audioBase64 } },
                        { text: prompt }
                    ]
                },
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            coverImagePrompt: { type: Type.STRING },
                            language: { type: Type.STRING },
                            primaryGenre: { type: Type.STRING },
                            secondaryGenre: { type: Type.STRING },
                            electronicSubgenre: { type: Type.STRING },
                            optimizedTitle: { type: Type.STRING },
                            description: { type: Type.STRING }
                        },
                        required: ["coverImagePrompt", "language", "primaryGenre", "secondaryGenre", "electronicSubgenre", "optimizedTitle", "description"]
                    }
                }
            });
            
            const json = JSON.parse(response.text || "{}");
            const newMetadata: ReleaseMetadata = {
                id: Date.now().toString(),
                ...json,
                timestamp: new Date().toISOString()
            };
            
            setMetadata(newMetadata);
            setStatus('GENERATING_IMAGE');
            
            // Step 2: Generate Cover Image
            try {
                const ai = getAI();
                const imageResponse = await safeApiCall(async () => await ai.models.generateContent({
                    model: 'gemini-3.1-flash-image',
                    contents: {
                        parts: [{ text: newMetadata.coverImagePrompt }]
                    },
                    config: {
                        imageConfig: {
                            aspectRatio: "1:1",
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
                    newMetadata.coverImageUrl = imageUrl;
                    setMetadata({...newMetadata});
                }
            } catch (imgErr) {
                console.error("Image Generation Error", imgErr);
                // Continue even if image fails
            }
            
            // Step 3: Save to Database
            await StorageService.saveReleaseData(newMetadata);
            
            // Step 4: Save to Knowledge Base
            await StorageService.saveKnowledgeItem({
                id: Date.now().toString(),
                type: 'CONTEXTUAL',
                title: `Release: ${newMetadata.optimizedTitle}`,
                content: `DistroKid Release Package Generated:\n\nTitle: ${newMetadata.optimizedTitle}\nPrimary Genre: ${newMetadata.primaryGenre}\nSecondary Genre: ${newMetadata.secondaryGenre}\nSubgenre: ${newMetadata.electronicSubgenre}\nLanguage: ${newMetadata.language}\n\nDescription:\n${newMetadata.description}\n\nCover Art Prompt:\n${newMetadata.coverImagePrompt}`,
                tags: ['distrokid', 'release', newMetadata.primaryGenre.toLowerCase()],
                createdAt: Date.now()
            });
            
        } catch (e: any) {
            console.error("Pipeline Error", e);
            setError(e.message || "Failed to process release pipeline.");
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
        if (!metadata?.coverImageUrl) return;
        const a = document.createElement('a');
        a.href = metadata.coverImageUrl;
        a.download = `${metadata.optimizedTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_cover.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="h-full flex flex-col p-6 max-w-6xl mx-auto overflow-y-auto">
             <div className="mb-8 border-b border-zinc-800 pb-4">
                <h2 className="text-3xl font-sans font-black text-white tracking-tighter flex items-center gap-3">
                    <Sparkles className="text-indigo-500" size={32} />
                    DISTROKID PIPELINE
                </h2>
                <p className="text-zinc-500 font-mono text-sm mt-1">Automated Audio Analysis, Metadata Optimization & Cover Art Generation</p>
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
                        <h3 className="text-indigo-400 font-mono text-xs font-bold mb-4 flex items-center gap-2">
                            <Music size={16} />
                            1. UPLOAD RAW AUDIO
                        </h3>
                        <div className="relative border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer bg-black/50">
                            <input 
                                type="file" 
                                accept="audio/*"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Music className="mx-auto text-zinc-600 mb-3" size={32} />
                            <p className="text-sm text-zinc-400 font-medium">
                                {audioFile ? audioFile.name : "Drag & Drop or Click to Browse"}
                            </p>
                            {audioFile && (
                                <p className="text-xs text-zinc-600 mt-2 font-mono">
                                    {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            )}
                        </div>
                    </div>

                    <button 
                        onClick={analyzeAndPrepare}
                        disabled={!audioFile || status === 'ANALYZING' || status === 'GENERATING_IMAGE'}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 px-6 rounded-xl tracking-widest disabled:opacity-50 disabled:bg-zinc-800 transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/20"
                    >
                        {status === 'ANALYZING' && <><Loader2 className="animate-spin" size={20} /> ANALYZING AUDIO...</>}
                        {status === 'GENERATING_IMAGE' && <><Loader2 className="animate-spin" size={20} /> GENERATING COVER ART...</>}
                        {status === 'IDLE' && 'INITIALIZE PIPELINE'}
                        {status === 'DONE' && 'RUN AGAIN'}
                    </button>
                    
                    {status !== 'IDLE' && (
                        <div className="bg-black border border-zinc-800 p-4 rounded-xl font-mono text-xs text-zinc-400 space-y-2">
                            <div className={`flex items-center gap-2 ${status === 'ANALYZING' ? 'text-indigo-400 animate-pulse' : 'text-emerald-500'}`}>
                                <CheckCircle2 size={14} /> 1. Deep Audio Analysis
                            </div>
                            <div className={`flex items-center gap-2 ${status === 'GENERATING_IMAGE' ? 'text-indigo-400 animate-pulse' : (status === 'DONE' ? 'text-emerald-500' : 'text-zinc-700')}`}>
                                <CheckCircle2 size={14} /> 2. Cover Art Generation
                            </div>
                            <div className={`flex items-center gap-2 ${status === 'DONE' ? 'text-emerald-500' : 'text-zinc-700'}`}>
                                <CheckCircle2 size={14} /> 3. Database Sync
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: OUTPUT */}
                <div className="lg:col-span-2 space-y-6">
                    {metadata ? (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-zinc-800 bg-black/50 flex justify-between items-center">
                                <h3 className="text-emerald-400 font-mono text-sm font-bold flex items-center gap-2">
                                    <CheckCircle2 size={18} />
                                    RELEASE PACKAGE READY
                                </h3>
                                <span className="text-xs text-zinc-500 font-mono">{new Date(metadata.timestamp).toLocaleString()}</span>
                            </div>
                            
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Cover Art */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                        <ImageIcon size={14} /> Cover Art (3000x3000)
                                    </h4>
                                    {metadata.coverImageUrl ? (
                                        <div className="relative group rounded-lg overflow-hidden border border-zinc-800 aspect-square bg-black">
                                            <img src={metadata.coverImageUrl} alt="Cover Art" className="w-full h-full object-cover" />
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
                                        <div className="aspect-square bg-black border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-600 font-mono text-xs">
                                            {status === 'GENERATING_IMAGE' ? 'GENERATING...' : 'IMAGE FAILED'}
                                        </div>
                                    )}
                                    
                                    <div className="bg-black p-3 rounded border border-zinc-800">
                                        <div className="text-[10px] text-zinc-500 mb-1 uppercase">Image Prompt Used</div>
                                        <p className="text-xs text-zinc-400 line-clamp-3">{metadata.coverImagePrompt}</p>
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
                                    <div className="grid grid-cols-2 gap-4">
                                        <MetadataField 
                                            label="Primary Genre" 
                                            value={metadata.primaryGenre} 
                                            onCopy={() => copyToClipboard(metadata.primaryGenre, 'primary')}
                                            copied={copiedField === 'primary'}
                                        />
                                        <MetadataField 
                                            label="Secondary Genre" 
                                            value={metadata.secondaryGenre} 
                                            onCopy={() => copyToClipboard(metadata.secondaryGenre, 'secondary')}
                                            copied={copiedField === 'secondary'}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <MetadataField 
                                            label="Electronic Subgenre" 
                                            value={metadata.electronicSubgenre || 'N/A'} 
                                            onCopy={() => copyToClipboard(metadata.electronicSubgenre, 'subgenre')}
                                            copied={copiedField === 'subgenre'}
                                        />
                                        <MetadataField 
                                            label="Language" 
                                            value={metadata.language} 
                                            onCopy={() => copyToClipboard(metadata.language, 'language')}
                                            copied={copiedField === 'language'}
                                        />
                                    </div>
                                    <div className="pt-2">
                                        <MetadataField 
                                            label="Pitch / Description" 
                                            value={metadata.description} 
                                            onCopy={() => copyToClipboard(metadata.description, 'desc')}
                                            copied={copiedField === 'desc'}
                                            multiline
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full min-h-[400px] border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-zinc-600 p-8 text-center bg-black/20">
                            <Sparkles size={48} className="mb-4 opacity-20" />
                            <p className="font-mono text-sm">Awaiting Audio Input...</p>
                            <p className="text-xs mt-2 max-w-md">
                                The Deep Architect will analyze your track, research current trends, and generate a complete DistroKid release package including 3000x3000 cover art.
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
        <div className={`bg-black border ${highlight ? 'border-indigo-500/50' : 'border-zinc-800'} rounded p-3 pr-10 text-sm ${highlight ? 'text-white font-bold' : 'text-zinc-300'}`}>
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

export default UploadDeck;
