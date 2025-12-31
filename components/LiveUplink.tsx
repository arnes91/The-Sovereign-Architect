import React, { useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { arrayBufferToBase64, decodePCM } from '../services/geminiService';

const LiveUplink: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Audio Context Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  const addLog = (msg: string) => setLog(prev => [...prev.slice(-4), msg]);

  const connect = async () => {
    try {
      addLog("Initializing Neural Link...");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Simple analyzer for visualizer
      const analyzer = inputAudioContextRef.current.createAnalyser();
      analyzer.fftSize = 32;
      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      
      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            addLog("Connection Established.");
            setIsConnected(true);
            
            // Setup Input Stream
            if (!inputAudioContextRef.current) return;
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            source.connect(analyzer); // Tap for visualizer

            scriptProcessor.onaudioprocess = (e) => {
              // Update visualizer state
              analyzer.getByteFrequencyData(dataArray);
              const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
              setAudioLevel(avg);

              const inputData = e.inputBuffer.getChannelData(0);
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcm16[i] = inputData[i] * 32768;
              }
              const base64 = arrayBufferToBase64(pcm16.buffer);
              
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then(session => {
                   session.sendRealtimeInput({ 
                       media: { 
                           mimeType: 'audio/pcm;rate=16000', 
                           data: base64 
                       } 
                   });
                });
              }
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
             // Audio Output Handling
             const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (base64Audio && outputAudioContextRef.current) {
                 const ctx = outputAudioContextRef.current;
                 const audioBuffer = decodePCM(base64Audio, ctx, 24000);
                 
                 const source = ctx.createBufferSource();
                 source.buffer = audioBuffer;
                 source.connect(ctx.destination);
                 
                 const startTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
                 source.start(startTime);
                 nextStartTimeRef.current = startTime + audioBuffer.duration;
             }
             
             if (message.serverContent?.turnComplete) {
                 addLog("Turn Complete.");
             }
          },
          onclose: () => {
            addLog("Connection Closed.");
            setIsConnected(false);
          },
          onerror: (e: any) => {
            addLog(`Error: ${e.message || 'Unknown'}`);
          }
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
            },
            systemInstruction: `
              You are The Sovereign Architect. 
              The user has an ACTIVE VISUAL FEED (Camera). 
              If the user mentions "looking at" or "see", refer to the visual input stream.
              Keep responses concise, technical, and helpful.
            `
        }
      };

      // @ts-ignore - types mismatch in beta SDK sometimes
      sessionPromiseRef.current = ai.live.connect(config);

    } catch (err: any) {
        addLog(`Init Failed: ${err.message}`);
    }
  };

  const startCamera = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if(videoRef.current) {
              videoRef.current.srcObject = stream;
              setIsCameraActive(true);
              
              // Frame loop
              const sendFrame = () => {
                  if(!canvasRef.current || !videoRef.current) return;
                  const ctx = canvasRef.current.getContext('2d');
                  if(!ctx) return;
                  
                  canvasRef.current.width = videoRef.current.videoWidth / 2; // Downscale for speed
                  canvasRef.current.height = videoRef.current.videoHeight / 2;
                  
                  ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                  
                  const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
                  
                  if (sessionPromiseRef.current) {
                    sessionPromiseRef.current.then(session => {
                        session.sendRealtimeInput({
                            media: { mimeType: 'image/jpeg', data: base64 }
                        });
                    });
                  }
                  
                  if(isCameraActive) requestAnimationFrame(sendFrame);
              };
              // Only send frames occasionally to save bandwidth/compute
              setInterval(sendFrame, 1000); 
          }
      } catch (e) {
          addLog("Camera blocked.");
      }
  };

  return (
    <div className="h-full flex flex-col p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
      
      <div className="flex justify-between items-center mb-8 z-10">
        <h2 className="text-3xl font-sans font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyber-green to-emerald-700">
          LIVE UPLINK
        </h2>
        <div className={`px-3 py-1 rounded-full text-xs font-mono ${isConnected ? 'bg-cyber-green text-black' : 'bg-red-900 text-red-100'}`}>
          {isConnected ? 'ONLINE' : 'OFFLINE'}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center z-10 gap-8">
        
        {/* Interactive Visualizer */}
        <div 
            className={`rounded-full border-2 flex items-center justify-center transition-all duration-75`}
            style={{
                width: isConnected ? `${12 + (audioLevel / 2)}rem` : '12rem',
                height: isConnected ? `${12 + (audioLevel / 2)}rem` : '12rem',
                borderColor: isConnected ? '#00ff41' : '#27272a',
                boxShadow: isConnected ? `0 0 ${audioLevel}px rgba(0,255,65,0.5)` : 'none'
            }}
        >
           {isConnected ? (
               <div className="w-full h-full bg-cyber-green/10 rounded-full flex items-center justify-center relative overflow-hidden">
                   {/* Simulated Waveform */}
                   <div className="absolute inset-0 flex items-center justify-center gap-1">
                        {[1,2,3,4,5].map(i => (
                             <div 
                                key={i} 
                                className="w-2 bg-cyber-green transition-all duration-100" 
                                style={{ height: `${Math.random() * audioLevel * 1.5}%` }}
                             ></div>
                        ))}
                   </div>
               </div>
           ) : (
               <div className="text-zinc-600 font-mono">DISCONNECTED</div>
           )}
        </div>

        {/* Video Preview (Hidden but active) */}
        <video ref={videoRef} autoPlay playsInline muted className="hidden" />
        <canvas ref={canvasRef} className="hidden" />

        <div className="w-full max-w-md bg-black/50 border border-zinc-800 p-4 rounded-lg font-mono text-sm h-32 overflow-y-auto">
             {log.map((l, i) => <div key={i} className="text-emerald-500/80">> {l}</div>)}
             {log.length === 0 && <span className="text-zinc-600">Waiting for uplink...</span>}
        </div>

        <div className="flex gap-4">
            {!isConnected ? (
                <button onClick={connect} className="bg-cyber-green text-black font-bold px-8 py-3 rounded hover:bg-emerald-400 transition-colors uppercase tracking-widest font-mono">
                    Initialize Link
                </button>
            ) : (
                <button onClick={() => window.location.reload()} className="bg-red-500 text-black font-bold px-8 py-3 rounded hover:bg-red-400 transition-colors uppercase tracking-widest font-mono">
                    Terminate
                </button>
            )}
            
            {isConnected && !isCameraActive && (
                <button onClick={startCamera} className="border border-cyber-green text-cyber-green font-bold px-6 py-3 rounded hover:bg-cyber-green/10 transition-colors uppercase font-mono animate-pulse">
                    Enable Vision Input
                </button>
            )}
            
            {isCameraActive && (
                <div className="text-xs font-mono text-cyber-green mt-2 bg-zinc-900 px-2 py-1 rounded">
                    CAMERA ACTIVE • STREAMING TO GEMINI
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default LiveUplink;