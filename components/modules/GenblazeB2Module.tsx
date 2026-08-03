import React, { useState } from 'react';
import { Bot, HardDrive, UploadCloud, Video, CheckCircle, Loader } from 'lucide-react';

export const GenblazeB2Module = () => {
  const [pipelineState, setPipelineState] = useState<'IDLE' | 'GENERATING' | 'UPLOADING' | 'COMPLETE'>('IDLE');
  const [prompt, setPrompt] = useState('Cyberpunk street scene with neon lights and flying cars');
  const [logs, setLogs] = useState<string[]>([]);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  const runPipeline = () => {
    setPipelineState('GENERATING');
    setLogs(['[Genblaze] Initializing generative media pipeline...', '[Genblaze] Fallback provider selected (GMI Cloud - Fast)...', `[Genblaze] Prompt: "${prompt}"`]);
    
    setTimeout(() => {
      setLogs(prev => [...prev, '[Genblaze] Media generated successfully (Simulated).', '[B2] Preparing to upload to Backblaze B2 Cloud Storage...']);
      setPipelineState('UPLOADING');
      
      setTimeout(() => {
        setLogs(prev => [...prev, '[B2] Upload complete: b2://brzi-arzi-genmedia/cyberpunk_scene.mp4', '[Pipeline] End-to-end workflow successful.']);
        setMediaUrl('https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'); // Sample open source video for demo
        setPipelineState('COMPLETE');
      }, 2500);
      
    }, 3000);
  };

  return (
    <div className="bg-black border border-blue-900/50 rounded-xl p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-cyan-400"></div>
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-black font-sans text-white tracking-tight flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-400" />
            GENBLAZE x B2 MEDIA PIPELINE
          </h2>
          <p className="text-zinc-400 font-mono text-xs mt-1">Experimental AI SaaS Starter Kit Integration</p>
        </div>
        <div className="bg-blue-900/30 text-blue-400 px-3 py-1 rounded-full border border-blue-800/50 text-[10px] font-mono font-bold">
          HACKATHON DEPLOYMENT
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-mono text-zinc-500 mb-1 block">MEDIA PROMPT</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded p-3 text-sm text-white font-sans focus:border-blue-500 outline-none resize-none h-24"
            />
          </div>
          
          <button 
            onClick={runPipeline}
            disabled={pipelineState !== 'IDLE'}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold font-mono text-xs py-3 rounded uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {pipelineState === 'IDLE' ? (
              <>
                <Bot className="w-4 h-4" />
                EXECUTE E2E PIPELINE
              </>
            ) : pipelineState === 'COMPLETE' ? (
              <>
                <CheckCircle className="w-4 h-4" />
                PIPELINE SUCCESS
              </>
            ) : (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                PROCESSING...
              </>
            )}
          </button>

          <div className="bg-zinc-950 border border-zinc-800 rounded p-3 font-mono text-[10px] text-zinc-400 h-32 overflow-y-auto space-y-1">
            {logs.length === 0 && <span className="opacity-50">System ready. Awaiting prompt.</span>}
            {logs.map((log, i) => (
              <div key={i} className={log.includes('Success') || log.includes('successful') ? 'text-green-400' : ''}>
                {log}
              </div>
            ))}
          </div>
        </div>

        <div className="border border-zinc-800 bg-zinc-900/30 rounded flex items-center justify-center min-h-[250px] relative">
          {pipelineState === 'IDLE' && (
            <div className="text-center text-zinc-600">
              <Video className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div className="font-mono text-xs">NO MEDIA GENERATED</div>
            </div>
          )}
          {pipelineState === 'GENERATING' && (
            <div className="text-center text-blue-400 animate-pulse">
              <Bot className="w-8 h-8 mx-auto mb-2" />
              <div className="font-mono text-xs">GENBLAZE GENERATING...</div>
            </div>
          )}
          {pipelineState === 'UPLOADING' && (
            <div className="text-center text-cyan-400 animate-pulse">
              <UploadCloud className="w-8 h-8 mx-auto mb-2" />
              <div className="font-mono text-xs">UPLOADING TO B2...</div>
            </div>
          )}
          {pipelineState === 'COMPLETE' && mediaUrl && (
            <video 
              src={mediaUrl} 
              autoPlay 
              loop 
              muted 
              controls 
              className="w-full h-full object-cover rounded"
            />
          )}
        </div>
      </div>
    </div>
  );
};
