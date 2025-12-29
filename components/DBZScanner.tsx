import React, { useState, useRef } from 'react';
import { DBZStats } from '../types';
import { generateDBZTaunt, generateSpeech, decodePCM } from '../services/geminiService';

const DBZScanner: React.FC = () => {
  const [stats, setStats] = useState<DBZStats>({
    anger: 5, determination: 5, excitement: 5, concentration: 5,
    fear: 1, sadness: 1, confusion: 1, anxiety: 1,
    calmness: 5, serenity: 5, contemplation: 5
  });

  const [result, setResult] = useState<{power: number, taunt: string} | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const updateStat = (key: keyof DBZStats, val: number) => {
      setStats(prev => ({ ...prev, [key]: val }));
  };

  const calculatePower = () => {
      const force = (stats.anger * 3) + (stats.determination * 2) + (stats.excitement * 1.5) + stats.concentration;
      const debuff = (stats.fear * 2) + (stats.sadness * 1.5) + stats.confusion + stats.anxiety;
      const control = 1 + (stats.calmness * 2) + (stats.serenity * 1.5) + stats.contemplation;
      
      let base = (force - debuff) * 1000;
      let multiplier = control / 10;

      if (stats.anger > 7 && stats.calmness < 3) multiplier *= 0.7; // Uncontrolled Rage
      if (stats.anger > 7 && stats.calmness > 7) multiplier *= 1.5; // Ultra Instinct

      let total = Math.max(0, base * multiplier);
      if (multiplier > 3) total = Math.pow(total, 1.1); // God tier boost

      return Math.floor(total);
  };

  const handleScan = async () => {
      setIsScanning(true);
      const power = calculatePower();
      try {
          const taunt = await generateDBZTaunt(power, { anger: stats.anger, calm: stats.calmness });
          
          setResult({ power, taunt });

          const audioBase64 = await generateSpeech(taunt, power > 500000 ? 'Kore' : 'Fenrir');
          if (audioBase64) {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              audioContextRef.current = ctx;
              
              // Correctly decode raw PCM (24kHz default for Gemini TTS)
              const buffer = decodePCM(audioBase64, ctx, 24000);
              
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(0);
          }

      } catch (e) {
          console.error(e);
      } finally {
          setIsScanning(false);
      }
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 p-6">
       <div className="flex-1 bg-zinc-900/30 p-6 border border-zinc-800 rounded-xl overflow-y-auto">
           <h3 className="text-xl font-bold font-sans text-cyber-green mb-6 border-b border-zinc-800 pb-2">BIOMETRIC INPUTS</h3>
           
           <div className="space-y-6">
               <div className="space-y-3">
                   <h4 className="text-xs font-mono text-red-400">FORCE PARAMETERS</h4>
                   {['anger', 'determination', 'excitement', 'concentration'].map(s => (
                       <div key={s} className="flex items-center justify-between">
                           <label className="text-xs uppercase w-24 font-mono text-zinc-400">{s}</label>
                           <input 
                            type="range" min="0" max="10" value={stats[s as keyof DBZStats]} 
                            onChange={(e) => updateStat(s as keyof DBZStats, Number(e.target.value))}
                            className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                           />
                           <span className="w-8 text-right font-mono text-sm">{stats[s as keyof DBZStats]}</span>
                       </div>
                   ))}
               </div>

               <div className="space-y-3">
                   <h4 className="text-xs font-mono text-blue-400">CONTROL PARAMETERS</h4>
                   {['calmness', 'serenity', 'contemplation'].map(s => (
                       <div key={s} className="flex items-center justify-between">
                           <label className="text-xs uppercase w-24 font-mono text-zinc-400">{s}</label>
                           <input 
                            type="range" min="0" max="10" value={stats[s as keyof DBZStats]} 
                            onChange={(e) => updateStat(s as keyof DBZStats, Number(e.target.value))}
                            className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                           />
                           <span className="w-8 text-right font-mono text-sm">{stats[s as keyof DBZStats]}</span>
                       </div>
                   ))}
               </div>
           </div>

           <button 
                onClick={handleScan}
                disabled={isScanning}
                className="w-full mt-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold tracking-widest uppercase font-mono transition-all clip-path-slant"
                style={{ clipPath: 'polygon(5% 0, 100% 0, 100% 90%, 95% 100%, 0 100%, 0 10%)' }}
           >
               {isScanning ? 'ANALYZING...' : 'INITIATE SCAN'}
           </button>
       </div>

       <div className="flex-1 flex flex-col items-center justify-center relative bg-black border border-zinc-800 rounded-xl overflow-hidden min-h-[400px]">
            {/* Scouter Overlay UI */}
            <div className="absolute inset-0 pointer-events-none opacity-50 z-10">
                <svg className="w-full h-full p-4" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <circle cx="50" cy="50" r="30" stroke="#00ff41" strokeWidth="0.5" fill="none" className="animate-spin-slow" />
                    <line x1="0" y1="50" x2="100" y2="50" stroke="#00ff41" strokeWidth="0.2" />
                    <line x1="50" y1="0" x2="50" y2="100" stroke="#00ff41" strokeWidth="0.2" />
                </svg>
            </div>

            {result ? (
                <div className="z-20 text-center p-8 w-full">
                    <div className="text-sm font-mono text-cyber-green mb-2 animate-pulse">POWER LEVEL CONFIRMED</div>
                    <div className="text-6xl md:text-8xl font-black font-sans text-white tracking-tighter mb-8 tabular-nums">
                        {result.power.toLocaleString()}
                    </div>
                    <div className="bg-zinc-900/80 p-6 border-l-4 border-red-500 text-left max-w-md mx-auto">
                        <p className="text-xs text-zinc-500 font-mono mb-1">PERSONA COMMENTARY</p>
                        <p className="font-sans text-lg italic text-zinc-200">"{result.taunt}"</p>
                    </div>
                </div>
            ) : (
                <div className="text-zinc-700 font-mono animate-pulse">SYSTEM STANDBY</div>
            )}
       </div>
    </div>
  );
};

export default DBZScanner;
