
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
  const [currentBattleClass, setCurrentBattleClass] = useState<string>('');
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1);
  const [scannedImage, setScannedImage] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
      if (viewState === 'HUD') startCamera();
      else stopCamera();
      return () => stopCamera();
  }, [viewState]);

  // Draw Radar Chart when Result view is active
  useEffect(() => {
      if (viewState === 'RESULT' && currentStats && radarCanvasRef.current) {
          drawRadarChart(currentStats);
      }
  }, [viewState, currentStats]);

  const startCamera = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
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

  const drawRadarChart = (stats: DBZStats) => {
      const canvas = radarCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const centerX = w / 2;
      const centerY = h / 2;
      const radius = w / 2 - 20;

      // Labels: Anger, Focus, Spirit, Calm, Pride
      const labels = ['RAGE', 'FOCUS', 'SPIRIT', 'CALM', 'PRIDE'];
      const values = [
          stats.anger, 
          (stats.concentration + stats.determination)/2, 
          (stats.excitement + stats.joy)/2, 
          stats.calmness, 
          stats.pride
      ];

      ctx.clearRect(0, 0, w, h);

      // Draw Grid
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      for (let r = 0.2; r <= 1; r += 0.2) {
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
              const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
              const x = centerX + Math.cos(angle) * radius * r;
              const y = centerY + Math.sin(angle) * radius * r;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
      }

      // Draw Data
      ctx.beginPath();
      ctx.fillStyle = 'rgba(0, 255, 65, 0.2)';
      ctx.strokeStyle = '#00ff41';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const val = values[i] / 10; // Normalize 0-1
          const x = centerX + Math.cos(angle) * radius * val;
          const y = centerY + Math.sin(angle) * radius * val;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw Labels
      ctx.fillStyle = '#fff';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'center';
      for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const x = centerX + Math.cos(angle) * (radius + 15);
          const y = centerY + Math.sin(angle) * (radius + 15);
          ctx.fillText(labels[i], x, y);
      }
  };

  const handleScan = async () => {
      if (user.energy <= 0 && !user.isPremium) {
          alert("OUT OF ENERGY! Watch an Ad or Upgrade.");
          setViewState('PROFILE');
          return;
      }

      setIsScanning(true);
      
      try {
          if (!videoRef.current || !canvasRef.current) throw new Error("Camera Error");
          const ctx = canvasRef.current.getContext('2d');
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          ctx?.drawImage(videoRef.current, 0, 0);
          const base64Img = canvasRef.current.toDataURL('image/jpeg', 0.7);
          setScannedImage(base64Img);

          const stats = await HumeService.simulateScan(base64Img);
          const { power, battleClass, multiplier } = HumeService.calculatePowerLevel(stats);
          
          setCurrentStats(stats);
          setCurrentPower(power);
          setCurrentBattleClass(battleClass);
          setCurrentMultiplier(multiplier);

          // Determine Persona
          const persona = HumeService.determinePersona(power, stats);
          setCurrentPersona(persona.name);

          // Generate Content
          const { text } = await generateDBZTaunt(power, stats);
          setCurrentTaunt(text);

          const audioB64 = await generateSpeech(text, persona.voice);
          if (audioB64) playAudio(audioB64);

          GamificationService.consumeEnergy();
          const updatedUser = GamificationService.addXp(150);
          setUser(updatedUser);

          await StorageService.saveScan({
              id: Date.now().toString(),
              timestamp: Date.now(),
              power,
              taunt: text,
              stats,
              character: persona.name,
              imageUrl: base64Img,
              battleClass,
              potentialMultiplier: multiplier
          });

          setViewState('RESULT');

      } catch (e) {
          console.error(e);
          alert("Scanner Malfunction.");
      } finally {
          setIsScanning(false);
      }
  };

  const handleShare = async () => {
      const report = `
⚡ SOVEREIGN SCOUTER REPORT ⚡
---------------------------
SUBJECT: ${user.username}
POWER LEVEL: ${currentPower.toLocaleString()}
CLASS: ${currentBattleClass}
MULTIPLIER: ${currentMultiplier}x

ANALYSIS BY: ${currentPersona.toUpperCase()}
"${currentTaunt}"

Get scanned at Brzi.AI
---------------------------
      `;
      
      try {
          await navigator.clipboard.writeText(report);
          alert("REPORT COPIED TO CLIPBOARD.\nPaste it in Discord or Twitter.");
      } catch (e) {
          alert("Failed to copy report.");
      }
  };

  // --- SUB-VIEWS ---

  const ResultView = () => (
      <div className="flex flex-col h-full bg-black relative overflow-y-auto pb-8">
          {/* Header BG */}
          <div className="h-64 relative shrink-0">
               {scannedImage && (
                  <div className="absolute inset-0">
                      <img src={scannedImage} className="w-full h-full object-cover opacity-50" />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black"></div>
                  </div>
              )}
              <div className="absolute bottom-4 left-0 right-0 text-center z-10">
                   <div className="text-cyber-green font-mono text-xs tracking-widest animate-pulse mb-1">TARGET LOCKED</div>
                   <div className="text-6xl font-black text-white italic tracking-tighter drop-shadow-lg transform -skew-x-12">
                      {currentPower.toLocaleString()}
                   </div>
              </div>
          </div>

          <div className="px-6 -mt-6 relative z-10 space-y-4">
              {/* Battle Class Badge */}
              <div className="bg-zinc-900 border border-zinc-700 p-3 rounded flex justify-between items-center shadow-lg">
                  <div>
                      <div className="text-[10px] text-zinc-500 font-mono">BATTLE CLASS</div>
                      <div className="text-white font-bold uppercase">{currentBattleClass}</div>
                  </div>
                  <div className="text-right">
                      <div className="text-[10px] text-zinc-500 font-mono">POTENTIAL</div>
                      <div className="text-yellow-400 font-mono">{currentMultiplier}x</div>
                  </div>
              </div>

              {/* Persona Comment */}
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-l-4 border-cyber-green p-4 rounded shadow-lg">
                   <div className="flex items-center gap-2 mb-2">
                       <span className="text-xs font-bold bg-cyber-green text-black px-2 py-0.5 rounded">{currentPersona}</span>
                       <span className="text-[10px] text-zinc-500">AUDIO LOG</span>
                   </div>
                   <p className="text-zinc-200 italic font-medium leading-relaxed">"{currentTaunt}"</p>
              </div>

              {/* Radar Chart */}
              <div className="bg-black border border-zinc-800 rounded p-4 flex flex-col items-center">
                  <h4 className="text-xs font-mono text-zinc-500 mb-4 w-full text-left">SPIRIT SIGNATURE</h4>
                  <canvas ref={radarCanvasRef} width={200} height={200} className="w-48 h-48" />
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                  <button onClick={handleShare} className="bg-blue-600 hover:bg-blue-500 text-white py-3 rounded font-bold text-sm shadow-lg flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                      COPY REPORT
                  </button>
                  <button onClick={() => setViewState('HUD')} className="bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded font-bold text-sm border border-zinc-700">
                      SCAN AGAIN
                  </button>
              </div>
          </div>
      </div>
  );

  const ProfileView = () => (
      <div className="flex flex-col h-full bg-zinc-900 p-6 overflow-y-auto">
          <div className="text-center mb-8">
              <div className="w-24 h-24 mx-auto bg-gradient-to-tr from-cyber-green to-blue-500 rounded-full flex items-center justify-center border-4 border-white mb-4 shadow-[0_0_20px_rgba(0,255,65,0.4)]">
                  <span className="text-3xl font-black text-black">{user.level}</span>
              </div>
              <h2 className="text-2xl font-bold text-white">{user.username}</h2>
              <p className="text-cyber-green font-mono text-sm">{user.isPremium ? "PREMIUM WARRIOR" : "FREE USER"}</p>
          </div>
          {/* Energy and Upgrades similar to before... */}
           <button onClick={() => setViewState('HUD')} className="mt-auto py-4 text-zinc-400 font-mono text-sm">BACK TO SCANNER</button>
      </div>
  );

  const HistoryView = () => {
      const [scans, setScans] = useState<DBZScanResult[]>([]);
      useEffect(() => {
          StorageService.getScans().then(setScans);
      }, []);
      return (
      <div className="h-full bg-black p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
                 <h2 className="text-white font-bold text-xl">SCAN LOG</h2>
                 <button onClick={() => setViewState('HUD')} className="text-xs text-cyber-green font-mono">CLOSE</button>
          </div>
          <div className="space-y-4">
              {scans.map(h => (
                  <div key={h.id} className="flex gap-4 bg-zinc-900 p-3 rounded border border-zinc-800">
                      {h.imageUrl && <img src={h.imageUrl} className="w-16 h-16 object-cover rounded bg-zinc-800" />}
                      <div className="flex-1">
                          <div className="flex justify-between">
                              <span className="text-xl font-black text-white">{h.power.toLocaleString()}</span>
                              <span className="text-[10px] bg-zinc-800 px-1 rounded text-zinc-400">{h.battleClass}</span>
                          </div>
                          <div className="text-xs text-zinc-500">{new Date(h.timestamp).toLocaleDateString()}</div>
                          <div className="text-xs text-yellow-500 truncate mt-1">{h.character}: "{h.taunt}"</div>
                      </div>
                  </div>
              ))}
          </div>
      </div>
      );
  };

  // --- HUD RENDER ---
  if (viewState === 'PROFILE') return <ProfileView />;
  if (viewState === 'RESULT') return <ResultView />;
  if (viewState === 'HISTORY') return <HistoryView />;

  return (
    <div className="h-full flex flex-col bg-black relative overflow-hidden">
        <div className="absolute inset-0 z-0">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
        </div>
        
        {/* HUD UI Overlay (Top/Bottom bars) same as before, simplified for this snippet */}
        <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 pointer-events-none">
            <div className="flex justify-between items-start pointer-events-auto">
                 <div onClick={() => setViewState('PROFILE')} className="bg-black/50 backdrop-blur border border-cyber-green/50 rounded-lg p-2 flex items-center gap-3 cursor-pointer">
                    <span className="text-white font-bold text-sm">LVL {user.level}</span>
                    <div className="flex gap-0.5">
                            {[...Array(user.maxEnergy)].map((_, i) => (
                                <div key={i} className={`w-1.5 h-3 rounded-sm ${i < user.energy ? 'bg-yellow-400' : 'bg-zinc-700'}`}></div>
                            ))}
                    </div>
                 </div>
                 <div onClick={() => setViewState('HISTORY')} className="bg-black/50 p-2 rounded-full border border-zinc-700 cursor-pointer">
                    <svg className="w-6 h-6 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </div>
            </div>

            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                {/* Custom Reticle */}
                <svg width="250" height="250" viewBox="0 0 100 100" className={`opacity-80 ${isScanning ? 'animate-spin' : ''}`}>
                    <circle cx="50" cy="50" r="45" stroke="#00ff41" strokeWidth="1" fill="none" strokeDasharray="10 5" />
                    <path d="M50 5 L50 15 M50 85 L50 95 M5 50 L15 50 M85 50 L95 50" stroke="#00ff41" strokeWidth="2" />
                </svg>
            </div>

            <div className="pointer-events-auto pb-6 flex justify-center">
                <button 
                    onClick={handleScan}
                    disabled={isScanning}
                    className="bg-red-600/90 hover:bg-red-500 backdrop-blur border-2 border-red-400 text-white font-black text-xl tracking-widest py-4 px-12 rounded-full shadow-[0_0_30px_rgba(220,38,38,0.5)] transform transition-transform active:scale-95 disabled:opacity-50 disabled:grayscale"
                >
                    {isScanning ? 'READING...' : 'SCAN'}
                </button>
            </div>
        </div>
    </div>
  );
};

export default DBZScanner;
