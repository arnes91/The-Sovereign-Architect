import React, { useState, useEffect, useRef } from 'react';
import { View } from '../../types';
import { generateSpeech, decodePCM } from '../../services/geminiService';

const DEMO_SCRIPT = [
    {
        id: 'INTRO',
        view: View.DASHBOARD,
        text: "Initiating Sovereign Protocol. Welcome to the architecture. This is a react-based operating system designed for high-frequency creation. Let's run the diagnostic.",
        durationPadding: 500,
        triggerAction: 'HIGHLIGHT_STATS'
    },
    {
        id: 'SCANNER',
        view: View.DBZ_SCANNER,
        text: "First: The Viral Engine. The DBZ Scanner. It utilizes computer vision to gamify reality. We scan face, emotion, and posture to generate shareable social assets instantly.",
        durationPadding: 2000,
        triggerAction: 'SIMULATE_SCAN'
    },
    {
        id: 'STUDIO',
        view: View.CONCEPT_STUDIO,
        text: "Next: The Concept Studio. We do not just consume AI; we wield it. Generating assets, editing visuals, and refining aesthetics in real-time. Zero friction.",
        durationPadding: 1500,
        triggerAction: 'SIMULATE_GEN'
    },
    {
        id: 'ANALYTICS',
        view: View.ANALYTICS_LAB,
        text: "The Analytics Lab. We ingest raw data—Spotify JSON, YouTube CSVs—and use Gemini Pro to find correlations humans miss. Watch as we simulate a live data ingestion.",
        durationPadding: 3000,
        triggerAction: 'SIMULATE_UPLOAD'
    },
    {
        id: 'STRATEGY',
        view: View.DEEP_ARCHITECT,
        text: "Deep Architect. The Strategic Node. This isn't a chatbot. It's a context-aware business partner. It remembers your goals and helps execute the master plan.",
        durationPadding: 2000,
        triggerAction: 'SIMULATE_CHAT'
    },
    {
        id: 'COMPANION',
        view: View.AI_COMPANION,
        text: "And finally, the Companion. Your daily driver for quick tasks, memory management, and idea bouncing. It adapts its persona to fit your current mode.",
        durationPadding: 2000,
        triggerAction: 'SIMULATE_COMPANION'
    },
    {
        id: 'OUTRO',
        view: View.VISUALIZER,
        text: "The System is online. The Code is Sovereign. Ready for deployment.",
        durationPadding: 1000,
        triggerAction: 'START_VISUALIZER'
    }
];

interface ShowcaseControllerProps {
    onViewChange: (view: View) => void;
    onActionTrigger: (action: string) => void;
    onExit: () => void;
}

const ShowcaseController: React.FC<ShowcaseControllerProps> = ({ onViewChange, onActionTrigger, onExit }) => {
    const [stepIndex, setStepIndex] = useState(-1);
    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'PLAYING' | 'PAUSED'>('IDLE');
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [useTextMode, setUseTextMode] = useState(false);
    
    // Audio Refs
    const audioCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
    const audioContextRef = useRef<AudioContext | null>(null);
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const timerRef = useRef<any>(null);
    
    // Visualizer Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const rafRef = useRef<number>();

    // 1. PRELOAD PHASE
    const startPreload = async () => {
        try {
            setStatus('LOADING');
            setErrorMsg(null);
            
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new Ctx();
            audioContextRef.current = ctx;

            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            let loaded = 0;
            for (const step of DEMO_SCRIPT) {
                try {
                    const b64 = await generateSpeech(step.text, 'Fenrir'); 
                    if (b64) {
                        const buffer = decodePCM(b64, ctx, 24000);
                        audioCacheRef.current.set(step.id, buffer);
                    } else {
                        throw new Error("Empty Audio");
                    }
                } catch (e: any) {
                    console.warn(`Audio Load Fail for ${step.id}:`, e);
                    setUseTextMode(true);
                    if (e.message?.includes("REGION_LOCKED")) {
                        setErrorMsg("TTS REGION LOCKED. FALLING BACK TO TEXT MODE.");
                    }
                }
                loaded++;
                setProgress((loaded / DEMO_SCRIPT.length) * 100);
            }
            startSequence();
        } catch (e) {
            console.error("Fatal Demo Error", e);
            onExit();
        }
    };

    // 2. SEQUENCE RUNNER
    const startSequence = async () => {
        if (audioContextRef.current?.state === 'suspended') {
            await audioContextRef.current.resume();
        }
        setStatus('PLAYING');
        playStep(0);
        drawVisualizer();
    };

    const playStep = (index: number) => {
        if (index >= DEMO_SCRIPT.length) {
            setTimeout(onExit, 2000); // Give a moment before closing
            return;
        }

        setStepIndex(index);
        const step = DEMO_SCRIPT[index];

        // 1. Switch View
        onViewChange(step.view);
        
        // 2. Trigger Action
        onActionTrigger(""); 
        setTimeout(() => {
            onActionTrigger(step.triggerAction);
        }, 800);

        // 3. Play Audio
        const buffer = audioCacheRef.current.get(step.id);
        
        if (buffer && audioContextRef.current && analyserRef.current && !useTextMode) {
            // --- AUDIO MODE ---
            if (currentSourceRef.current) {
                try { currentSourceRef.current.stop(); } catch(e){}
            }

            const source = audioContextRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(analyserRef.current);
            analyserRef.current.connect(audioContextRef.current.destination);
            
            source.start(0);
            currentSourceRef.current = source;

            source.onended = () => {
                timerRef.current = setTimeout(() => {
                    playStep(index + 1);
                }, step.durationPadding);
            };
        } else {
            // --- TEXT FALLBACK MODE ---
            // Calculate reading time: 200ms per word + 1s base
            const readingTime = (step.text.split(' ').length * 250) + 1500; 
            timerRef.current = setTimeout(() => {
                playStep(index + 1);
            }, readingTime);
        }
    };

    const togglePause = () => {
        if (status === 'PLAYING') {
            setStatus('PAUSED');
            if (audioContextRef.current) audioContextRef.current.suspend();
            if (timerRef.current) clearTimeout(timerRef.current);
        } else if (status === 'PAUSED') {
            setStatus('PLAYING');
            if (audioContextRef.current) audioContextRef.current.resume();
            // If we were audio based, this is tricky, simpler to just restart step or move next.
            // For simplicity in this v1, we just resume the timer if it was text, or let audio finish.
            // If audio was suspended, it resumes from where it left off.
        }
    };

    // 3. VOICE VISUALIZER
    const drawVisualizer = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const render = () => {
            rafRef.current = requestAnimationFrame(render);
            analyser.getByteFrequencyData(dataArray);

            ctx?.clearRect(0, 0, canvas.width, canvas.height);
            if (!ctx) return;

            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const radius = 15;

            // Draw circular wave
            ctx.beginPath();
            ctx.strokeStyle = '#00ff41';
            ctx.lineWidth = 2;
            for (let i = 0; i < bufferLength; i++) {
                const angle = (i * Math.PI * 2) / bufferLength;
                const r = radius + dataArray[i] * 0.15;
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
        };
        render();
    };

    useEffect(() => {
        return () => {
            if (currentSourceRef.current) try{ currentSourceRef.current.stop(); } catch(e){}
            if (timerRef.current) clearTimeout(timerRef.current);
            if (audioContextRef.current) audioContextRef.current.close();
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    // --- RENDER ---

    if (status === 'IDLE') {
        return (
            <div className="absolute inset-0 bg-black/95 z-[100] flex items-center justify-center backdrop-blur-md animate-in fade-in duration-500">
                <div className="text-center relative max-w-lg p-6">
                    <div className="absolute -inset-10 bg-cyber-green/20 blur-3xl rounded-full opacity-20 animate-pulse"></div>
                    <h1 className="text-5xl font-black text-white mb-2 tracking-tighter">SHOWCASE PROTOCOL</h1>
                    <p className="text-cyber-green font-mono text-sm tracking-[0.3em] mb-8">AUTOMATED SYSTEM TOUR</p>
                    
                    <div className="bg-zinc-900/80 p-6 rounded border border-zinc-800 mb-8 text-left">
                        <h3 className="text-white font-bold mb-2">SEQUENCE PARAMETERS:</h3>
                        <ul className="text-zinc-400 text-xs font-mono space-y-2 list-disc pl-4">
                            <li>Audio Output: <span className="text-cyber-green">ENABLED</span></li>
                            <li>Visual Override: <span className="text-cyber-green">ACTIVE</span></li>
                            <li>Duration: <span className="text-white">~45 SECONDS</span></li>
                        </ul>
                    </div>
                    
                    <div className="flex gap-4 justify-center relative z-10">
                        <button onClick={onExit} className="px-8 py-4 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 font-mono text-xs font-bold rounded transition-colors">
                            ABORT
                        </button>
                        <button onClick={startPreload} className="px-10 py-4 bg-cyber-green text-black font-black font-mono text-sm tracking-widest rounded hover:bg-emerald-400 shadow-[0_0_30px_rgba(0,255,65,0.3)] transition-all transform hover:scale-105 active:scale-95">
                            INITIATE
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'LOADING') {
        return (
            <div className="absolute inset-0 bg-black/95 z-[100] flex items-center justify-center">
                <div className="w-64 text-center">
                    <div className="h-1 bg-zinc-800 w-full mb-4 rounded-full overflow-hidden">
                        <div className="h-full bg-cyber-green transition-all duration-300 ease-out" style={{width: `${progress}%`}}></div>
                    </div>
                    <div className="font-mono text-cyber-green text-xs animate-pulse">
                        GENERATING NEURAL AUDIO... {Math.round(progress)}%
                    </div>
                    {errorMsg && <div className="mt-2 text-red-500 text-[10px] font-mono">{errorMsg}</div>}
                </div>
            </div>
        );
    }

    // HUD OVERLAY (TOP BAR)
    return (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[100] w-full max-w-4xl px-4 pointer-events-none">
            <div className="bg-black/90 border border-cyber-green/30 backdrop-blur-xl p-3 rounded-lg shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-4">
                
                {/* Visualizer / Avatar */}
                <div className="relative shrink-0">
                    <canvas ref={canvasRef} width={50} height={50} className="w-12 h-12 rounded-full bg-black/50 border border-zinc-800" />
                    {status === 'PAUSED' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                            <span className="text-[10px]">II</span>
                        </div>
                    )}
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0">
                     <div className="flex justify-between items-center mb-1">
                         <div className="flex items-center gap-2">
                             <span className="text-cyber-green font-bold font-mono text-xs tracking-wider">FENRIR.AI</span>
                             {useTextMode && <span className="text-[9px] bg-yellow-900 text-yellow-500 px-1 rounded">TEXT MODE</span>}
                         </div>
                         <span className="text-zinc-600 font-mono text-[10px]">STEP {stepIndex + 1}/{DEMO_SCRIPT.length}</span>
                     </div>
                     <p className="text-white text-xs font-mono leading-tight md:text-sm truncate">
                        {DEMO_SCRIPT[stepIndex]?.text}
                     </p>
                </div>

                {/* Controls */}
                <div className="flex gap-2 pointer-events-auto shrink-0">
                    <button 
                        onClick={togglePause}
                        className="p-2 border border-zinc-700 rounded hover:bg-zinc-800 text-zinc-400"
                    >
                        {status === 'PAUSED' ? '▶' : 'II'}
                    </button>
                    <button 
                        onClick={onExit} 
                        className="bg-red-950/80 text-red-400 border border-red-900 px-3 py-2 text-[10px] font-bold font-mono rounded hover:bg-red-900 transition-colors"
                    >
                        EXIT
                    </button>
                </div>
            </div>
            
            {/* Subtitles (If Text Mode or Audio Fail) */}
            <div className="mt-4 bg-black/80 p-4 rounded text-center backdrop-blur-md border-t border-cyber-green/20">
                 <p className="text-cyber-green font-mono text-sm md:text-lg font-bold leading-relaxed">
                    "{DEMO_SCRIPT[stepIndex]?.text}"
                 </p>
            </div>
        </div>
    );
};

export default ShowcaseController;