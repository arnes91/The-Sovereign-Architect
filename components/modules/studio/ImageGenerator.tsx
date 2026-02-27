
import React, { useState, useEffect } from 'react';
import { generateImage } from '../../../services/geminiService';
import { StorageService } from '../../../services/storageService';
import { GeneratedImage } from '../../../types';
import { Icon } from './Icon';
import { LoadingSpinner } from './LoadingSpinner';

type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9" | "2:3" | "3:2" | "21:9" | "1:4" | "1:8" | "4:1" | "8:1";
type ImageSize = "1K" | "2K" | "4K";

const STYLES = [
    { label: 'Cyberpunk', value: ', cyberpunk style, neon lights, high contrast, futuristic' },
    { label: 'Anime', value: ', anime style, studio ghibli, detailed cel shading' },
    { label: 'Photorealistic', value: ', 8k resolution, photorealistic, cinematic lighting, highly detailed' },
    { label: 'Synthwave', value: ', synthwave style, retrowave, magenta and cyan, grid background' },
    { label: 'Oil Painting', value: ', oil painting style, textured brushstrokes, classical composition' }
];

interface ImageGeneratorProps {
    demoTrigger?: string;
}

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({ demoTrigger }) => {
    const [prompt, setPrompt] = useState('An abstract, futuristic album cover art, neon geometric shapes colliding with organic, flowing lines, deep space background, vibrant colors of indigo and magenta. For an electronic music artist.');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [imageSize, setImageSize] = useState<ImageSize>('1K');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<GeneratedImage[]>([]);

    useEffect(() => {
        StorageService.getGeneratedImages().then(setHistory);
    }, [showHistory]);

    // --- DEMO EFFECT ---
    useEffect(() => {
        if (demoTrigger === 'SIMULATE_GEN' && !loading) {
            setLoading(true);
            setPrompt("A futuristic cityscape of Sarajevo, cyberpunk style, neon lights, flying cars, high detail 8k render");
            
            // Fake loading for 2s then show a placeholder result
            setTimeout(() => {
                setLoading(false);
                // Use a reliable placeholder or base64 string if available, for now just a cool placeholder
                setImageUrl("https://image.pollinations.ai/prompt/cyberpunk%20sarajevo%20neon%20lights%20futuristic?width=512&height=512&nologo=true"); 
            }, 3500);
        }
    }, [demoTrigger]);

    const handleGenerate = async () => {
        if (!prompt) return;
        setLoading(true);
        setError(null);
        setImageUrl(null);
        setShowHistory(false);

        try {
            const base64Image = await generateImage(prompt, aspectRatio, imageSize);
            if (!base64Image) throw new Error("No image returned");
            
            const finalUrl = `data:image/jpeg;base64,${base64Image}`;
            setImageUrl(finalUrl);

            // Save to History
            const newItem: GeneratedImage = {
                id: Date.now().toString(),
                url: finalUrl,
                prompt,
                aspectRatio,
                timestamp: Date.now()
            };
            await StorageService.saveGeneratedImage(newItem);
            setHistory(await StorageService.getGeneratedImages()); // Update local state immediately

        } catch (err: any) {
            setError(err.message || 'Failed to generate image.');
        } finally {
            setLoading(false);
        }
    };

    const applyStyle = (styleValue: string) => {
        setPrompt(prev => prev + styleValue);
    };

    const loadFromHistory = (item: GeneratedImage) => {
        setPrompt(item.prompt);
        setAspectRatio(item.aspectRatio as AspectRatio);
        setImageUrl(item.url);
        setShowHistory(false);
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 h-full relative">
            <div className="md:w-1/3 flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-indigo-400">Image Generation</h2>
                    <button 
                        onClick={() => setShowHistory(!showHistory)}
                        className={`text-xs font-mono px-2 py-1 rounded border ${showHistory ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-transparent text-gray-400 border-gray-600'}`}
                    >
                        {showHistory ? 'CLOSE HISTORY' : 'VIEW HISTORY'}
                    </button>
                </div>

                <div>
                    <label htmlFor="img-prompt" className="block text-sm font-medium text-gray-300 mb-1">Prompt</label>
                    <textarea
                        id="img-prompt"
                        rows={5}
                        className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-indigo-500 text-sm"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe the image you want to create..."
                    />
                </div>

                {/* Style Presets */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Style Presets</label>
                    <div className="flex flex-wrap gap-2">
                        {STYLES.map(style => (
                            <button
                                key={style.label}
                                onClick={() => applyStyle(style.value)}
                                className="px-2 py-1 bg-gray-800 border border-gray-700 hover:border-indigo-500 text-xs text-gray-300 rounded transition-colors"
                            >
                                + {style.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
                    <div className="grid grid-cols-4 gap-2">
                        {(["1:1", "3:4", "4:3", "9:16", "16:9", "2:3", "3:2", "21:9"] as AspectRatio[]).map(ar => (
                            <button
                                key={ar}
                                onClick={() => setAspectRatio(ar)}
                                className={`px-2 py-1 text-xs rounded-md transition-colors ${aspectRatio === ar ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                            >
                                {ar}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Image Size</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(["1K", "2K", "4K"] as ImageSize[]).map(size => (
                            <button
                                key={size}
                                onClick={() => setImageSize(size)}
                                className={`px-3 py-2 text-sm rounded-md transition-colors ${imageSize === size ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={loading || !prompt}
                    className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-500 flex items-center justify-center shadow-lg shadow-indigo-500/20"
                >
                    {loading ? <LoadingSpinner /> : <Icon name="image" className="w-5 h-5 mr-2" />}
                    Generate Image
                </button>
            </div>

            {/* Main Preview / History Area */}
            <div className="md:w-2/3 flex-grow bg-gray-900 rounded-lg flex flex-col p-4 relative overflow-hidden">
                {showHistory ? (
                    <div className="absolute inset-0 bg-gray-900 z-10 p-4 overflow-y-auto">
                        <h3 className="text-white font-bold mb-4 sticky top-0 bg-gray-900 py-2 border-b border-gray-800">Generation History (Last 10)</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {history.length === 0 && <p className="text-gray-500">No history found.</p>}
                            {history.map(item => (
                                <div key={item.id} className="bg-gray-800 rounded p-2 border border-gray-700 hover:border-indigo-500 transition-colors cursor-pointer group" onClick={() => loadFromHistory(item)}>
                                    <div className="aspect-square bg-black rounded mb-2 overflow-hidden relative">
                                        <img src={item.url} className="w-full h-full object-cover" loading="lazy" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <span className="text-white text-xs font-bold uppercase tracking-widest border border-white px-3 py-1 rounded">Load Settings</span>
                                        </div>
                                    </div>
                                    <p className="text-gray-400 text-xs line-clamp-2 mb-1">{item.prompt}</p>
                                    <span className="text-[10px] text-indigo-400 font-mono">{item.aspectRatio} • {new Date(item.timestamp).toLocaleTimeString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        {loading && <LoadingSpinner text="Generating..." />}
                        {error && <p className="text-red-400 max-w-md text-center">{error}</p>}
                        {imageUrl && !loading && (
                            <img src={imageUrl} alt="Generated" className="max-w-full max-h-full object-contain rounded-md shadow-2xl" />
                        )}
                        {!loading && !imageUrl && !error && (
                            <div className="text-center opacity-50">
                                <Icon name="image" className="w-16 h-16 mx-auto mb-4 text-gray-600"/>
                                <p className="text-gray-500">Your generated concept will materialize here.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
