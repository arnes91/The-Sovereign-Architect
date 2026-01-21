
import React, { useState, useEffect, useRef } from 'react';
import { View } from '../../types';
import { generateSpeech, decodePCM } from '../../services/geminiService';

// --- THE EXPANDED SCRIPT ---
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
    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'PLAYING'>('IDLE');
    const [progress, setProgress] = useState(0);
    
    // Audio Refs
    const audioCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
    const audioContextRef = useRef<AudioContext | null>(null);
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
    
    // Visualizer Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const rafRef = useRef<number>();

    // 1. PRELOAD PHASE
    const startPreload = async () => {
        setStatus('LOADING');
        // Initialize Context IMMEDIATELY on user click to unlock browser autoplay policies
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new Ctx();
        audioContextRef.current = ctx;

        // Setup Analyser for the visualizer
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        let loaded = 0;
        for (const step of DEMO_SCRIPT) {
            try {
                // 'Fenrir' is the deep, authoritative director voice
                const b64 = await generateSpeech(step.text, 'Fenrir'); 
                if (b64) {
                    const buffer = decodePCM(b64, ctx, 24000);
                    audioCacheRef.current.set(step.id, buffer);
                }
                loaded++;
                setProgress((loaded / DEMO_SCRIPT.length) * 100);
            } catch (e) {
                console.error("Audio Load Fail", e);
            }
        }
        startSequence();
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
            onExit();
            return;
        }

        setStepIndex(index);
        const step = DEMO_SCRIPT[index];

        // 1. Switch View
        onViewChange(step.view);
        
        // 2. Trigger Action (Visuals)
        // Reset trigger first to allow re-triggering if needed (though unlikely in linear demo)
        onActionTrigger(""); 
        setTimeout(() => {
            onActionTrigger(step.triggerAction);
        }, 800);

        // 3. Play Audio
        const buffer = audioCacheRef.current.get(step.id);
        if (buffer && audioContextRef.current && analyserRef.current) {
            if (currentSourceRef.current) {
                try { currentSourceRef.current.stop(); } catch(e){}
            }

            const source = audioContextRef.current.createBufferSource();
            source.buffer = buffer;
            // Route through analyser for the visual effect
            source.connect(analyserRef.current);
            analyserRef.current.connect(audioContextRef.current.destination);
            
            source.start(0);
            currentSourceRef.current = source;

            source.onended = () => {
                setTimeout(() => {
                    playStep(index + 1);
                }, step.durationPadding);
            };
        } else {
            console.warn("Audio buffer missing for step", step.id);
            // Fallback: wait roughly the time it takes to read text
            const readingTime = step.text.split(' ').length * 300; 
            setTimeout(() => playStep(index + 1), readingTime);
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
            const radius = 20;

            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fillStyle = '#00ff41'; // Cyber Green
            ctx.fill();

            // Draw circular wave
            ctx.beginPath();
            ctx.strokeStyle = '#00ff41';
            ctx.lineWidth = 2;
            for (let i = 0; i < bufferLength; i++) {
                const angle = (i * Math.PI * 2) / bufferLength;
                const r = radius + dataArray[i] * 0.2;
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();

            // Glow
            const avg = dataArray.reduce((a,b) => a+b, 0) / bufferLength;
            if (avg > 20) {
                ctx.shadowBlur = avg;
                ctx.shadowColor = '#00ff41';
            } else {
                ctx.shadowBlur = 0;
            }
        };
        render();
    };

    useEffect(() => {
        return () => {
            if (currentSourceRef.current) try{ currentSourceRef.current.stop(); } catch(e){}
            if (audioContextRef.current) audioContextRef.current.close();
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    // --- RENDER ---

    if (status === 'IDLE') {
        return (
            <div className="absolute inset-0 bg-black/95 z-[100] flex items-center justify-center backdrop-blur-md animate-in fade-in duration-500">
                <div className="text-center relative">
                    <div className="absolute -inset-10 bg-cyber-green/20 blur-3xl rounded-full opacity-20 animate-pulse"></div>
                    <h1 className="text-5xl font-black text-white mb-2 tracking-tighter">SHOWCASE PROTOCOL</h1>
                    <p className="text-cyber-green font-mono text-sm tracking-[0.3em] mb-8">AUTOMATED SYSTEM TOUR</p>
                    
                    <p className="text-zinc-500 font-mono text-xs max-w-md mx-auto mb-8 leading-relaxed">
                        Initializing this sequence will hijack the UI navigation. 
                        The Sovereign Architect AI (Fenrir) will guide you through the modules.
                        <br/><br/>
                        <span className="text-white">Ensure audio is enabled.</span>
                    </p>
                    
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
                </div>
            </div>
        );
    }

    // OVERLAY DURING PLAYBACK
    return (
        <div className="absolute bottom-8 right-8 z-[100] pointer-events-none flex flex-col items-end gap-4">
            
            {/* AI Voice Visualizer */}
            <div className="bg-black/90 border border-cyber-green/30 backdrop-blur-xl p-4 rounded-lg flex items-center gap-4 shadow-2xl min-w-[300px]">
                <canvas ref={canvasRef} width={60} height={60} className="w-12 h-12" />
                <div className="flex-1">
                     <div className="flex items-center gap-2 mb-1">
                         <span className="text-cyber-green font-bold font-mono text-xs tracking-wider">FENRIR.AI</span>
                         <span className="flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-cyber-green opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyber-green"></span>
                         </span>
                     </div>
                     <p className="text-zinc-400 text-[10px] font-mono leading-tight h-8 overflow-hidden">
                        {DEMO_SCRIPT[stepIndex]?.text}
                     </p>
                </div>
            </div>
            
            <button 
                onClick={onExit} 
                className="pointer-events-auto bg-red-950/80 text-red-400 border border-red-900 px-4 py-2 text-[10px] font-bold font-mono rounded hover:bg-red-900 transition-colors"
            >
                TERMINATE DEMO
            </button>
        </div>
    );
};

export default ShowcaseController;
