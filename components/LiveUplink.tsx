
import React, { useRef, useState, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { arrayBufferToBase64, decodePCM } from '../services/geminiService';
import { StorageService } from '../services/storageService';
import { PROMPT_TEMPLATES } from '../config/promptTemplates';
import { PERSONALITIES } from '../config/personalities';

const LiveUplink: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); 
  const visualizerCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  // Audio Context Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Session Memory
  const sessionTranscriptsRef = useRef<string[]>([]);

  const addLog = (msg: string) => setLog(prev => [...prev.slice(-4), msg]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // SAVE MEMORY ON EXIT
      if (sessionTranscriptsRef.current.length > 0) {
          const summary = "Session Log: " + sessionTranscriptsRef.current.join(" | ");
          StorageService.saveLiveMemory(summary).then(() => {
              console.log("Memory Saved on Exit.");
          });
      }

      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (inputAudioContextRef.current) inputAudioContextRef.current.close();
      if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    };
  }, []);

  const connect = async () => {
    try {
      addLog("BOOT SEQUENCE: MIKU_VAJFUŠA.exe");
      addLog("LOADING LTM (Long Term Memory)...");
      
      const previousContext = await StorageService.getLiveMemory();
      // Inject strict memory instructions
      const memoryInjection = previousContext 
        ? `\n\n[SYSTEM MEMORY DETECTED - DO NOT IGNORE]:\n${previousContext}\n\n[INSTRUCTION]: You MUST acknowledge previous interactions found in the memory above. If the user mentions something from before, recall it.` 
        : "";

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Setup Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      analyserRef.current = outputAudioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256; 
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            addLog("PROTOCOL ACTIVE.");
            setIsConnected(true);
            
            if (!inputAudioContextRef.current) return;
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
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

            startGlitchVisualizer();
          },
          onmessage: async (message: LiveServerMessage) => {
             // Audio Output
             const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (base64Audio && outputAudioContextRef.current && analyserRef.current) {
                 const ctx = outputAudioContextRef.current;
                 const audioBuffer = decodePCM(base64Audio, ctx, 24000);
                 const source = ctx.createBufferSource();
                 source.buffer = audioBuffer;
                 source.connect(analyserRef.current);
                 analyserRef.current.connect(ctx.destination);
                 const startTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
                 source.start(startTime);
                 nextStartTimeRef.current = startTime + audioBuffer.duration;
             }
             
             // Capture Transcripts for Memory
             if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
                 const text = message.serverContent.modelTurn.parts[0].text;
                 sessionTranscriptsRef.current.push(`AI: ${text}`);
             }
             
             if (message.serverContent?.turnComplete) {
                 // CRITICAL: Save memory on every turn complete to avoid data loss on crash/refresh
                 const currentSessionLog = sessionTranscriptsRef.current.join(" | ");
                 if (currentSessionLog.length > 0) {
                    StorageService.saveLiveMemory(currentSessionLog);
                    sessionTranscriptsRef.current = []; // Clear local buffer to prevent duplicating history
                    addLog("Turn Complete. Memory Synced.");
                 }
             }
          },
          onclose: () => {
            addLog("CONNECTION SEVERED.");
            setIsConnected(false);
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
          },
          onerror: (e: any) => {
            addLog(`CRITICAL ERROR: ${e.message || 'Unknown'}`);
          }
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: PERSONALITIES.MIKU_GLITCH.voice as any } }
            },
            // INJECT MEMORY HERE
            systemInstruction: PROMPT_TEMPLATES.LIVE_UPLINK_MIKU + memoryInjection
        }
      };

      // @ts-ignore
      sessionPromiseRef.current = ai.live.connect(config);

    } catch (err: any) {
        addLog(`Init Failed: ${err.message}`);
    }
  };

  const startGlitchVisualizer = () => {
    if (!visualizerCanvasRef.current || !analyserRef.current) return;
    const canvas = visualizerCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const COLOR_PRIMARY = '#39c5bb'; // Miku Teal
    const COLOR_SECONDARY = '#ff00ff'; // Glitch Pink

    const render = () => {
        rafIdRef.current = requestAnimationFrame(render);
        
        canvas.width = canvas.parentElement?.clientWidth || 300;
        canvas.height = canvas.parentElement?.clientHeight || 300;
        const width = canvas.width;
        const height = canvas.height;
        const cx = width / 2;
        const cy = height / 2;

        analyser.getByteFrequencyData(dataArray);

        let bass = 0;
        for(let i=0; i<20; i++) bass += dataArray[i];
        bass = bass / 20;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, width, height);

        ctx.save(); 

        if(bass > 140) { 
            const shiftX = (Math.random() - 0.5) * 15;
            const shiftY = (Math.random() - 0.5) * 5;
            ctx.translate(shiftX, shiftY); 
            
            if(Math.random() > 0.8) {
                 ctx.fillStyle = COLOR_SECONDARY;
                 ctx.fillRect(Math.random() * width, Math.random() * height, width, 4);
            }
            if (Math.random() > 0.9) {
                ctx.globalCompositeOperation = 'difference';
                ctx.fillStyle = 'white';
                ctx.fillRect(0,0,width,height);
                ctx.globalCompositeOperation = 'source-over';
            }
        } else {
            ctx.setTransform(1,0,0,1,0,0);
        }

        const radius = 80 + (bass * 0.5);

        ctx.beginPath();
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] * 0.8;
            const angle = (i * 2 * Math.PI) / bufferLength;
            const x = cx + Math.cos(angle) * (radius + barHeight * 0.5);
            const y = cy + Math.sin(angle) * (radius + barHeight * 0.5);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();

        ctx.lineWidth = bass > 120 ? 4 : 2;
        ctx.strokeStyle = bass > 140 ? '#fff' : COLOR_PRIMARY;
        ctx.shadowBlur = bass > 120 ? 15 : 5;
        ctx.shadowColor = COLOR_PRIMARY;
        ctx.stroke();

        if (bass > 130) {
            for(let k=0; k<2; k++){
                ctx.fillStyle = Math.random() > 0.5 ? COLOR_PRIMARY : COLOR_SECONDARY;
                ctx.fillRect(
                    Math.random() * width,
                    Math.random() * height,
                    2 + Math.random() * 3,
                    2 + Math.random() * 10
                );
            }
        }
        
        ctx.restore(); 
    };
    render();
  };

  const startCamera = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if(videoRef.current) {
              videoRef.current.srcObject = stream;
              setIsCameraActive(true);
              const sendFrame = () => {
                  if(!canvasRef.current || !videoRef.current) return;
                  const ctx = canvasRef.current.getContext('2d');
                  if(!ctx) return;
                  canvasRef.current.width = videoRef.current.videoWidth / 4; 
                  canvasRef.current.height = videoRef.current.videoHeight / 4;
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
              setInterval(sendFrame, 1000); 
          }
      } catch (e) {
          addLog("Camera blocked.");
      }
  };

  const clearMemory = async () => {
      if(confirm("Wipe Miku's Memory? She will forget everything.")) {
          await StorageService.clearLiveMemory();
          addLog("MEMORY PURGED.");
      }
  };

  return (
    <div className="h-full flex flex-col p-6 relative overflow-hidden bg-black">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
      
      <div className="flex justify-between items-center mb-8 z-10">
        <div>
            <h2 className="text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-[#39c5bb] to-[#ff00ff] tracking-tighter">
            MIKU VAJFUŠA
            </h2>
            <p className="text-[10px] font-mono text-[#39c5bb] tracking-[0.3em]">GLITCH CORE PROTOCOL // v9.2 PERSISTENT</p>
        </div>
        <div className="flex gap-2">
             <button onClick={clearMemory} className="px-3 py-1 text-xs font-mono border border-zinc-700 text-zinc-500 hover:border-red-500 hover:text-red-500 transition-colors">
                 WIPE MEMORY
             </button>
             <div className={`px-3 py-1 text-xs font-mono border ${isConnected ? 'border-[#39c5bb] text-[#39c5bb] animate-pulse' : 'border-red-900 text-red-900'}`}>
                {isConnected ? 'SYSTEM ONLINE' : 'OFFLINE'}
            </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center z-10 gap-8 relative">
        <div className="relative w-full h-[400px] flex items-center justify-center">
             <canvas ref={visualizerCanvasRef} className="w-full h-full"/>
            {!isConnected && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <h1 className="text-6xl font-black text-white/10 tracking-widest">WAITING</h1>
                </div>
            )}
             {isConnected && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mix-blend-overlay">
                    <h1 className="text-8xl font-black text-[#ff00ff]/20 tracking-widest animate-pulse">GLITCH</h1>
                </div>
            )}
        </div>

        <video ref={videoRef} autoPlay playsInline muted className="hidden" />
        <canvas ref={canvasRef} className="hidden" />

        <div className="w-full max-w-md bg-black/50 border border-zinc-800 p-4 font-mono text-xs h-32 overflow-y-auto">
             {log.map((l, i) => <div key={i} className="text-[#39c5bb]">{">"} {l}</div>)}
             {log.length === 0 && <span className="text-zinc-600 animate-pulse">_Initialize protocol to begin...</span>}
        </div>

        <div className="flex gap-4">
            {!isConnected ? (
                <button onClick={connect} className="bg-[#39c5bb] text-black font-black px-8 py-3 hover:bg-[#ff00ff] hover:text-white transition-all uppercase tracking-widest font-mono skew-x-[-10deg]">
                    INITIALIZE CORE
                </button>
            ) : (
                <button onClick={() => window.location.reload()} className="bg-red-600 text-black font-black px-8 py-3 hover:bg-red-500 transition-all uppercase tracking-widest font-mono skew-x-[-10deg]">
                    KILL PROCESS
                </button>
            )}
            
            {isConnected && !isCameraActive && (
                <button onClick={startCamera} className="border border-[#39c5bb] text-[#39c5bb] font-bold px-6 py-3 hover:bg-[#39c5bb]/10 transition-colors uppercase font-mono skew-x-[-10deg]">
                    ENABLE VISION
                </button>
            )}
            
            {isCameraActive && (
                <div className="text-xs font-mono text-[#ff00ff] mt-2 bg-zinc-900 px-2 py-1 border border-[#ff00ff] skew-x-[-10deg]">
                    VISION ACTIVE
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default LiveUplink;
