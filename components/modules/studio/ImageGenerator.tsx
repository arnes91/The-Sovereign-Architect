import React, { useState } from 'react';
import { generateImage } from '../../../services/geminiService';
import { Icon } from './Icon';
import { LoadingSpinner } from './LoadingSpinner';

type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

export const ImageGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('An abstract, futuristic album cover art, neon geometric shapes colliding with organic, flowing lines, deep space background, vibrant colors of indigo and magenta. For an electronic music artist.');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt) return;
        setLoading(true);
        setError(null);
        setImageUrl(null);

        try {
            const base64Image = await generateImage(prompt, aspectRatio);
            if (!base64Image) throw new Error("No image returned");
            setImageUrl(`data:image/jpeg;base64,${base64Image}`);
        } catch (err: any) {
            setError(err.message || 'Failed to generate image.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 h-full">
            <div className="md:w-1/3 flex flex-col space-y-4">
                <h2 className="text-2xl font-bold text-indigo-400">Image Generation</h2>
                <div>
                    <label htmlFor="img-prompt" className="block text-sm font-medium text-gray-300 mb-1">Prompt</label>
                    <textarea
                        id="img-prompt"
                        rows={5}
                        className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-indigo-500"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe the image you want to create..."
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(["1:1", "3:4", "4:3", "9:16", "16:9"] as AspectRatio[]).map(ar => (
                            <button
                                key={ar}
                                onClick={() => setAspectRatio(ar)}
                                className={`px-3 py-2 text-sm rounded-md transition-colors ${aspectRatio === ar ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                            >
                                {ar}
                            </button>
                        ))}
                    </div>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={loading || !prompt}
                    className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-500 flex items-center justify-center"
                >
                    {loading ? <LoadingSpinner /> : <Icon name="image" className="w-5 h-5 mr-2" />}
                    Generate Image
                </button>
            </div>
            <div className="md:w-2/3 flex-grow bg-gray-900 rounded-lg flex items-center justify-center p-4">
                {loading && <LoadingSpinner text="Generating..." />}
                {error && <p className="text-red-400">{error}</p>}
                {imageUrl && <img src={imageUrl} alt="Generated" className="max-w-full max-h-full object-contain rounded-md" />}
                {!loading && !imageUrl && !error && <p className="text-gray-500">Your generated image will appear here.</p>}
            </div>
        </div>
    );
};
