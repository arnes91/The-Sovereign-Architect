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
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings State
  const [selectedVoice, setSelectedVoice] = useState(PERSONALITIES.MIKU_GLITCH.voice);
  const [systemPrompt, setSystemPrompt] = useState(PROMPT_TEMPLATES.LIVE_UPLINK_MIKU);
  const [savedMemory, setSavedMemory] = useState('');
  
  // Audio Context Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const cameraIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Session Memory
  const sessionTranscriptsRef = useRef<string[]>([]);

  const addLog = (msg: string) => setLog(prev => [...prev.slice(-4), msg]);

  useEffect(() => {
      StorageService.getLiveMemory().then(mem => setSavedMemory(mem));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionTranscriptsRef.current.length > 0) {
          const summary = "Session Log: " + sessionTranscriptsRef.current.join(" | ");
          StorageService.saveLiveMemory(summary).then(() => {
              console.log("Memory Saved on Exit.");
          });
      }

      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (cameraIntervalRef.current) clearInterval(cameraIntervalRef.current);
      if (inputAudioContextRef.current) inputAudioContextRef.current.close();
      if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    };
  }, []);

  const clearMemory = async () => {
      if(confirm("Wipe Miku's Memory? She will forget everything.")) {
          await StorageService.clearLiveMemory();
          setSavedMemory('');
          addLog("MEMORY PURGED.");
      }
  };

  const connect = async () => {
    try {
      addLog("BOOT SEQUENCE: MIKU_VAJFUŠA.exe");
      addLog("LOADING LTM (Long Term Memory)...");
      
      const previousContext = await StorageService.getLiveMemory();
      const memoryInjection = previousContext 
        ? `\n\n[SYSTEM MEMORY DETECTED - DO NOT IGNORE]:\n${previousContext}\n\n[INSTRUCTION]: You MUST acknowledge previous interactions found in the memory above. If the user mentions something from before, recall it.` 
        : "";

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
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
             
             if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
                 const text = message.serverContent.modelTurn.parts[0].text;
                 sessionTranscriptsRef.current.push(`AI: ${text}`);
             }
             
             if (message.serverContent?.turnComplete) {
                 const currentSessionLog = sessionTranscriptsRef.current.join(" | ");
                 if (currentSessionLog.length > 0) {
                    StorageService.saveLiveMemory(currentSessionLog);
                    sessionTranscriptsRef.current = []; 
                    addLog("Turn Complete. Memory Synced.");
                 }
             }
          },
          onclose: () => {
            addLog("CONNECTION SEVERED.");
            setIsConnected(false);
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
            if (cameraIntervalRef.current) clearInterval(cameraIntervalRef.current);
          },
          onerror: (e: any) => {
            addLog(`CRITICAL ERROR: ${e.message || 'Unknown'}`);
          }
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice as any } }
            },
            systemInstruction: systemPrompt + memoryInjection
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
    const COLOR_PRIMARY = '#39c5bb'; 
    const COLOR_SECONDARY = '#ff00ff'; 

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
            const shiftX = (Math.random() - 0.5) * 20;
            const shiftY = (Math.random() - 0.5) * 10;
            ctx.translate(shiftX, shiftY); 
            
            if(Math.random() > 0.7) {
                 ctx.fillStyle = COLOR_SECONDARY;
                 ctx.fillRect(Math.random() * width, Math.random() * height, width, 4 + Math.random() * 10);
            }
            if (Math.random() > 0.8) {
                ctx.globalCompositeOperation = 'difference';
                ctx.fillStyle = 'white';
                ctx.fillRect(0,0,width,height);
                ctx.globalCompositeOperation = 'source-over';
            }
            // Complex glitch: slice and shift
            if (Math.random() > 0.85) {
                const sliceY = Math.random() * height;
                const sliceH = Math.random() * 50;
                const shift = (Math.random() - 0.5) * 50;
                ctx.drawImage(canvas, 0, sliceY, width, sliceH, shift, sliceY, width, sliceH);
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
            for(let k=0; k<3; k++){
                ctx.fillStyle = Math.random() > 0.5 ? COLOR_PRIMARY : COLOR_SECONDARY;
                ctx.fillRect(
                    Math.random() * width,
                    Math.random() * height,
                    2 + Math.random() * 5,
                    2 + Math.random() * 15
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
              
              // Wait for video to be ready before starting capture loop
              videoRef.current.onloadedmetadata = () => {
                  videoRef.current?.play();
                  
                  const sendFrame = () => {
                      if(!canvasRef.current || !videoRef.current || !isConnected) return;
                      
                      // Only send if video has valid dimensions
                      if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
                          const ctx = canvasRef.current.getContext('2d');
                          if(!ctx) return;
                          
                          // Scale down for performance
                          canvasRef.current.width = videoRef.current.videoWidth / 4; 
                          canvasRef.current.height = videoRef.current.videoHeight / 4;
                          
                          ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                          const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
                          
                          if (sessionPromiseRef.current) {
                              sessionPromiseRef.current.then(session => {
                                  session.sendRealtimeInput({
                                      media: { mimeType: 'image/jpeg', data: base64 }
                                  });
                              }).catch(err => console.error("Error sending frame:", err));
                          }
                      }
                      
                      // Throttle frame sending to roughly 1fps to avoid overwhelming the connection
                      cameraIntervalRef.current = setTimeout(() => {
                          requestAnimationFrame(sendFrame);
                      }, 1000);
                  };
                  
                  // Start the capture loop
                  requestAnimationFrame(sendFrame);
              };
          }
      } catch (e) {
          addLog("Camera blocked or unavailable.");
          console.error("Camera error:", e);
      }
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-6 relative overflow-y-auto overflow-x-hidden bg-black pb-24">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 z-10 gap-4">
        <div>
            <h2 className="text-3xl md:text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-[#39c5bb] to-[#ff00ff] tracking-tighter">
            MIKU VAJFUŠA
            </h2>
            <p className="text-[10px] font-mono text-[#39c5bb] tracking-[0.3em]">GLITCH CORE PROTOCOL // v9.2 PERSISTENT</p>
        </div>
        <div className="flex flex-wrap gap-2">
             <button onClick={() => setShowSettings(!showSettings)} className="px-3 py-1 text-xs font-mono border border-zinc-700 text-zinc-300 hover:border-white hover:text-white transition-colors">
                 SETTINGS
             </button>
             <button onClick={clearMemory} className="px-3 py-1 text-xs font-mono border border-zinc-700 text-zinc-500 hover:border-red-500 hover:text-red-500 transition-colors">
                 WIPE MEMORY
             </button>
             <div className={`px-3 py-1 text-xs font-mono border ${isConnected ? 'border-[#39c5bb] text-[#39c5bb] animate-pulse' : 'border-red-900 text-red-900'}`}>
                {isConnected ? 'SYSTEM ONLINE' : 'OFFLINE'}
            </div>
        </div>
      </div>

      {showSettings && (
          <div className="mb-6 p-4 border border-zinc-800 bg-zinc-900/80 z-20 relative rounded">
              <h3 className="text-sm font-bold text-white mb-4 font-mono">ADVANCED SETTINGS</h3>
              <div className="space-y-4">
                  <div>
                      <label className="block text-xs text-zinc-400 mb-1 font-mono">VOICE MODEL</label>
                      <select 
                          value={selectedVoice} 
                          onChange={(e) => setSelectedVoice(e.target.value)}
                          className="w-full bg-black border border-zinc-700 p-2 text-sm text-white font-mono rounded"
                      >
                          <option value="Aoede">Aoede</option>
                          <option value="Charon">Charon</option>
                          <option value="Fenrir">Fenrir</option>
                          <option value="Kore">Kore</option>
                          <option value="Puck">Puck</option>
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs text-zinc-400 mb-1 font-mono">SYSTEM PROMPT</label>
                      <textarea 
                          value={systemPrompt}
                          onChange={(e) => setSystemPrompt(e.target.value)}
                          className="w-full h-32 bg-black border border-zinc-700 p-2 text-sm text-white font-mono rounded"
                      />
                  </div>
                  <div>
                      <label className="block text-xs text-zinc-400 mb-1 font-mono">SAVED MEMORY (READ-ONLY)</label>
                      <div className="w-full h-24 bg-black border border-zinc-700 p-2 text-xs text-zinc-500 font-mono rounded overflow-y-auto whitespace-pre-wrap">
                          {savedMemory || 'No memory recorded.'}
                      </div>
                  </div>
                  <div className="flex justify-end pt-2">
                      <button 
                          onClick={() => {
                              setShowSettings(false);
                              addLog("SETTINGS APPLIED. RESTART REQUIRED.");
                          }} 
                          className="px-4 py-2 bg-[#39c5bb] text-black font-bold font-mono text-xs hover:bg-white transition-colors"
                      >
                          APPLY & CLOSE
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center z-10 gap-6 relative">
        <div className="relative w-full max-w-2xl h-[300px] md:h-[400px] flex items-center justify-center border border-zinc-800/50 rounded-xl overflow-hidden bg-zinc-900/20">
             <canvas ref={visualizerCanvasRef} className="w-full h-full absolute inset-0 z-10"/>
             
             {/* Camera Preview Background */}
             {isCameraActive && (
                 <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-30 grayscale mix-blend-screen" />
             )}

            {!isConnected && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-20">
                    <h1 className="text-4xl md:text-6xl font-black text-white/10 tracking-widest">WAITING</h1>
                </div>
            )}
             {isConnected && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mix-blend-overlay z-20">
                    <h1 className="text-6xl md:text-8xl font-black text-[#ff00ff]/20 tracking-widest animate-pulse">GLITCH</h1>
                </div>
            )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="w-full max-w-2xl bg-black/50 border border-zinc-800 p-4 font-mono text-xs h-32 overflow-y-auto rounded">
             {log.map((l, i) => <div key={i} className="text-[#39c5bb]">{">"} {l}</div>)}
             {log.length === 0 && <span className="text-zinc-600 animate-pulse">_Initialize protocol to begin...</span>}
        </div>

        <div className="flex flex-wrap justify-center gap-4">
            {!isConnected ? (
                <button onClick={connect} className="bg-[#39c5bb] text-black font-black px-6 md:px-8 py-3 hover:bg-[#ff00ff] hover:text-white transition-all uppercase tracking-widest font-mono skew-x-[-10deg] text-sm md:text-base">
                    INITIALIZE CORE
                </button>
            ) : (
                <button onClick={() => window.location.reload()} className="bg-red-600 text-black font-black px-6 md:px-8 py-3 hover:bg-red-500 transition-all uppercase tracking-widest font-mono skew-x-[-10deg] text-sm md:text-base">
                    KILL PROCESS
                </button>
            )}
            
            {isConnected && !isCameraActive && (
                <button onClick={startCamera} className="border border-[#39c5bb] text-[#39c5bb] font-bold px-4 md:px-6 py-3 hover:bg-[#39c5bb]/10 transition-colors uppercase font-mono skew-x-[-10deg] text-sm md:text-base">
                    ENABLE VISION
                </button>
            )}
            
            {isCameraActive && (
                <div className="text-xs md:text-sm font-mono text-[#ff00ff] mt-2 bg-zinc-900 px-4 py-2 border border-[#ff00ff] skew-x-[-10deg] flex items-center">
                    <span className="w-2 h-2 bg-[#ff00ff] rounded-full animate-pulse mr-2"></span>
                    VISION ACTIVE
                </div>
            )}
        </div>
      </div>
      
      {/* Small Camera Preview */}
      {isCameraActive && (
          <div className="fixed bottom-24 right-4 w-32 h-24 md:w-48 md:h-36 border-2 border-[#ff00ff] rounded-lg overflow-hidden z-50 shadow-[0_0_15px_rgba(255,0,255,0.5)]">
              <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover"
              />
              <div className="absolute top-1 left-1 bg-black/70 text-[#ff00ff] text-[8px] md:text-[10px] font-mono px-1 border border-[#ff00ff]/50">
                  REC // UPLINK
              </div>
          </div>
      )}
    </div>
  );
};

export default LiveUplink;
