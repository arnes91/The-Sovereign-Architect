import React, { useState } from 'react';
import { generateMusicalConcept } from '../../services/geminiService';

const AIComposer: React.FC = () => {
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('');
  const [elements, setElements] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'ERROR'>('IDLE');
  const [result, setResult] = useState<any | null>(null);

  const handleCompose = async () => {
    if (!genre || !mood) return;
    setStatus('PROCESSING');
    try {
      const data = await generateMusicalConcept(genre, mood, elements);
      setResult(data);
      setStatus('IDLE');
    } catch (e) {
      console.error(e);
      setStatus('ERROR');
    }
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6 border-b border-zinc-800 pb-4">
        <h2 className="text-3xl font-sans font-bold text-white">AI COMPOSER</h2>
        <p className="text-zinc-500 font-mono text-sm">Gemini-Powered Musical Ideation</p>
      </div>

      <div className="flex-1 bg-zinc-900/30 border border-zinc-800 rounded-lg p-6 relative overflow-hidden flex flex-col md:flex-row gap-6">
        
        {status === 'PROCESSING' && (
           <div className="absolute inset-0 bg-black/80 z-20 flex items-center justify-center backdrop-blur-sm">
             <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-cyber-green border-t-transparent rounded-full animate-spin mb-4"></div>
                <div className="text-cyber-green font-mono animate-pulse">COMPOSING...</div>
             </div>
           </div>
        )}

        {/* Controls */}
        <div className="w-full md:w-1/3 flex flex-col gap-4 bg-black p-6 border border-zinc-800 rounded-lg h-fit">
            <h3 className="text-sm font-mono text-cyber-purple mb-2">PARAMETERS</h3>
            
            <div className="flex flex-col gap-2">
                <label className="text-xs text-zinc-400">GENRE</label>
                <input 
                    type="text" 
                    value={genre} 
                    onChange={e => setGenre(e.target.value)}
                    placeholder="e.g., Cyberpunk Phonk, Lo-Fi"
                    className="bg-zinc-900 border border-zinc-700 p-2 text-white text-sm focus:border-cyber-purple outline-none"
                />
            </div>
            
            <div className="flex flex-col gap-2">
                <label className="text-xs text-zinc-400">MOOD</label>
                <input 
                    type="text" 
                    value={mood} 
                    onChange={e => setMood(e.target.value)}
                    placeholder="e.g., Aggressive, Melancholic"
                    className="bg-zinc-900 border border-zinc-700 p-2 text-white text-sm focus:border-cyber-purple outline-none"
                />
            </div>
            
            <div className="flex flex-col gap-2">
                <label className="text-xs text-zinc-400">KEY ELEMENTS</label>
                <textarea 
                    value={elements} 
                    onChange={e => setElements(e.target.value)}
                    placeholder="e.g., Heavy 808s, ethereal female vocals, distorted synth lead"
                    className="bg-zinc-900 border border-zinc-700 p-2 text-white text-sm h-24 resize-none focus:border-cyber-purple outline-none"
                />
            </div>

            <button 
              onClick={handleCompose}
              disabled={status === 'PROCESSING'}
              className="bg-cyber-purple hover:bg-fuchsia-600 text-black font-bold py-3 mt-4 rounded uppercase tracking-widest font-mono transition-all"
            >
              GENERATE IDEA
            </button>
        </div>

        {/* Output */}
        <div className="flex-1 bg-black p-6 border border-zinc-800 rounded-lg overflow-y-auto">
            {result ? (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="border-b border-zinc-800 pb-4">
                        <h1 className="text-3xl font-bold text-white mb-1">{result.title}</h1>
                        <div className="flex gap-4 text-xs font-mono text-cyber-green">
                            <span>{result.bpm} BPM</span>
                            <span>KEY: {result.key}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-zinc-900/50 p-4 rounded">
                            <h4 className="text-xs font-mono text-zinc-500 mb-2">CHORD PROGRESSION</h4>
                            <p className="text-lg font-mono text-white">{result.chordProgression}</p>
                        </div>
                        <div className="bg-zinc-900/50 p-4 rounded">
                            <h4 className="text-xs font-mono text-zinc-500 mb-2">INSTRUMENTATION</h4>
                            <div className="flex flex-wrap gap-2">
                                {result.instruments?.map((inst: string, i: number) => (
                                    <span key={i} className="bg-zinc-800 px-2 py-1 text-xs text-zinc-300 rounded border border-zinc-700">{inst}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {result.lyrics && result.lyrics !== "N/A" && (
                        <div className="bg-zinc-900/30 p-4 rounded border border-zinc-800">
                            <h4 className="text-xs font-mono text-zinc-500 mb-2">LYRIC SKETCH</h4>
                            <p className="font-serif italic text-zinc-300 whitespace-pre-wrap">{result.lyrics}</p>
                        </div>
                    )}

                    <div className="bg-zinc-900/30 p-4 rounded border border-zinc-800">
                         <h4 className="text-xs font-mono text-zinc-500 mb-2">PRODUCTION NOTES</h4>
                         <p className="text-sm text-zinc-300">{result.productionNotes}</p>
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50">
                    <div className="mb-4 text-6xl">♫</div>
                    <p className="font-mono text-sm">Awaiting Composition Parameters</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AIComposer;
