
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { StorageService } from '../services/storageService';

// ... (Rest of imports and types remain same, just updating the key parts)

// --- Constants ---
const THEME = {
  primary: '#39c5bb',   // Miku Teal
  secondary: '#ff00ff', // Glitch Pink
  accent: '#ff3300',    // Alert Red
  background: '#050505',
  wave: '#00ffcc',      // Oscilloscope Cyan
  matrix: '#00ff41',    // Matrix Green
  textGlow: '#ffffff',
};

// --- Shader Source (Same as before) ---
const VERTEX_SHADER = `
  attribute vec2 position;
  void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform float uHueShift;

  float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }
  
  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    vec2 cUV = uv * 2.0 - 1.0;
    cUV.x *= uResolution.x / uResolution.y;

    if (uBass > 0.6) {
        cUV.x += (hash(vec2(uTime, cUV.y)) - 0.5) * 0.1 * uBass;
    }

    float r = length(cUV);
    float net = abs(sin(cUV.x * 10.0 + uTime) * sin(cUV.y * 10.0 - uTime));
    net = step(0.9, net);

    vec3 col = vec3(0.0);
    col += vec3(0.0, 0.1, 0.1) * (1.0 / (r + 0.1));

    float shock = 0.02 / abs(r - uBass * 1.2 + 0.1);
    col += vec3(0.0, 1.0, 0.8) * shock * uBass;
    
    float shock2 = 0.01 / abs(r - uMid * 1.5 + 0.2);
    col += vec3(1.0, 0.0, 0.8) * shock2 * uMid;

    float scan = sin(uv.y * 200.0 + uTime * 10.0);
    col *= (0.8 + 0.2 * scan);
    col *= 1.0 - r * 0.8;

    gl_FragColor = vec4(col, 1.0);
  }
`;

// Types
interface Particle {
  x: number; y: number; w: number; h: number; vx: number; vy: number; life: number; color: string; type: 'rect' | 'emoji'; char?: string;
}
interface LyricLine {
  time: number; duration?: number; text: string; style?: 'NORMAL' | 'GLITCH' | 'IMPACT' | 'SOFT'; emoji?: string;
}
interface ExportConfig {
  resolution: '1080p' | '4K'; aspectRatio: '16:9' | '9:16';
}

const Visualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);      
  const glCanvasRef = useRef<HTMLCanvasElement>(null);    
  const matrixCanvasRef = useRef<HTMLCanvasElement | null>(null); 
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const audioStartTimeRef = useRef<number>(0);

  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const uniformLocsRef = useRef<any>({});

  const particlesRef = useRef<Particle[]>([]);
  const matrixDropsRef = useRef<number[]>([]); 
  const currentLyricIndexRef = useRef<number>(-1);
  const lyricDecodedCharsRef = useRef<number>(0); 
  const hueShiftRef = useRef<number>(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [manualLyrics, setManualLyrics] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState<string>("SYSTEM READY");
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [exportConfig, setExportConfig] = useState<ExportConfig>({ resolution: '1080p', aspectRatio: '16:9' });

  // Helpers
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) { currentLine += " " + word; } else { lines.push(currentLine); currentLine = word; }
    }
    lines.push(currentLine);
    return lines;
  };

  const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
    return shader;
  };

  const initWebGL = useCallback(() => {
    const canvas = glCanvasRef.current;
    if (!canvas) return;
    
    // CRITICAL UPDATE: preserveDrawingBuffer: true
    const gl = canvas.getContext('webgl', { alpha: false, preserveDrawingBuffer: true });
    if (!gl) return;
    glRef.current = gl;

    const vert = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const frag = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vert || !frag) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    gl.useProgram(program);
    programRef.current = program;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    uniformLocsRef.current = {
      uTime: gl.getUniformLocation(program, 'uTime'),
      uResolution: gl.getUniformLocation(program, 'uResolution'),
      uBass: gl.getUniformLocation(program, 'uBass'),
      uMid: gl.getUniformLocation(program, 'uMid'),
      uHigh: gl.getUniformLocation(program, 'uHigh'),
      uHueShift: gl.getUniformLocation(program, 'uHueShift'),
    };
  }, []);

  useEffect(() => {
    return () => stopVisualization();
  }, []);

  const stopVisualization = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch(e) {}
        sourceRef.current.disconnect();
    }
    if (audioContextRef.current) audioContextRef.current.close();
    
    setIsPlaying(false);
    setIsExporting(false);
    audioContextRef.current = null;
    analyserRef.current = null;
    sourceRef.current = null;
    currentLyricIndexRef.current = -1;
  };

  const getDimensions = useCallback(() => {
    if (isPlaying || isExporting) {
       let w = 1920;
       let h = 1080;
       if (exportConfig.resolution === '4K') { w = 3840; h = 2160; }
       if (exportConfig.aspectRatio === '9:16') { const temp = w; w = h; h = temp; }
       return { w, h };
    }
    if (containerRef.current) {
       return { w: containerRef.current.clientWidth, h: containerRef.current.clientHeight };
    }
    return { w: 1920, h: 1080 };
  }, [isPlaying, isExporting, exportConfig]);

  const handleResize = useCallback(() => {
    const { w, h } = getDimensions();
    if (canvasRef.current) { canvasRef.current.width = w; canvasRef.current.height = h; }
    if (glCanvasRef.current) { glCanvasRef.current.width = w; glCanvasRef.current.height = h; }
    if (glRef.current) glRef.current.viewport(0, 0, w, h);
    if (!matrixCanvasRef.current) matrixCanvasRef.current = document.createElement('canvas');
    matrixCanvasRef.current.width = w;
    matrixCanvasRef.current.height = h;
    const fontSize = exportConfig.resolution === '4K' ? 32 : 16;
    const columns = Math.ceil(w / fontSize);
    matrixDropsRef.current = new Array(columns).fill(0).map(() => Math.random() * -100);
  }, [getDimensions, exportConfig]);

  useEffect(() => {
      window.addEventListener('resize', handleResize);
      handleResize();
      initWebGL();
      return () => window.removeEventListener('resize', handleResize);
  }, [handleResize, initWebGL, isPlaying]);

  // --- AI LYRICS V2 ---
  const generateLyrics = async (audioFile: File) => {
    if (!process.env.API_KEY) return;
    setIsAnalyzing(true);
    setStatus("NEURAL_SYNC_IN_PROGRESS...");
    try {
      const arrayBuffer = await audioFile.arrayBuffer();
      const base64Audio = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let contextInstruction = manualLyrics.length > 5 ? `Use this text as ground truth: """${manualLyrics}"""` : "";
      
      const prompt = `Listen to the audio. ${contextInstruction} Generate a JSON array of lyrics with timestamps. 
        Format: [{ "time": 0.5, "duration": 2.0, "text": "Hello world", "style": "NORMAL", "emoji": "👋" }]
        Styles: NORMAL, GLITCH, IMPACT, SOFT. STRICT JSON.`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts: [{ text: prompt }, { inlineData: { mimeType: audioFile.type || "audio/mp3", data: base64Audio } }] }
      });
      const jsonStr = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedLyrics = JSON.parse(jsonStr);
      setLyrics(parsedLyrics);
      await StorageService.saveKnowledgeItem({
          id: Date.now().toString(), type: 'NOTE', title: `Lyrics Sync: ${audioFile.name}`,
          content: JSON.stringify(parsedLyrics, null, 2), tags: ['lyrics', 'visualizer', 'auto-save'], createdAt: Date.now()
      });
      setStatus("DATA_SYNCED_AND_SAVED");
    } catch (e: any) {
      console.error("AI Error:", e);
      setStatus("AI_FAILED");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderTextEffect = (ctx: CanvasRenderingContext2D, lyric: LyricLine, x: number, y: number, bass: number, w: number) => {
    const baseSize = exportConfig.resolution === '4K' ? 100 : 50;
    let fontSize = baseSize;
    let color = '#ffffff';
    let glitchOffset = bass * 15;
    
    if (lyric.style === 'IMPACT') { fontSize *= 1.4; glitchOffset *= 3.0; color = THEME.secondary; } 
    else if (lyric.style === 'GLITCH') { fontSize *= 1.1; } 
    else if (lyric.style === 'SOFT') { color = THEME.wave; glitchOffset *= 0.2; }

    ctx.font = `900 ${fontSize}px "Courier New", monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    
    const lines = wrapText(ctx, lyric.text, w * 0.8);
    const lineHeight = fontSize * 1.2;
    let currentY = y - (lines.length * lineHeight / 2) + (lineHeight / 2);

    lines.forEach((line) => {
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.9)'; ctx.fillText(line, x - glitchOffset, currentY + glitchOffset);
        ctx.fillStyle = 'rgba(0, 255, 255, 0.9)'; ctx.fillText(line, x + glitchOffset, currentY - glitchOffset);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = color;
        ctx.shadowBlur = lyric.style === 'IMPACT' ? 30 * bass : 10;
        ctx.shadowColor = lyric.style === 'IMPACT' ? '#ff0000' : '#ffffff';
        ctx.fillText(line, x, currentY);
        ctx.shadowBlur = 0;
        currentY += lineHeight;
    });
    
    if (lyric.emoji && Math.random() < 0.05) {
        particlesRef.current.push({ x: x + (Math.random() - 0.5) * w * 0.6, y: y, w: fontSize, h: fontSize, vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 8, life: 1.0, color: '#fff', type: 'emoji', char: lyric.emoji });
    }
  };

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const glCanvas = glCanvasRef.current;
    const gl = glRef.current;
    const analyser = analyserRef.current;
    const ac = audioContextRef.current;
    if (!canvas || !glCanvas || !gl || !analyser || !ac) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const w = canvas.width; const h = canvas.height;
    const time = performance.now() / 1000;
    const currentTime = ac.currentTime - audioStartTimeRef.current;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    let bass = 0, mid = 0, high = 0;
    for(let i=0; i<10; i++) bass += dataArray[i];
    for(let i=10; i<100; i++) mid += dataArray[i];
    for(let i=100; i<bufferLength; i++) high += dataArray[i];
    bass = bass / 10 / 255; mid = mid / 90 / 255; high = high / (bufferLength - 100) / 255;
    
    if (bass > 0.6) hueShiftRef.current += 0.02;
    hueShiftRef.current += 0.001;
    
    const locs = uniformLocsRef.current;
    gl.uniform1f(locs.uTime, time);
    gl.uniform2f(locs.uResolution, w, h);
    gl.uniform1f(locs.uBass, bass);
    gl.uniform1f(locs.uMid, mid);
    gl.uniform1f(locs.uHigh, high);
    gl.uniform1f(locs.uHueShift, hueShiftRef.current % 1.0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    ctx.save();
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, w, h); // Clear frame
    
    if (bass > 0.4) {
        const shake = (bass - 0.4) * 30; const zoom = 1.0 + (bass * 0.05);
        ctx.translate(w/2, h/2); ctx.scale(zoom, zoom);
        ctx.translate(-w/2 + (Math.random() - 0.5) * shake, -h/2 + (Math.random() - 0.5) * shake);
    }

    ctx.drawImage(glCanvas, 0, 0);

    // Matrix Rain
    if (matrixCanvasRef.current) {
        const mCtx = matrixCanvasRef.current.getContext('2d');
        if (mCtx) {
            mCtx.fillStyle = 'rgba(0, 0, 0, 0.1)'; mCtx.fillRect(0, 0, w, h);
            const fontSize = exportConfig.resolution === '4K' ? 32 : 16;
            mCtx.font = `${fontSize}px monospace`;
            const drops = matrixDropsRef.current;
            for (let i = 0; i < drops.length; i++) {
                const char = String.fromCharCode(0x30A0 + Math.random() * 96);
                mCtx.fillStyle = (bass > 0.7 && Math.random() > 0.8) ? '#ffffff' : THEME.matrix;
                mCtx.fillText(char, i * fontSize, drops[i] * fontSize);
                if (drops[i] * fontSize > h && Math.random() > 0.98) drops[i] = 0;
                drops[i] += (bass * 3.0) + 1;
            }
            ctx.globalCompositeOperation = 'screen'; ctx.drawImage(matrixCanvasRef.current, 0, 0); ctx.globalCompositeOperation = 'source-over';
        }
    }

    // Waveform
    const timeDomain = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(timeDomain);
    const drawWave = (offsetY: number, color: string, width: number) => {
        ctx.lineWidth = width; ctx.strokeStyle = color; ctx.shadowBlur = 20 * bass; ctx.shadowColor = color; ctx.beginPath();
        const sliceW = w * 1.0 / bufferLength; let wx = 0;
        for(let i = 0; i < bufferLength; i++) {
            const v = timeDomain[i] / 128.0; const y = (v * h/2) + offsetY + (Math.random() - 0.5) * 50 * high;
            if(i === 0) ctx.moveTo(wx, y); else ctx.lineTo(wx, y); wx += sliceW;
        }
        ctx.stroke();
    };
    if (bass > 0.3) {
        drawWave((h/4) + (bass * 10), 'rgba(255,0,0,0.7)', 3); drawWave((h/4) - (bass * 10), 'rgba(0,255,255,0.7)', 3);
    } else {
        drawWave(h/4, '#ffffff', 4);
    }
    ctx.shadowBlur = 0;

    // Particles
    if (bass > 0.5) {
        for(let k=0; k<Math.floor(bass * 4); k++) {
            particlesRef.current.push({ x: Math.random() * w, y: Math.random() * h, w: Math.random() * 15 + 2, h: Math.random() * 15 + 2, vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15, life: 1.0, color: Math.random() > 0.5 ? '#fff' : THEME.secondary, type: 'rect' });
        }
    }
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i]; p.x += p.vx; p.y += p.vy; p.life -= 0.03;
        if (p.life <= 0) particlesRef.current.splice(i, 1);
        else { ctx.globalAlpha = p.life; if (p.type === 'emoji' && p.char) { ctx.font = `${p.w}px serif`; ctx.fillText(p.char, p.x, p.y); } else { ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.w, p.h); } ctx.globalAlpha = 1.0; }
    }

    // Lyrics
    const lyric = lyrics.find(l => currentTime >= l.time && currentTime < (l.time + (l.duration || 3.0)));
    if (lyric) {
        if (currentLyricIndexRef.current !== lyrics.indexOf(lyric)) { currentLyricIndexRef.current = lyrics.indexOf(lyric); lyricDecodedCharsRef.current = 0; }
        if (lyricDecodedCharsRef.current < lyric.text.length) lyricDecodedCharsRef.current += 1.5;
        let textToShow = lyric.text.substring(0, Math.floor(lyricDecodedCharsRef.current));
        renderTextEffect(ctx, {...lyric, text: textToShow}, w/2, h/2, bass, w);
    }

    ctx.restore();
    
    // Scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    for(let y = 0; y < h; y += 4) { if (y % 8 === 0) ctx.fillRect(0, y, w, 2); }

    animationFrameRef.current = requestAnimationFrame(renderFrame);
  }, [exportConfig, lyrics]);

  const initializeAudio = async (mode: 'PLAY' | 'EXPORT') => {
    if (!file) return;
    stopVisualization();
    handleResize();

    const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
    const actx = new CtxClass();
    const analyser = actx.createAnalyser();
    analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.8;

    setStatus("INITIALIZING CORE...");
    try {
        const ab = await file.arrayBuffer();
        const decoded = await actx.decodeAudioData(ab);
        const source = actx.createBufferSource();
        source.buffer = decoded;
        source.connect(analyser);
        analyser.connect(actx.destination);

        if (mode === 'EXPORT') {
            setIsExporting(true);
            setStatus("WARMING UP NEURAL RENDERER...");
            
            // 1. WARMUP PHASE: Play silently for a moment to sync clocks
            const dest = actx.createMediaStreamDestination();
            source.connect(dest);
            audioStartTimeRef.current = actx.currentTime + 1.0; // Future start
            source.start(actx.currentTime + 1.0); // Start later
            
            // Start rendering visual loop immediately to ensure canvas is active
            audioContextRef.current = actx;
            analyserRef.current = analyser;
            sourceRef.current = source;
            setIsPlaying(true);
            renderFrame();

            // 2. DELAYED RECORDING START (Fixes Green Screen/Black Frames)
            setTimeout(() => {
                setStatus("RECORDING...");
                if (canvasRef.current) {
                    const stream = canvasRef.current.captureStream(60);
                    stream.addTrack(dest.stream.getAudioTracks()[0]);
                    
                    const options = { mimeType: 'video/mp4', videoBitsPerSecond: exportConfig.resolution === '4K' ? 30000000 : 8000000 };
                    if (!MediaRecorder.isTypeSupported(options.mimeType)) options.mimeType = 'video/webm;codecs=vp9';

                    const rec = new MediaRecorder(stream, options);
                    mediaRecorderRef.current = rec;
                    recordedChunksRef.current = [];
                    rec.ondataavailable = e => { if(e.data.size>0) recordedChunksRef.current.push(e.data); };
                    rec.onstop = () => {
                        const blob = new Blob(recordedChunksRef.current, {type: options.mimeType});
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = `glitch_render_${exportConfig.resolution}.mp4`; a.click();
                        setIsExporting(false); setStatus("RENDER_COMPLETE"); setIsPlaying(false);
                    };
                    rec.start();
                }
            }, 1000); // 1 Second Warmup
        } else {
            audioStartTimeRef.current = actx.currentTime;
            source.start(0);
            audioContextRef.current = actx;
            analyserRef.current = analyser;
            sourceRef.current = source;
            setIsPlaying(true);
            renderFrame();
        }

        source.onended = () => { if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop(); setIsPlaying(false); setStatus("SEQUENCE_ENDED"); };

    } catch (e) { console.error(e); setStatus("CORE_FAILURE"); }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setLyrics([]); } };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black overflow-hidden select-none font-mono text-white flex items-center justify-center">
      <canvas ref={glCanvasRef} className="absolute top-0 left-0 w-full h-full invisible pointer-events-none" />
      <canvas ref={canvasRef} className="block max-w-full max-h-full object-contain shadow-[0_0_50px_rgba(0,255,204,0.1)]" style={{ aspectRatio: exportConfig.aspectRatio === '16:9' ? '16/9' : '9/16' }} />

      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
         <div className="absolute top-4 left-4 text-[#39c5bb] text-xs border-l-2 border-[#39c5bb] pl-2 bg-black/50 p-2">
            <p>SYSTEM: {status}</p>
            <p>RES: {exportConfig.resolution} // {exportConfig.aspectRatio}</p>
         </div>

         {!isPlaying && (
            <div className="pointer-events-auto bg-black/90 border border-[#39c5bb] p-6 text-center shadow-[0_0_100px_rgba(57,197,187,0.3)] max-w-2xl w-full backdrop-blur-xl overflow-y-auto max-h-[90vh]">
                <h1 className="text-4xl font-black mb-2 tracking-tighter text-white italic" style={{textShadow: '4px 4px #ff00ff'}}>MIKU VAJFUŠA // PROTOCOL</h1>
                <input type="file" ref={fileInputRef} onChange={handleFile} accept="audio/*" className="hidden" />
                {!file ? (
                    <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-[#39c5bb] px-8 py-6 hover:bg-[#39c5bb] hover:text-black transition-colors font-bold tracking-widest text-2xl text-[#39c5bb] mb-4">LOAD AUDIO FILE</button>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                             <div className="border border-gray-700 p-3 text-left">
                                 <p className="text-gray-500 mb-2 font-bold">ASPECT RATIO</p>
                                 <div className="flex gap-2"><button onClick={() => setExportConfig(p => ({...p, aspectRatio: '16:9'}))} className={`flex-1 py-2 ${exportConfig.aspectRatio === '16:9' ? 'bg-[#39c5bb] text-black font-bold' : 'bg-gray-800'}`}>16:9</button><button onClick={() => setExportConfig(p => ({...p, aspectRatio: '9:16'}))} className={`flex-1 py-2 ${exportConfig.aspectRatio === '9:16' ? 'bg-[#39c5bb] text-black font-bold' : 'bg-gray-800'}`}>9:16</button></div>
                             </div>
                             <div className="border border-gray-700 p-3 text-left">
                                 <p className="text-gray-500 mb-2 font-bold">QUALITY</p>
                                 <div className="flex gap-2"><button onClick={() => setExportConfig(p => ({...p, resolution: '1080p'}))} className={`flex-1 py-2 ${exportConfig.resolution === '1080p' ? 'bg-[#39c5bb] text-black font-bold' : 'bg-gray-800'}`}>FHD</button><button onClick={() => setExportConfig(p => ({...p, resolution: '4K'}))} className={`flex-1 py-2 ${exportConfig.resolution === '4K' ? 'bg-[#39c5bb] text-black font-bold' : 'bg-gray-800'}`}>4K</button></div>
                             </div>
                        </div>
                        <div className="border border-gray-700 p-4 text-left">
                            <p className="text-[#ff00ff] font-bold mb-2">NEURAL LYRICS ENGINE</p>
                            <textarea value={manualLyrics} onChange={(e) => setManualLyrics(e.target.value)} placeholder="Paste lyrics or prompt here..." className="w-full h-24 bg-gray-900 border border-gray-700 p-2 text-xs text-white mb-2 focus:border-[#ff00ff] outline-none" />
                            {lyrics.length === 0 ? (<button onClick={() => file && generateLyrics(file)} disabled={isAnalyzing} className="w-full bg-[#ff00ff]/20 border border-[#ff00ff] text-[#ff00ff] py-2 font-bold hover:bg-[#ff00ff] hover:text-black transition-colors">{isAnalyzing ? "ANALYZING WAVEFORMS..." : "GENERATE SYNCED LYRICS"}</button>) : (<div className="text-[#00ff41] text-xs font-bold flex justify-between items-center bg-[#00ff41]/10 p-2 border border-[#00ff41]"><span>LYRICS SYNCED: {lyrics.length} LINES</span><button onClick={() => setLyrics([])} className="underline hover:text-white">RESET</button></div>)}
                        </div>
                        <div className="flex gap-4 mt-2">
                            <button onClick={() => initializeAudio('PLAY')} className="flex-1 bg-white text-black px-6 py-4 font-black tracking-widest hover:bg-[#39c5bb] transition-colors text-xl">PREVIEW</button>
                            <button onClick={() => initializeAudio('EXPORT')} className="flex-1 bg-black border-2 border-[#ff00ff] text-[#ff00ff] px-6 py-4 font-black tracking-widest hover:bg-[#ff00ff] hover:text-black transition-all text-xl shadow-[0_0_15px_#ff00ff]">RENDER VIDEO</button>
                        </div>
                    </div>
                )}
            </div>
         )}
         
         {isExporting && (
             <div className="absolute top-8 right-8 flex flex-col items-end gap-2 animate-pulse">
                 <div className="bg-red-600 text-white font-black px-4 py-2 text-xl shadow-[0_0_20px_red]">REC ● {exportConfig.resolution}</div>
                 <div className="text-right"><p className="text-xs text-gray-400">WARMING UP BUFFER...</p><p className="text-xs text-red-500 font-bold">DO NOT CLOSE TAB</p></div>
             </div>
         )}
         
         {isPlaying && !isExporting && <button onClick={stopVisualization} className="absolute bottom-8 border border-white/20 bg-black/80 text-white hover:bg-white hover:text-black px-8 py-2 font-bold tracking-widest backdrop-blur transition-all">ABORT SEQUENCE</button>}
      </div>
    </div>
  );
};

export default Visualizer;
