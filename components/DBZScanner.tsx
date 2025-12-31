import React, { useState, useRef, useEffect } from 'react';
import { DBZStats, DBZScanResult } from '../types';
import { generateDBZTaunt, generateSpeech, decodePCM, analyzeDBZVision } from '../services/geminiService';
import { StorageService } from '../services/storageService';
import { PERSONALITIES } from '../config/personalities';

const DBZScanner: React.FC = () => {
  const [mode, setMode] = useState<'CAMERA' | 'UPLOAD' | 'HISTORY'>('CAMERA');
  const [stats, setStats] = useState<DBZStats | null>(null);
  const [power, setPower] = useState<number>(0);
  const [taunt, setTaunt] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<DBZScanResult[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
      if (mode === 'CAMERA') {
          startCamera();
      } else {
          stopCamera();
          if (mode === 'HISTORY') {
              setHistory(StorageService.getScans());
          }
      }
      return () => stopCamera();
  }, [mode]);

  const startCamera = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (e) {
          console.error("Camera access denied", e);
      }
  };

  const stopCamera = () => {
      if (videoRef.current && videoRef.current.srcObject) {
          const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
          tracks.forEach(t => t.stop());
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => setCapturedImage(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  const captureFrame = (): string | null => {
      if (!videoRef.current || !canvasRef.current) return null;
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      return canvasRef.current.toDataURL('image/jpeg', 0.8);
  };

  const executeScan = async () => {
      setIsScanning(true);
      setTaunt(''); // Clear previous
      
      try {
          // 1. Get Image
          let base64Image = capturedImage;
          if (mode === 'CAMERA') {
              base64Image = captureFrame();
              setCapturedImage(base64Image); // Freeze frame
          }

          if (!base64Image) throw new Error("No visual input detected.");

          // 2. Analyze via Gemini Vision
          const visionData = await analyzeDBZVision(base64Image.split(',')[1]);
          
          if (visionData) {
              setPower(visionData.power);
              setStats(visionData.stats);

              // 3. Generate Taunt based on Vision Data
              const { text, voice } = await generateDBZTaunt(visionData.power, visionData.stats);
              setTaunt(text);

              // 4. Save to History
              StorageService.saveScan({
                  id: Date.now().toString(),
                  timestamp: Date.now(),
                  power: visionData.power,
                  taunt: text,
                  stats: visionData.stats,
                  character: voice,
                  imageUrl: base64Image
              });

              // 5. TTS Output
              const audioBase64 = await generateSpeech(text, voice);
              if (audioBase64) {
                  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                  audioContextRef.current = ctx;
                  const buffer = decodePCM(audioBase64, ctx, 24000);
                  const source = ctx.createBufferSource();
                  source.buffer = buffer;
                  source.connect(ctx.destination);
                  source.start(0);
              }
          }

      } catch (e) {
          console.error("Scan Failed", e);
          setTaunt("ERROR: Scouter Malfunction. Target ambiguous.");
      } finally {
          setIsScanning(false);
      }
  };

  const resetScanner = () => {
      setCapturedImage(null);
      setStats(null);
      setPower(0);
      setTaunt('');
      if (mode === 'CAMERA') startCamera();
  };

  // Visual bar calc
  const powerPercentage = Math.min(100, (power / 2000000) * 100);

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 p-6">
       
       {/* Left Panel: Viewport */}
       <div className="flex-1 flex flex-col bg-black border border-zinc-800 rounded-xl overflow-hidden relative min-h-[400px]">
            {mode === 'HISTORY' ? (
                <div className="flex-1 bg-zinc-900 p-4 overflow-y-auto">
                    <h3 className="text-cyber-green font-mono mb-4 text-sm">SCAN LOGS</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {history.map(item => (
                            <div key={item.id} className="bg-black border border-zinc-800 rounded p-2">
                                <div className="aspect-square bg-zinc-800 mb-2 relative overflow-hidden">
                                    {item.imageUrl && <img src={item.imageUrl} className="w-full h-full object-cover" />}
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                                        <p className="text-white text-xs font-bold text-center">{item.power.toLocaleString()}</p>
                                    </div>
                                </div>
                                <p className="text-[10px] text-zinc-500 font-mono truncate">{new Date(item.timestamp).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <>
                {/* HUD Overlay */}
                <div className="absolute inset-0 z-20 pointer-events-none p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div className="text-cyber-green font-mono text-xs animate-pulse">
                            SYS.V.8.0 // {isScanning ? 'ANALYZING' : 'READY'}
                        </div>
                        <svg className="w-12 h-12 text-cyber-green opacity-50" viewBox="0 0 100 100">
                            <path d="M10 10 L30 10 M10 10 L10 30" stroke="currentColor" fill="none" strokeWidth="2"/>
                            <path d="M90 10 L70 10 M90 10 L90 30" stroke="currentColor" fill="none" strokeWidth="2"/>
                            <path d="M10 90 L30 90 M10 90 L10 70" stroke="currentColor" fill="none" strokeWidth="2"/>
                            <path d="M90 90 L70 90 M90 90 L90 70" stroke="currentColor" fill="none" strokeWidth="2"/>
                        </svg>
                    </div>
                    
                    {mode === 'CAMERA' && !capturedImage && (
                        <div className="self-center border border-cyber-green/30 w-48 h-48 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        </div>
                    )}
                </div>

                {/* Media Area */}
                <div className="flex-1 bg-zinc-900 relative flex items-center justify-center overflow-hidden">
                    {capturedImage ? (
                        <img src={capturedImage} className="w-full h-full object-cover opacity-60" />
                    ) : mode === 'CAMERA' ? (
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-zinc-600 font-mono flex flex-col items-center">
                            <span className="text-4xl mb-2">⇩</span>
                            <span>UPLOAD TARGET IMAGE</span>
                        </div>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                </div>
                </>
            )}

            {/* Controls */}
            <div className="bg-zinc-900 p-4 border-t border-zinc-800 flex gap-4 z-30 justify-between">
                <div className="flex gap-2">
                    <button 
                        onClick={() => { setMode('CAMERA'); resetScanner(); }}
                        className={`px-3 py-2 text-[10px] font-bold font-mono rounded border ${mode === 'CAMERA' ? 'bg-cyber-green text-black border-cyber-green' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}
                    >
                        CAM
                    </button>
                    <button 
                        onClick={() => { setMode('UPLOAD'); resetScanner(); }}
                        className={`px-3 py-2 text-[10px] font-bold font-mono rounded border ${mode === 'UPLOAD' ? 'bg-cyber-green text-black border-cyber-green' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}
                    >
                        FILE
                    </button>
                    <button 
                        onClick={() => setMode('HISTORY')}
                        className={`px-3 py-2 text-[10px] font-bold font-mono rounded border ${mode === 'HISTORY' ? 'bg-cyber-green text-black border-cyber-green' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}
                    >
                        LOGS
                    </button>
                </div>
                
                {mode === 'UPLOAD' && !capturedImage && (
                    <input type="file" onChange={handleFileUpload} accept="image/*" className="text-xs text-zinc-400 file:bg-zinc-800 file:text-white file:border-0 file:px-4 file:py-2 file:rounded w-40" />
                )}

                {mode !== 'HISTORY' && (
                    !capturedImage ? (
                        <button 
                            onClick={executeScan}
                            disabled={isScanning || (mode === 'UPLOAD' && !capturedImage)}
                            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold font-mono tracking-widest uppercase rounded disabled:opacity-50 text-xs"
                        >
                            {isScanning ? '...' : 'SCAN'}
                        </button>
                    ) : (
                        <button 
                            onClick={resetScanner}
                            className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-bold font-mono tracking-widest uppercase rounded text-xs"
                        >
                            RESET
                        </button>
                    )
                )}
            </div>
       </div>

       {/* Right Panel: Results */}
       <div className="flex-1 bg-zinc-900/30 p-6 border border-zinc-800 rounded-xl overflow-y-auto">
           {power > 0 ? (
               <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="mb-8 text-center">
                        <h3 className="text-xs font-mono text-zinc-500 mb-2">ESTIMATED POWER LEVEL</h3>
                        <div className="text-6xl md:text-7xl font-black text-white tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                            {power.toLocaleString()}
                        </div>
                        {/* Power Bar */}
                        <div className="w-full h-3 bg-zinc-800 rounded-full mt-4 overflow-hidden relative">
                            <div 
                                className="h-full bg-gradient-to-r from-green-500 via-yellow-400 to-red-600"
                                style={{ width: `${powerPercentage}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="bg-black border-l-4 border-red-500 p-6 mb-8 rounded-r-lg">
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-xs font-mono text-red-500">AUDIO LOG</span>
                             <span className="text-xs font-mono text-zinc-600">VOICE: {power > 500000 ? 'WHIS' : 'FRIEZA'}</span>
                        </div>
                        <p className="font-serif italic text-xl text-zinc-200 leading-relaxed">"{taunt}"</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         {stats && Object.entries(stats).slice(0, 6).map(([key, val]) => (
                             <div key={key} className="bg-zinc-900/50 p-3 rounded border border-zinc-800/50">
                                 <div className="flex justify-between mb-1">
                                     <span className="text-xs uppercase font-mono text-zinc-400">{key}</span>
                                     <span className="text-xs font-bold text-cyber-green">{val}/10</span>
                                 </div>
                                 <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                     <div className="h-full bg-cyber-green" style={{ width: `${val * 10}%` }}></div>
                                 </div>
                             </div>
                         ))}
                    </div>
               </div>
           ) : (
               <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50">
                   <div className="w-16 h-16 border-2 border-dashed border-zinc-700 rounded-full flex items-center justify-center mb-4">
                       <span className="text-2xl">?</span>
                   </div>
                   <p className="font-mono text-sm">Awaiting Target Acquisition</p>
               </div>
           )}
       </div>
    </div>
  );
};

export default DBZScanner;
