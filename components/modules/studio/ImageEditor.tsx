import React, { useState, useCallback } from 'react';
import { editImage } from '../../../services/geminiService';
import { Icon } from './Icon';
import { LoadingSpinner } from './LoadingSpinner';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });
};

export const ImageEditor: React.FC = () => {
    const [originalImage, setOriginalImage] = useState<{ file: File; url: string; base64: string; mimeType: string } | null>(null);
    const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState("Add the text 'Brzi Arzi - New Single Out Now' in a futuristic, glitchy font at the bottom.");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setEditedImageUrl(null);
            const url = URL.createObjectURL(file);
            const base64 = await fileToBase64(file);
            setOriginalImage({ file, url, base64, mimeType: file.type });
        }
    }, []);

    const handleEdit = async () => {
        if (!originalImage || !prompt) return;
        setLoading(true);
        setError(null);
        setEditedImageUrl(null);
        try {
            const editedBase64 = await editImage(originalImage.base64, originalImage.mimeType, prompt);
            if (!editedBase64) throw new Error("No image returned");
            setEditedImageUrl(`data:image/png;base64,${editedBase64}`);
        } catch (err: any) {
            setError(err.message || 'Failed to edit image.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <h2 className="text-2xl font-bold mb-4 text-indigo-400">AI Image Editor</h2>
            <div className="flex-grow grid md:grid-cols-2 gap-6">
                <div className="flex flex-col space-y-4">
                    <div className="flex-grow bg-gray-900 rounded-lg flex items-center justify-center p-4 border-2 border-dashed border-gray-600">
                        {originalImage ? (
                            <img src={originalImage.url} alt="Original" className="max-h-full max-w-full object-contain rounded-md" />
                        ) : (
                            <div className="text-center">
                                <Icon name="upload" className="w-12 h-12 mx-auto text-gray-500 mb-2"/>
                                <p className="text-gray-400">Upload an image to start</p>
                            </div>
                        )}
                    </div>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                    <textarea
                        rows={3}
                        className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-indigo-500"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe your edits, e.g., 'Make the background blurry'"
                        disabled={!originalImage}
                    />
                    <button
                        onClick={handleEdit}
                        disabled={loading || !prompt || !originalImage}
                        className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-500 flex items-center justify-center"
                    >
                        {loading ? <LoadingSpinner /> : <Icon name="edit" className="w-5 h-5 mr-2" />}
                        Apply Edit
                    </button>
                </div>
                <div className="bg-gray-900 rounded-lg flex items-center justify-center p-4">
                     {loading && <LoadingSpinner text="Editing..." />}
                     {error && <p className="text-red-400">{error}</p>}
                     {editedImageUrl && <img src={editedImageUrl} alt="Edited" className="max-h-full max-w-full object-contain rounded-md" />}
                     {!loading && !editedImageUrl && !error && <p className="text-gray-500">Your edited image will appear here.</p>}
                </div>
            </div>
        </div>
    );
};
