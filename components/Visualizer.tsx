import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

interface LyricLine {
  time: number;
  duration?: number;
  text: string;
  style?: 'NORMAL' | 'GLITCH' | 'IMPACT' | 'SOFT';
  emoji?: string;
}

interface Particle {
  x: number; y: number; w: number; h: number;
  vx: number; vy: number; life: number;
  color: string; type: 'rect' | 'emoji'; char?: string;
}

const SHADER = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  
  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    vec2 p = uv * 2.0 - 1.0;
    p.x *= uResolution.x / uResolution.y;

    if (uBass > 0.7 && sin(uTime * 30.0) > 0.5) {
      p.x += sin(p.y * 30.0 + uTime * 20.0) * 0.05 * uBass;
    }

    float r = length(p);
    float a = atan(p.y, p.x);
    
    float z = uTime * 4.0 + uBass * 2.0;
    float tunnel = sin(r * 30.0 - z) * cos(a * 8.0 + z * 0.5);
    
    float shock = step(0.95, sin(r * 15.0 - uTime * 8.0)) * uBass;
    
    vec3 col = vec3(0.02, 0.1, 0.12) / (abs(tunnel) + 0.1); 
    col += vec3(1.0, 0.0, 1.0) * shock; 
    
    col *= (1.0 - r * 0.8);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const Visualizer: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [manualLyrics, setManualLyrics] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState("SYSTEM READY");
  const [exportConfig, setExportConfig] = useState({ resolution: '1080p', aspectRatio: '16:9' });
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glCanvasRef = useRef<HTMLDivElement>(null);
  const matrixCanvasRef = useRef<HTMLCanvasElement>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioStartTimeRef = useRef<number>(0);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  const animationFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const matrixDropsRef = useRef<number[]>([]);
  
  const currentLyricIndexRef = useRef<number>(-1);
  const lyricDecodedCharsRef = useRef<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // THREE.js setup
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    if (!glCanvasRef.current) return;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
    renderer.setSize(1280, 720); // Default, updated on start
    rendererRef.current = renderer;
    glCanvasRef.current.appendChild(renderer.domElement);
    
    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1280, 720) },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uHigh: { value: 0 }
    };
    
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `void main() { gl_Position = vec4(position, 1.0); }`,
      fragmentShader: SHADER
    });
    materialRef.current = material;
    
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(plane);
    sceneRef.current = scene;

    return () => {
      renderer.dispose();
      if (glCanvasRef.current) glCanvasRef.current.innerHTML = '';
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setStatus("DECODING AUDIO BUFFER...");
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      const arrayBuffer = await f.arrayBuffer();
      const buffer = await ctx.decodeAudioData(arrayBuffer);
      audioBufferRef.current = buffer;
      setStatus("AUDIO READY");
    }
  };

  const generateLyrics = async () => {
    if (!file || !manualLyrics) return;
    setIsAnalyzing(true);
    setStatus("NEURAL LYRICS ENGINE: ANALYZING...");
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const res = await fetch('/api/lyrics-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          lyrics: manualLyrics, 
          audioBase64: base64,
          mimeType: file.type || 'audio/mp3' 
        })
      });
      const data = await res.json();
      setLyrics(data.cues || []);
      setStatus("LYRICS SYNC COMPLETE");
    } catch (e) {
      console.error(e);
      setStatus("NEURAL LYRICS ENGINE: FAILED");
    }
    setIsAnalyzing(false);
  };

  const startPlayback = (exportMode: boolean) => {
    if (!audioBufferRef.current || !audioContextRef.current) return;
    
    setIsPlaying(true);
    setIsExporting(exportMode);
    setStatus(exportMode ? "RENDER PROTOCOL ENGAGED" : "PREVIEW MODE ACTIVE");

    let w = 1280;
    let h = 720;
    if (exportConfig.aspectRatio === '9:16') {
      w = 720; h = 1280;
    }
    if (exportConfig.resolution === '4K') {
      w *= 2; h *= 2;
    }

    if (canvasRef.current) {
      canvasRef.current.width = w;
      canvasRef.current.height = h;
    }
    if (matrixCanvasRef.current) {
      matrixCanvasRef.current.width = w;
      matrixCanvasRef.current.height = h;
    }
    if (rendererRef.current && materialRef.current) {
      rendererRef.current.setSize(w, h);
      materialRef.current.uniforms.uResolution.value.set(w, h);
    }

    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const dest = exportMode ? ctx.createMediaStreamDestination() : ctx.destination;

    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;
    
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    
    source.connect(analyser);
    analyser.connect(dest);

    if (exportMode) {
      // Connect to speakers as well to hear it
      analyser.connect(ctx.destination);
    }

    analyserRef.current = analyser;
    sourceRef.current = source;
    
    // Matrix init
    const cols = Math.floor(w / 20);
    matrixDropsRef.current = new Array(cols).fill(0).map(() => Math.random() * -100);
    particlesRef.current = [];
    currentLyricIndexRef.current = -1;
    lyricDecodedCharsRef.current = 0;

    if (exportMode && canvasRef.current && dest instanceof MediaStreamAudioDestinationNode) {
      const vStream = canvasRef.current.captureStream(60);
      const aStream = dest.stream;
      const combined = new MediaStream([...vStream.getVideoTracks(), ...aStream.getAudioTracks()]);
      
      const mediaRecorder = new MediaRecorder(combined, { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 8000000 });
      recordedChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MikuVajfusa_${Date.now()}.webm`;
        a.click();
        setStatus("EXPORT COMPLETE");
        setIsExporting(false);
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
    }

    audioStartTimeRef.current = ctx.currentTime;
    source.start(0);
    source.onended = () => {
      stopPlayback();
    };

    loop();
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch(e) {}
      sourceRef.current.disconnect();
    }
    cancelAnimationFrame(animationFrameRef.current);
    setStatus("SYSTEM READY");
  };

  const loop = () => {
    if (!analyserRef.current || !canvasRef.current || !matrixCanvasRef.current || !audioContextRef.current) return;
    
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    
    const analyser = analyserRef.current;
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);
    const timeData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(timeData);

    let bass = 0, mid = 0, high = 0;
    for(let i=0; i<10; i++) bass += freqData[i];
    for(let i=10; i<100; i++) mid += freqData[i];
    for(let i=100; i<500; i++) high += freqData[i];
    bass = (bass / 10) / 255;
    mid = (mid / 90) / 255;
    high = (high / 400) / 255;

    // WebGL
    if (materialRef.current && rendererRef.current && sceneRef.current && cameraRef.current) {
      materialRef.current.uniforms.uTime.value += 0.01 + bass * 0.05;
      materialRef.current.uniforms.uBass.value = bass;
      materialRef.current.uniforms.uMid.value = mid;
      materialRef.current.uniforms.uHigh.value = high;
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }

    // Contexts
    const ctx = canvasRef.current.getContext('2d')!;
    const mCtx = matrixCanvasRef.current.getContext('2d')!;

    // Camera Shake
    ctx.save();
    if (bass > 0.8) {
      const shakeX = (Math.random() - 0.5) * bass * 40;
      const shakeY = (Math.random() - 0.5) * bass * 40;
      const zoom = 1.0 + bass * 0.1;
      ctx.translate(w/2 + shakeX, h/2 + shakeY);
      ctx.scale(zoom, zoom);
      ctx.translate(-w/2, -h/2);
    }

    // Clear
    ctx.clearRect(0, 0, w, h);
    
    // Draw WebGL background to main canvas
    if (rendererRef.current) {
      ctx.drawImage(rendererRef.current.domElement, 0, 0, w, h);
    }

    // Matrix Rain
    mCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    mCtx.fillRect(0, 0, w, h);
    mCtx.fillStyle = '#00ff41';
    mCtx.font = '20px monospace';
    for (let i = 0; i < matrixDropsRef.current.length; i++) {
      const char = String.fromCharCode(0x30A0 + Math.random() * 96);
      const x = i * 20;
      const y = matrixDropsRef.current[i];
      mCtx.fillText(char, x, y);
      if (y > h && Math.random() > 0.95) {
        matrixDropsRef.current[i] = 0;
      }
      matrixDropsRef.current[i] += 5 + bass * 15;
    }
    ctx.drawImage(matrixCanvasRef.current, 0, 0, w, h);

    // Oscilloscope Waveform
    ctx.lineWidth = 4;
    const sliceWidth = w * 1.0 / analyser.frequencyBinCount;
    
    const drawWave = (color: string, offsetX: number) => {
      ctx.beginPath();
      let x = 0;
      for (let i = 0; i < analyser.frequencyBinCount; i++) {
        const v = timeData[i] / 128.0;
        const y = v * h / 2;
        if (i === 0) ctx.moveTo(x + offsetX, y);
        else ctx.lineTo(x + offsetX, y);
        x += sliceWidth;
      }
      ctx.strokeStyle = color;
      ctx.stroke();
    };

    if (bass > 0.7) {
      drawWave('rgba(255,0,0,0.8)', -10 * bass);
      drawWave('rgba(0,255,255,0.8)', 10 * bass);
    } else {
      drawWave('#00ffcc', 0);
    }

    // Particles
    if (bass > 0.85 && Math.random() > 0.5) {
      for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 5 + Math.random() * 15;
        const isEmoji = Math.random() > 0.8;
        particlesRef.current.push({
          x: w/2, y: h/2, w: 10 + Math.random()*20, h: 10 + Math.random()*20,
          vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, life: 1.0,
          color: Math.random() > 0.5 ? '#ff00ff' : '#00ffff',
          type: isEmoji ? 'emoji' : 'rect',
          char: isEmoji ? (Math.random() > 0.5 ? '💀' : '🔥') : undefined
        });
      }
    }

    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx; p.y += p.vy;
      p.life -= 0.02;
      if (p.life <= 0) {
        particlesRef.current.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = p.life;
      if (p.type === 'rect') {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.w, p.h);
      } else {
        ctx.font = '40px sans-serif';
        ctx.fillText(p.char!, p.x, p.y);
      }
      ctx.globalAlpha = 1.0;
    }

    // Lyrics
    const currentTime = audioContextRef.current.currentTime - audioStartTimeRef.current;
    
    // Find active cue
    let activeCueIndex = -1;
    for (let i = 0; i < lyrics.length; i++) {
      const cue = lyrics[i];
      const nextTime = i < lyrics.length - 1 ? lyrics[i+1].time : 9999;
      if (currentTime >= cue.time && currentTime < nextTime) {
        activeCueIndex = i;
        break;
      }
    }

    if (activeCueIndex !== -1) {
      if (currentLyricIndexRef.current !== activeCueIndex) {
        currentLyricIndexRef.current = activeCueIndex;
        lyricDecodedCharsRef.current = 0;
      }
      const cue = lyrics[activeCueIndex];
      const text = cue.text || "";
      lyricDecodedCharsRef.current = Math.min(text.length, lyricDecodedCharsRef.current + 0.5);
      const visibleText = text.substring(0, Math.floor(lyricDecodedCharsRef.current));
      
      ctx.font = 'bold 80px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const style = cue.style || 'NORMAL';
      
      if (style === 'GLITCH') {
        ctx.fillStyle = '#00ffff';
        ctx.fillText(visibleText, w/2 - 5 * bass, h/2);
        ctx.fillStyle = '#ff00ff';
        ctx.fillText(visibleText, w/2 + 5 * bass, h/2);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(visibleText, w/2, h/2);
      } else if (style === 'IMPACT') {
        const scale = 1.0 + bass * 0.3;
        ctx.save();
        ctx.translate(w/2, h/2);
        ctx.scale(scale, scale);
        ctx.fillStyle = '#ff3300';
        ctx.fillText(visibleText, 0, 0);
        ctx.restore();
      } else if (style === 'SOFT') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(visibleText, w/2, h/2 + Math.sin(currentTime * 2) * 10);
      } else {
        ctx.fillStyle = '#39c5bb';
        ctx.fillText(visibleText, w/2, h/2);
      }
    }

    // Scanlines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    for (let i = 0; i < h; i += 4) {
      ctx.fillRect(0, i, w, 2);
    }

    ctx.restore();

    animationFrameRef.current = requestAnimationFrame(loop);
  };

  return (
    <div className="flex w-full h-full bg-black text-white font-mono uppercase">
      {/* Config Panel */}
      <div className="w-96 border-r border-zinc-800 p-6 flex flex-col gap-6 overflow-y-auto bg-black z-10 shadow-[0_0_15px_#ff00ff]">
        <div className="border-b border-zinc-800 pb-4">
          <h1 className="text-2xl font-black tracking-widest text-[#39c5bb]">MIKU VAJFUŠA</h1>
          <h2 className="text-sm font-bold tracking-widest text-[#ff00ff]">PROTOCOL_V2.0</h2>
        </div>

        {!isPlaying && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-zinc-500">AUDIO SOURCE</span>
              <label className="border border-[#39c5bb] bg-[#39c5bb]/10 text-[#39c5bb] hover:bg-[#39c5bb] hover:text-black transition-colors font-bold text-sm py-3 text-center cursor-pointer">
                {file ? file.name : "LOAD AUDIO FILE"}
                <input type="file" accept="audio/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-zinc-500">EXPORT ASPECT RATIO</span>
              <select 
                value={exportConfig.aspectRatio}
                onChange={(e) => setExportConfig({...exportConfig, aspectRatio: e.target.value})}
                className="bg-zinc-900 border border-zinc-700 p-2 text-white outline-none"
              >
                <option value="16:9">16:9 (LANDSCAPE)</option>
                <option value="9:16">9:16 (VERTICAL)</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-zinc-500">EXPORT QUALITY</span>
              <select 
                value={exportConfig.resolution}
                onChange={(e) => setExportConfig({...exportConfig, resolution: e.target.value})}
                className="bg-zinc-900 border border-zinc-700 p-2 text-white outline-none"
              >
                <option value="1080p">1080P</option>
                <option value="4K">4K</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-zinc-500">NEURAL LYRICS ENGINE CONTEXT</span>
              <textarea 
                value={manualLyrics}
                onChange={(e) => setManualLyrics(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 p-2 text-xs font-mono h-32 resize-none outline-none focus:border-[#ff00ff]"
                placeholder="PASTE LYRICS OR CONTEXT HERE..."
              />
              <button 
                onClick={generateLyrics}
                disabled={isAnalyzing || !file || !manualLyrics}
                className="border border-[#ff00ff] text-[#ff00ff] hover:bg-[#ff00ff] hover:text-black transition-colors py-2 text-xs font-bold disabled:opacity-50"
              >
                {isAnalyzing ? "ANALYZING..." : "GENERATE SYNCED LYRICS"}
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button 
                onClick={() => startPlayback(false)}
                disabled={!file}
                className="bg-[#39c5bb] text-black font-black py-4 shadow-[0_0_15px_#39c5bb] hover:scale-[1.02] transition-transform disabled:opacity-50"
              >
                PREVIEW
              </button>
              <button 
                onClick={() => startPlayback(true)}
                disabled={!file}
                className="bg-[#ff00ff] text-black font-black py-4 shadow-[0_0_15px_#ff00ff] hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <div className="w-3 h-3 bg-black rounded-full animate-pulse" />
                RENDER MP4
              </button>
            </div>
          </div>
        )}

        {isPlaying && (
          <div className="flex flex-col gap-4 mt-auto">
            <div className="border border-red-500 p-4 flex flex-col gap-2">
              <span className="text-red-500 font-bold animate-pulse">WARNING: SYSTEM ACTIVE</span>
              <button 
                onClick={stopPlayback}
                className="bg-red-500 text-white font-black py-3 hover:bg-red-600 transition-colors"
              >
                ABORT SEQUENCE
              </button>
            </div>
          </div>
        )}

        <div className="mt-auto text-xs text-zinc-500">
          SYS_STATUS: <span className="text-white">{status}</span>
        </div>
      </div>

      {/* Render Output */}
      <div className="flex-1 relative flex items-center justify-center bg-zinc-950 overflow-hidden">
        {/* Hidden WebGL canvas used for background processing */}
        <div ref={glCanvasRef} className="hidden" />
        <canvas ref={matrixCanvasRef} className="hidden" />

        <div 
          className="relative shadow-[0_0_30px_#000] border border-zinc-800"
          style={{ 
            aspectRatio: exportConfig.aspectRatio === '16:9' ? 16/9 : 9/16,
            height: exportConfig.aspectRatio === '16:9' ? 'auto' : '90%',
            width: exportConfig.aspectRatio === '16:9' ? '90%' : 'auto'
          }}
        >
          <canvas ref={canvasRef} className="w-full h-full object-contain bg-black" />
          
          {isExporting && (
            <div className="absolute top-4 right-4 flex items-center gap-2 text-red-500 font-black text-xl animate-pulse">
              <div className="w-4 h-4 bg-red-500 rounded-full" />
              REC
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Visualizer;
