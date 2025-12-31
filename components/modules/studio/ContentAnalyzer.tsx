import React, { useState, useCallback } from 'react';
import { analyzeImage, analyzeVideo, transcribeAudio, complexAnalysis } from '../../../services/geminiService';
import { Icon } from './Icon';
import { LoadingSpinner } from './LoadingSpinner';

type FileType = 'image' | 'video' | 'audio';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });
};

export const ContentAnalyzer: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [fileType, setFileType] = useState<FileType | null>(null);
    const [prompt, setPrompt] = useState('Describe this content in detail.');
    const [useThinkingMode, setUseThinkingMode] = useState(false);
    const [result, setResult] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setResult('');
            setError(null);
            if (selectedFile.type.startsWith('image/')) {
                setFileType('image');
                setPrompt("Analyze this image for its mood, color palette, and composition. Suggest how it could be used as album art or promotional material for an electronic music artist.");
            } else if (selectedFile.type.startsWith('video/')) {
                setFileType('video');
                setPrompt("Analyze this music video. Identify key visual themes, pacing, and moments that would be good for creating short promotional clips for social media.");
            } else if (selectedFile.type.startsWith('audio/')) {
                setFileType('audio');
                setPrompt("Transcribe the lyrics from this song. Identify the chorus and bridge sections.");
            } else {
                setFileType(null);
            }
        }
    }, []);

    const handleAnalyze = async () => {
        if (!file || !fileType || !prompt) return;
        setLoading(true);
        setError(null);
        setResult('');

        try {
            const base64Data = await fileToBase64(file);
            let analysisResult = '';

            if (useThinkingMode) {
                 analysisResult = await complexAnalysis(prompt, { data: base64Data, mimeType: file.type });
            } else {
                switch (fileType) {
                    case 'image':
                        analysisResult = await analyzeImage(prompt, { data: base64Data, mimeType: file.type });
                        break;
                    case 'video':
                        analysisResult = await analyzeVideo(prompt, { data: base64Data, mimeType: file.type });
                        break;
                    case 'audio':
                        analysisResult = await transcribeAudio(prompt, { data: base64Data, mimeType: file.type });
                        break;
                }
            }
            setResult(analysisResult);
        } catch (err: any) {
            setError(err.message || 'Failed to analyze content.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <h2 className="text-2xl font-bold mb-4 text-indigo-400">Content Analyzer</h2>
            <div className="flex flex-col md:flex-row gap-6 flex-grow">
                <div className="md:w-1/3 flex flex-col space-y-4">
                    <div>
                        <label htmlFor="file-upload" className="block text-sm font-medium text-gray-300 mb-1">Upload Content</label>
                        <input id="file-upload" type="file" accept="image/*,video/*,audio/*" onChange={handleFileChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                        {file && <p className="text-xs text-gray-400 mt-1">Selected: {file.name}</p>}
                    </div>
                    <div>
                        <label htmlFor="analyze-prompt" className="block text-sm font-medium text-gray-300 mb-1">Analysis Prompt</label>
                        <textarea id="analyze-prompt" rows={4} className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="What should the AI look for?"/>
                    </div>
                    <div className="flex items-center space-x-2 bg-gray-700 p-3 rounded-lg">
                        <Icon name="tools" className="w-6 h-6 text-yellow-400"/>
                        <div className="flex-grow">
                            <label htmlFor="thinking-mode" className="font-semibold text-white">Thinking Mode</label>
                            <p className="text-xs text-gray-400">Use Gemini 3.0 Pro for complex analysis.</p>
                        </div>
                        <input
                            id="thinking-mode"
                            type="checkbox"
                            checked={useThinkingMode}
                            onChange={(e) => setUseThinkingMode(e.target.checked)}
                            className="h-5 w-5 rounded bg-gray-600 border-gray-500 text-indigo-500 focus:ring-indigo-600"
                        />
                    </div>
                    <button onClick={handleAnalyze} disabled={loading || !file} className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-500 flex items-center justify-center">
                        {loading ? <LoadingSpinner/> : <Icon name="analyze" className="w-5 h-5 mr-2"/>}
                        Analyze
                    </button>
                </div>
                <div className="md:w-2/3 flex-grow bg-gray-900 rounded-lg p-4 overflow-y-auto">
                    {loading && <div className="flex items-center justify-center h-full"><LoadingSpinner text="Analyzing..."/></div>}
                    {error && <p className="text-red-400">{error}</p>}
                    {result && <pre className="text-gray-300 whitespace-pre-wrap font-sans text-sm">{result}</pre>}
                    {!loading && !result && !error && <p className="text-gray-500 text-center mt-8">Analysis results will appear here.</p>}
                </div>
            </div>
        </div>
    );
};
