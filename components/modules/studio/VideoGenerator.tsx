import React, { useState } from 'react';
import { generateVideo } from '../../../services/geminiService';
import { Icon } from './Icon';
import { LoadingSpinner } from './LoadingSpinner';

type AspectRatio = "16:9" | "9:16";

export const VideoGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('A neon hologram of a cat driving at top speed');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                setImageBase64(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        if (!prompt && !imageBase64) return;
        
        setLoading(true);
        setError(null);
        setVideoUrl(null);
        
        try {
            const url = await generateVideo(prompt, aspectRatio, imageBase64 || undefined, imageFile?.type || undefined);
            if (url) {
                // Fetch the video using the API key
                const paidKey = process.env.API_KEY;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'x-goog-api-key': paidKey as string,
                    },
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const objectUrl = URL.createObjectURL(blob);
                    setVideoUrl(objectUrl);
                } else {
                    throw new Error("Failed to fetch generated video.");
                }
            } else {
                throw new Error("Video generation failed.");
            }
        } catch (err: any) {
            setError(err.message || "An error occurred during video generation.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
            {/* Controls */}
            <div className="lg:col-span-1 space-y-6 bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Prompt</label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-sm text-white h-32 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                        placeholder="Describe the video you want to generate..."
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Starting Image (Optional)</label>
                    <div className="relative border-2 border-dashed border-zinc-700 rounded-lg p-4 text-center hover:border-indigo-500 transition-colors cursor-pointer bg-black/50">
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <p className="text-sm text-zinc-400 font-medium">
                            {imageFile ? imageFile.name : "Upload an image to animate"}
                        </p>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Aspect Ratio</label>
                    <div className="grid grid-cols-2 gap-2">
                        {(['16:9', '9:16'] as AspectRatio[]).map(ratio => (
                            <button
                                key={ratio}
                                onClick={() => setAspectRatio(ratio)}
                                className={`py-2 px-3 rounded text-sm font-medium transition-colors ${
                                    aspectRatio === ratio
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                }`}
                            >
                                {ratio}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={loading || (!prompt && !imageBase64)}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                    {loading ? (
                        <>
                            <LoadingSpinner />
                            <span>Generating (Takes a few mins)...</span>
                        </>
                    ) : (
                        <>
                            <Icon name="video" className="w-5 h-5" />
                            <span>Generate Video</span>
                        </>
                    )}
                </button>

                {error && (
                    <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-400 text-sm">
                        {error}
                    </div>
                )}
            </div>

            {/* Preview */}
            <div className="lg:col-span-2 bg-black rounded-xl border border-zinc-800 flex items-center justify-center overflow-hidden relative min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center space-y-4 text-zinc-500">
                        <LoadingSpinner />
                        <p className="font-mono text-sm">Veo is rendering your video...</p>
                        <p className="text-xs max-w-xs text-center">This process can take a few minutes depending on server load.</p>
                    </div>
                ) : videoUrl ? (
                    <video 
                        src={videoUrl} 
                        controls 
                        autoPlay 
                        loop 
                        className={`w-full h-full object-contain ${aspectRatio === '9:16' ? 'max-w-md mx-auto' : ''}`}
                    />
                ) : (
                    <div className="flex flex-col items-center text-zinc-600">
                        <Icon name="video" className="w-16 h-16 mb-4 opacity-20" />
                        <p className="font-mono text-sm">Awaiting Prompt</p>
                    </div>
                )}
            </div>
        </div>
    );
};
