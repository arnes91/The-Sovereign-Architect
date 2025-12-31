import React, { useState, useRef, useEffect } from 'react';
import { DBZStats, DBZScanResult, UserProfile } from '../types';
import { generateDBZTaunt, generateSpeech, decodePCM } from '../services/geminiService';
import { StorageService } from '../services/storageService';
import { HumeService } from '../services/humeService';
import { GamificationService } from '../services/gamificationService';
import { PERSONALITIES } from '../config/personalities';

const DBZScanner: React.FC = () => {
  const [viewState, setViewState] = useState<'HUD' | 'RESULT' | 'HISTORY' | 'PROFILE'>('HUD');
  const [user, setUser] = useState<UserProfile>(GamificationService.getProfile());
  const [isScanning, setIsScanning] = useState(false);
  
  // Scan Data
  const [currentPower, setCurrentPower] = useState<number>(0);
  const [currentStats, setCurrentStats] = useState<DBZStats | null>(null);
  const [currentTaunt, setCurrentTaunt] = useState<string>('');
  const [currentPersona, setCurrentPersona] = useState<string>('');
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
      if (viewState === 'HUD') {
          startCamera();
      } else {
          stopCamera();
      }
      return () => stopCamera();
  }, [viewState]);

  const startCamera = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }); // Front camera priority
          if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (e) {
          console.error("Camera denied", e);
      }
  };

  const stopCamera = () => {
      if (videoRef.current && videoRef.current.srcObject) {
          const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
          tracks.forEach(t => t.stop());
      }
  };

  const playAudio = (base64: string) => {
      if (!base64) return;
      try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          audioContextRef.current = ctx;
          const buffer = decodePCM(base64, ctx, 24000);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
      } catch (e) { console.error("Audio error", e); }
  };

  const handleScan = async () => {
      // 1. Check Energy
      if (user.energy <= 0 && !user.isPremium) {
          alert("OUT OF ENERGY! Watch an Ad or Upgrade.");
          setViewState('PROFILE');
          return;
      }

      setIsScanning(true);
      
      try {
          // 2. Capture Frame
          if (!videoRef.current || !canvasRef.current) throw new Error("Camera Error");
          const ctx = canvasRef.current.getContext('2d');
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          ctx?.drawImage(videoRef.current, 0, 0);
          const base64Img = canvasRef.current.toDataURL('image/jpeg', 0.7);
          setScannedImage(base64Img);

          // 3. Hume AI Analysis (Simulated for MVP if no key)
          const stats = await HumeService.simulateScan();
          const power = HumeService.calculatePowerLevel(stats);
          
          setCurrentStats(stats);
          setCurrentPower(power);

          // 4. Determine Persona based on Power & Unlocks
          const tiers = PERSONALITIES.DBZ_SCANNER.tiers;
          let selectedTier = tiers.LOW;
          
          if (power > tiers.HIGH.threshold && user.unlockedPersonas.includes('ANGEL')) {
              selectedTier = tiers.HIGH;
          } else if (power > tiers.MID.threshold && user.unlockedPersonas.includes('PRINCE')) {
              selectedTier = tiers.MID;
          }

          setCurrentPersona(selectedTier.name);

          // 5. Generate Text & Audio (Gemini)
          const { text } = await generateDBZTaunt(power, stats);
          setCurrentTaunt(text);

          const audioB64 = await generateSpeech(text, selectedTier.voice);
          if (audioB64) playAudio(audioB64);

          // 6. Save & Update User
          GamificationService.consumeEnergy();
          const updatedUser = GamificationService.addXp(150); // 150 XP per scan
          setUser(updatedUser);

          StorageService.saveScan({
              id: Date.now().toString(),
              timestamp: Date.now(),
              power,
              taunt: text,
              stats,
              character: selectedTier.name,
              imageUrl: base64Img
          });

          setViewState('RESULT');

      } catch (e) {
          console.error(e);
          alert("Scanner Malfunction.");
      } finally {
          setIsScanning(false);
      }
  };

  // --- SUB-COMPONENTS ---

  const ProfileView = () => (
      <div className="flex flex-col h-full bg-zinc-900 p-6 overflow-y-auto">
          <div className="text-center mb-8">
              <div className="w-24 h-24 mx-auto bg-gradient-to-tr from-cyber-green to-blue-500 rounded-full flex items-center justify-center border-4 border-white mb-4 shadow-[0_0_20px_rgba(0,255,65,0.4)]">
                  <span className="text-3xl font-black text-black">{user.level}</span>
              </div>
              <h2 className="text-2xl font-bold text-white">{user.username}</h2>
              <p className="text-cyber-green font-mono text-sm">{user.isPremium ? "PREMIUM WARRIOR" : "FREE USER"}</p>
          </div>

          <div className="bg-black border border-zinc-800 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                  <span className="text-zinc-400 font-mono text-xs">ENERGY</span>
                  <span className="text-white font-bold">{user.energy} / {user.maxEnergy}</span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400" style={{ width: `${(user.energy / user.maxEnergy) * 100}%` }}></div>
              </div>
              <button 
                onClick={async () => {
                    const newEnergy = await GamificationService.watchAdForEnergy();
                    setUser({ ...user, energy: newEnergy });
                }}
                className="w-full mt-4 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded text-xs font-bold border border-zinc-600"
              >
                📺 WATCH AD (+3 ENERGY)
              </button>
          </div>

          {!user.isPremium && (
               <button 
                onClick={async () => {
                    await GamificationService.upgradeToPremium();
                    setUser(GamificationService.getProfile());
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-lg font-bold shadow-lg mb-6 animate-pulse"
              >
                 UNLOCK UNLIMITED POWER (15 KM/mo)
              </button>
          )}

          <div className="space-y-2">
              <h3 className="text-xs font-mono text-zinc-500 mb-2">UNLOCKED PERSONAS</h3>
              {['TYRANT', 'PRINCE', 'ANGEL'].map(p => (
                  <div key={p} className={`flex items-center justify-between p-3 rounded border ${user.unlockedPersonas.includes(p) ? 'border-cyber-green bg-cyber-green/10' : 'border-zinc-800 bg-black opacity-50'}`}>
                      <span className="text-sm font-bold text-white">{p}</span>
                      {user.unlockedPersonas.includes(p) ? (
                          <span className="text-xs text-cyber-green">ACTIVE</span>
                      ) : (
                          <span className="text-[10px] text-zinc-500">LOCKED (LVL {p === 'PRINCE' ? '5' : '10'})</span>
                      )}
                  </div>
              ))}
          </div>
          
          <button onClick={() => setViewState('HUD')} className="mt-auto py-4 text-zinc-400 font-mono text-sm">BACK TO SCANNER</button>
      </div>
  );

  const ResultView = () => (
      <div className="flex flex-col h-full bg-black relative overflow-hidden">
          {/* Background Image */}
          {scannedImage && (
              <div className="absolute inset-0 opacity-40">
                  <img src={scannedImage} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
              </div>
          )}

          <div className="relative z-10 flex flex-col h-full p-6">
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <h3 className="text-cyber-green font-mono text-sm tracking-[0.2em] mb-2 animate-pulse">ANALYSIS COMPLETE</h3>
                  <div className="text-7xl font-black text-white italic tracking-tighter drop-shadow-[0_0_25px_rgba(255,255,255,0.5)] transform -skew-x-12">
                      {currentPower.toLocaleString()}
                  </div>
                  <div className="mt-2 px-3 py-1 bg-red-600 text-white text-xs font-bold rounded uppercase">
                      {HumeService.getDominantEmotion(currentStats!)} DETECTED
                  </div>
              </div>

              <div className="bg-zinc-900/90 backdrop-blur border-l-4 border-yellow-400 p-6 rounded-r-xl mb-8 shadow-xl">
                  <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-yellow-400">{currentPersona.toUpperCase()} SAYS:</span>
                  </div>
                  <p className="text-lg text-white font-medium leading-relaxed italic">"{currentTaunt}"</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                  <button className="bg-blue-600 text-white py-3 rounded font-bold text-sm shadow-lg">SHARE RESULT</button>
                  <button onClick={() => setViewState('HUD')} className="bg-zinc-800 text-white py-3 rounded font-bold text-sm border border-zinc-700">SCAN AGAIN</button>
              </div>
          </div>
      </div>
  );

  // --- MAIN HUD ---
  if (viewState === 'PROFILE') return <ProfileView />;
  if (viewState === 'RESULT') return <ResultView />;
  if (viewState === 'HISTORY') {
      const history = StorageService.getScans();
      return (
          <div className="h-full bg-black p-4 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-white font-bold text-xl">SCAN LOG</h2>
                 <button onClick={() => setViewState('HUD')} className="text-xs text-cyber-green font-mono">CLOSE</button>
              </div>
              <div className="grid grid-cols-1 gap-4">
                  {history.map(h => (
                      <div key={h.id} className="flex gap-4 bg-zinc-900 p-3 rounded border border-zinc-800">
                          <img src={h.imageUrl} className="w-16 h-16 object-cover rounded bg-zinc-800" />
                          <div>
                              <div className="text-xl font-black text-white">{h.power.toLocaleString()}</div>
                              <div className="text-xs text-zinc-500">{new Date(h.timestamp).toLocaleDateString()}</div>
                              <div className="text-xs text-yellow-500 truncate w-40">"{h.taunt}"</div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col bg-black relative overflow-hidden">
        {/* Camera Viewport */}
        <div className="absolute inset-0 z-0">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* HUD Overlay */}
        <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 pointer-events-none">
            {/* Top Bar */}
            <div className="flex justify-between items-start pointer-events-auto">
                <div 
                    onClick={() => setViewState('PROFILE')}
                    className="bg-black/50 backdrop-blur border border-cyber-green/50 rounded-lg p-2 flex items-center gap-3 cursor-pointer"
                >
                    <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-xs font-bold text-white border border-white">
                        {user.level}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-cyber-green font-mono">ENERGY</span>
                        <div className="flex gap-0.5">
                            {[...Array(user.maxEnergy)].map((_, i) => (
                                <div key={i} className={`w-2 h-2 rounded-sm ${i < user.energy ? 'bg-yellow-400' : 'bg-zinc-700'}`}></div>
                            ))}
                        </div>
                    </div>
                </div>

                <div 
                    onClick={() => setViewState('HISTORY')}
                    className="bg-black/50 backdrop-blur p-2 rounded-full border border-zinc-700 cursor-pointer"
                >
                    <svg className="w-6 h-6 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
            </div>

            {/* Reticle Animation */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-cyber-green/30 rounded-full flex items-center justify-center opacity-80">
                <div className="w-60 h-60 border border-dashed border-cyber-green/50 rounded-full animate-[spin_10s_linear_infinite]"></div>
                <div className="absolute w-2 h-2 bg-red-500 rounded-full"></div>
                {isScanning && (
                    <div className="absolute top-full mt-4 text-cyber-green font-mono text-sm animate-pulse bg-black/80 px-2 rounded">
                        READING BIOMETRICS...
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="pointer-events-auto pb-6 flex justify-center">
                <button 
                    onClick={handleScan}
                    disabled={isScanning}
                    className="bg-red-600/90 hover:bg-red-500 backdrop-blur border-2 border-red-400 text-white font-black text-xl tracking-widest py-4 px-12 rounded-full shadow-[0_0_30px_rgba(220,38,38,0.5)] transform transition-transform active:scale-95 disabled:opacity-50 disabled:grayscale"
                >
                    {isScanning ? 'SCANNING' : 'SCAN'}
                </button>
            </div>
        </div>
    </div>
  );
};

export default DBZScanner;
