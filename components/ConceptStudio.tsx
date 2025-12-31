import React, { useState } from 'react';
import { generateImage, editImage } from '../services/geminiService';

const ConceptStudio: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [size, setSize] = useState('1K');
  const [stylePreset, setStylePreset] = useState('NONE');
  const [loading, setLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [mode, setMode] = useState<'GENERATE' | 'EDIT'>('GENERATE');
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const applyPreset = (basePrompt: string) => {
      switch(stylePreset) {
          case 'CYBERPUNK': return `${basePrompt}, cyberpunk aesthetics, neon lights, high contrast, futuristic, glitch art`;
          case 'ANIME': return `${basePrompt}, anime style, studio ghibli inspired, vibrant colors, detailed background`;
          case 'REALISTIC': return `${basePrompt}, photorealistic, 8k resolution, cinematic lighting, highly detailed`;
          case 'VINTAGE': return `${basePrompt}, vintage 90s style, film grain, retro aesthetic, vhs overlay`;
          default: return basePrompt;
      }
  };

  const handleAction = async () => {
    if (!prompt) return;
    setLoading(true);
    try {
        let result: string | null = null;
        let finalPrompt = applyPreset(prompt);
        if (negativePrompt) {
            finalPrompt += ` --negative_prompt ${negativePrompt}`; // Note: Gemini prompt structure varies, appending for context
        }
        
        if (mode === 'GENERATE') {
            result = await generateImage(finalPrompt, aspectRatio, size);
        } else if (mode === 'EDIT' && currentImage) {
            result = await editImage(currentImage, finalPrompt);
        }

        if (result) {
            setCurrentImage(result);
        }
    } catch (e) {
        console.error(e);
        alert("Operation failed. Check API Budget or connectivity.");
    } finally {
        setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setCurrentImage(reader.result as string);
              setMode('EDIT');
          };
          reader.readAsDataURL(file);
      }
  };

  return (
    <div className="h-full flex flex-col p-6 gap-6">
      <div className="flex justify-between items-end border-b border-zinc-800 pb-4">
        <div>
            <h2 className="text-3xl font-sans font-bold text-white mb-2">CONCEPT STUDIO</h2>
            <p className="text-zinc-500 font-mono text-sm">Powered by Nano Banana Pro & Flash Image</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setMode('GENERATE')} 
                className={`px-4 py-2 font-mono text-sm ${mode === 'GENERATE' ? 'bg-cyber-purple text-black' : 'bg-zinc-900 text-zinc-400'}`}
            >
                GENERATE
            </button>
            <button 
                onClick={() => setMode('EDIT')}
                className={`px-4 py-2 font-mono text-sm ${mode === 'EDIT' ? 'bg-cyber-purple text-black' : 'bg-zinc-900 text-zinc-400'}`}
            >
                EDIT
            </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Controls */}
        <div className="bg-zinc-900/50 p-6 border border-zinc-800 flex flex-col gap-6 h-fit overflow-y-auto max-h-full">
            <div className="flex flex-col gap-2">
                <label className="text-xs font-mono text-cyber-green">PROMPT INSTRUCTION</label>
                <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="bg-black border border-zinc-700 p-3 text-sm text-zinc-200 focus:border-cyber-purple outline-none h-24 resize-none font-mono"
                    placeholder={mode === 'GENERATE' ? "Describe the vision..." : "Describe the edit..."}
                />
            </div>
            
            <div className="flex flex-col gap-2">
                <label className="text-xs font-mono text-red-400">NEGATIVE PROMPT (OPTIONAL)</label>
                <input 
                    type="text"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    className="bg-black border border-zinc-700 p-2 text-sm text-zinc-200 focus:border-red-500 outline-none font-mono"
                    placeholder="Blur, low quality, distortion..."
                />
            </div>

            {mode === 'GENERATE' && (
                <>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-mono text-cyber-green">STYLE PRESET</label>
                        <select value={stylePreset} onChange={(e) => setStylePreset(e.target.value)} className="bg-black border border-zinc-700 p-2 text-sm text-zinc-200 font-mono outline-none">
                            <option value="NONE">None (Raw)</option>
                            <option value="CYBERPUNK">Cyberpunk</option>
                            <option value="ANIME">Anime / Ghibli</option>
                            <option value="REALISTIC">Photorealistic</option>
                            <option value="VINTAGE">Vintage / Retro</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-mono text-cyber-green">ASPECT RATIO</label>
                        <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="bg-black border border-zinc-700 p-2 text-sm text-zinc-200 font-mono outline-none">
                            <option value="1:1">1:1 (Square)</option>
                            <option value="16:9">16:9 (Landscape)</option>
                            <option value="9:16">9:16 (Portrait)</option>
                            <option value="21:9">21:9 (Ultrawide)</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-mono text-cyber-green">RESOLUTION</label>
                        <select value={size} onChange={(e) => setSize(e.target.value)} className="bg-black border border-zinc-700 p-2 text-sm text-zinc-200 font-mono outline-none">
                            <option value="1K">1K (Fast)</option>
                            <option value="2K">2K (High Def)</option>
                            <option value="4K">4K (Ultra)</option>
                        </select>
                    </div>
                </>
            )}

            {mode === 'EDIT' && (
                 <div className="flex flex-col gap-2">
                    <label className="text-xs font-mono text-cyber-green">SOURCE IMAGE</label>
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:bg-zinc-800 file:text-white hover:file:bg-zinc-700"
                    />
                 </div>
            )}

            <button 
                onClick={handleAction}
                disabled={loading || (mode === 'EDIT' && !currentImage)}
                className={`py-3 font-bold uppercase tracking-widest transition-all ${loading ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-cyber-purple hover:bg-fuchsia-600 text-black'}`}
            >
                {loading ? 'PROCESSING...' : 'EXECUTE'}
            </button>
        </div>

        {/* Viewport */}
        <div className="lg:col-span-2 bg-black border border-zinc-800 flex items-center justify-center relative overflow-hidden group">
            {currentImage ? (
                <img src={currentImage} alt="Generated" className="max-w-full max-h-full object-contain" />
            ) : (
                <div className="text-zinc-700 font-mono text-center">
                    <p className="mb-2 text-4xl opacity-20">NO SIGNAL</p>
                    <p className="text-xs">AWAITING INPUT STREAM</p>
                </div>
            )}
            
            {/* Overlay Grid */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,18,18,0)_1px,transparent_1px),linear-gradient(90deg,rgba(18,18,18,0)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
        </div>
      </div>
    </div>
  );
};

export default ConceptStudio;
