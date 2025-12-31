import React, { useRef, useState, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { arrayBufferToBase64, decodePCM } from '../services/geminiService';

const LiveUplink: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // For video frame capture
  const visualizerCanvasRef = useRef<HTMLCanvasElement>(null); // For audio visualization
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  // Audio Context Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const addLog = (msg: string) => setLog(prev => [...prev.slice(-4), msg]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (inputAudioContextRef.current) inputAudioContextRef.current.close();
      if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    };
  }, []);

  const connect = async () => {
    try {
      addLog("Initializing Neural Link...");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Analyzer setup for Visualizer
      const analyzer = inputAudioContextRef.current.createAnalyser();
      analyzer.fftSize = 512; // Higher resolution for better visuals
      analyzer.smoothingTimeConstant = 0.8;
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

            // Start Visualizer Loop
            const drawVisualizer = () => {
                if (!visualizerCanvasRef.current) return;
                const canvas = visualizerCanvasRef.current;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                rafIdRef.current = requestAnimationFrame(drawVisualizer);

                analyzer.getByteFrequencyData(dataArray);
                
                // Clear Canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const radius = 50;
                
                // 1. Draw Pulsating Core
                const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius - 10 + (average / 5), 0, 2 * Math.PI);
                ctx.fillStyle = `rgba(0, 255, 65, ${0.1 + (average / 500)})`;
                ctx.fill();
                
                // 2. Draw Radial Frequency Bars
                const bars = 60; // Number of bars to draw
                const step = Math.floor(dataArray.length / bars);
                
                ctx.beginPath();
                for (let i = 0; i < bars; i++) {
                    const value = dataArray[i * step];
                    const barHeight = (value / 255) * 60; // Max extension
                    const angle = (i / bars) * 2 * Math.PI;
                    
                    // Start point (on circle edge)
                    const x1 = centerX + Math.cos(angle) * radius;
                    const y1 = centerY + Math.sin(angle) * radius;
                    
                    // End point (extending outwards)
                    const x2 = centerX + Math.cos(angle) * (radius + barHeight);
                    const y2 = centerY + Math.sin(angle) * (radius + barHeight);
                    
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                }
                
                ctx.lineCap = 'round';
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#00ff41';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#00ff41';
                ctx.stroke();
                ctx.shadowBlur = 0; // Reset
            };
            drawVisualizer();

            scriptProcessor.onaudioprocess = (e) => {
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
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
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
        
        {/* Interactive Visualizer Canvas */}
        <div className={`relative flex items-center justify-center transition-all duration-500 ${isConnected ? 'opacity-100 scale-100' : 'opacity-50 scale-95'}`}>
            <canvas 
                ref={visualizerCanvasRef} 
                width={300} 
                height={300} 
                className="rounded-full bg-black/50 border border-zinc-800"
                style={{ 
                    width: '300px', 
                    height: '300px',
                    boxShadow: isConnected ? '0 0 30px rgba(0,255,65,0.1)' : 'none'
                }}
            />
            
            {!isConnected && (
                <div className="absolute text-zinc-600 font-mono text-sm">
                    DISCONNECTED
                </div>
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
