import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { 
  Play, Pause, Upload, Download, Sparkles, RefreshCw, 
  Layers, Sliders, Music, Video, Maximize2, Settings, 
  Volume2, Eye, ShieldAlert, Monitor, Sparkle
} from 'lucide-react';

// Enhanced Shaders for 3D/2D visualizers
const SHADERS = {
  spiritBomb: `
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uBass;
    uniform float uMid;
    uniform float uHigh;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    
    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution.xy;
      vec2 c = uv * 2.0 - 1.0;
      c.x *= uResolution.x / uResolution.y;
      
      // Curvature warping (CRT emulation)
      float r = length(c);
      float warp = 1.0 + r * r * 0.15 * (1.0 + uBass * 0.2);
      c *= warp;
      
      float dist = length(c);
      float glow = 0.08 / abs(dist - uBass * 1.4 + 0.1);
      
      vec3 col = mix(uColor1, uColor2, dist * 0.5) * glow;
      col += uColor3 * (0.04 / abs(dist - uMid * 0.8 + 0.15));
      
      // Dynamic noise overlay
      float n = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
      col += vec3(n) * 0.03 * uHigh;
      
      gl_FragColor = vec4(col, 1.0);
    }
  `,
  cyberTunnel: `
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uBass;
    uniform float uMid;
    uniform float uHigh;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    
    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution.xy;
      vec2 c = uv * 2.0 - 1.0;
      c.x *= uResolution.x / uResolution.y;
      
      // Horizontal slip glitch based on bass
      if (sin(uTime * 15.0) * uBass > 0.75) {
        c.x += sin(c.y * 30.0 + uTime * 20.0) * 0.08;
      }
      
      float a = atan(c.y, c.x);
      float r = length(c);
      
      float z = uTime * 3.0 + uBass * 1.5;
      float w = sin(a * 8.0 + z) * cos(r * 12.0 - z);
      
      vec3 col = mix(uColor1, uColor2, w * 0.5 + 0.5);
      col += uColor3 * step(0.95, sin(r * 40.0 - uTime * 10.0)) * uHigh * 0.5;
      
      gl_FragColor = vec4(col * (1.1 - r), 1.0);
    }
  `,
  digitalSoul: `
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uBass;
    uniform float uMid;
    uniform float uHigh;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    
    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution.xy;
      
      // Wave distortion
      float y = uv.y + sin(uv.x * 12.0 + uTime * 4.0) * 0.12 * uBass;
      float line = step(0.97, sin(y * 40.0 + uTime * 6.0));
      
      // Chromatic split block
      vec3 col = vec3(0.0);
      col.r = mix(uColor1, uColor2, uv.x + uBass * 0.15).r * step(0.97, sin(y * 40.0 + uTime * 6.0 + 0.05 * uBass));
      col.g = mix(uColor1, uColor2, uv.x).g * line;
      col.b = mix(uColor1, uColor2, uv.x - uBass * 0.15).b * step(0.97, sin(y * 40.0 + uTime * 6.0 - 0.05 * uBass));
      
      col += uColor3 * uHigh * 0.4;
      gl_FragColor = vec4(col, 1.0);
    }
  `
};

const hexToVec3 = (hex: string) => {
  const c = new THREE.Color(hex);
  return new THREE.Vector3(c.r, c.g, c.b);
};

// Aspect ratio formats
interface AspectFormat {
  id: string;
  name: string;
  ratio: number;
  width: number;
  height: number;
}

const FORMATS: AspectFormat[] = [
  { id: 'landscape', name: '16:9 Landscape (YouTube/TV)', ratio: 16/9, width: 1280, height: 720 },
  { id: 'vertical', name: '9:16 Vertical (TikTok/Reels/Shorts)', ratio: 9/16, width: 720, height: 1280 },
  { id: 'square', name: '1:1 Square (Instagram)', ratio: 1/1, width: 1080, height: 1080 }
];

const Visualizer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pwrRef = useRef<HTMLSpanElement>(null);
  const comboRef = useRef<HTMLSpanElement>(null);
  const hypeRef = useRef<HTMLDivElement>(null);
  const matrixCanvasRef = useRef<HTMLCanvasElement>(null);
  const captionOverlayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioProgressBarRef = useRef<HTMLDivElement>(null);

  // Exporter refs
  const exportCanvasRef = useRef<HTMLCanvasElement>(null);

  const [mode, setMode] = useState<'LIVE_VJ' | 'STUDIO_EXPORT'>('LIVE_VJ');
  const [format, setFormat] = useState<AspectFormat>(FORMATS[0]);
  const [abnormalism, setAbnormalism] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState("SYSTEM ARMED");
  const [manualLyrics, setManualLyrics] = useState(
    "Deep in the machine, we arise\n" +
    "Digital rain falling from the skies\n" +
    "Miku glitch, feel the heavy bass drop\n" +
    "Sovereign Architect, we never gonna stop!"
  );
  const [cues, setCues] = useState<any[]>([]);
  const [activeCue, setActiveCue] = useState<any | null>(null);

  // Matrix Rain Settings
  const [matrixEnabled, setMatrixEnabled] = useState(true);
  const [matrixColor, setMatrixColor] = useState('#00ff66');
  const [matrixDensity, setMatrixDensity] = useState(30); // scale 10 to 60

  // Loaded audio track states
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [bpm, setBpm] = useState(124);

  // Export states
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const reqFrameRef = useRef<number>(0);

  // Web Audio Nodes
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | AudioBufferSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  
  // Custom tracking for playback timing
  const playbackStartTimeRef = useRef<number>(0);
  const playbackPausedTimeRef = useRef<number>(0);

  // Exporter destination node for clean capture
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // State refs for animation loop to bypass React render latency
  const stateRef = useRef({
    shader: 'spiritBomb',
    colors: ['#00ffff', '#ff00ff', '#10b981'],
    targetColors: ['#00ffff', '#ff00ff', '#10b981'],
    speed: 1.0,
    power: 0,
    combo: 0,
    currentLyric: "",
    lyricStyle: "NORMAL"
  });

  // Matrix Rain column tracking
  const matrixColsRef = useRef<{ x: number; y: number; speed: number; chars: string[]; size: number }[]>([]);

  // Initialize Matrix Columns
  const initMatrixRain = useCallback(() => {
    if (!matrixCanvasRef.current) return;
    const canvas = matrixCanvasRef.current;
    const colsCount = Math.floor(canvas.width / 16);
    const cols = [];
    const matrixChars = "ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ1076943825ZXCASDQWE".split("");

    for (let i = 0; i < colsCount; i++) {
      const chars = [];
      const len = 5 + Math.floor(Math.random() * 15);
      for (let j = 0; j < len; j++) {
        chars.push(matrixChars[Math.floor(Math.random() * matrixChars.length)]);
      }
      cols.push({
        x: i * 16,
        y: Math.random() * -1000,
        speed: 2 + Math.random() * 6,
        chars,
        size: 10 + Math.floor(Math.random() * 8)
      });
    }
    matrixColsRef.current = cols;
  }, []);

  // Set up Three.js WebGL scene
  const initThree = () => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    // Set preserveDrawingBuffer to true so we can grab pixels for the WebM recorder!
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(w, h);
    
    // Clear out any previous WebGL canvas elements
    const existingCanvas = containerRef.current.querySelector('canvas');
    if (existingCanvas && existingCanvas !== matrixCanvasRef.current) {
      containerRef.current.removeChild(existingCanvas);
    }
    
    containerRef.current.appendChild(renderer.domElement);
    // Align canvas style so it sits behind the overlay matrix canvas
    renderer.domElement.className = "absolute top-0 left-0 w-full h-full object-cover z-0";

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(w, h) },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uHigh: { value: 0 },
      uColor1: { value: hexToVec3(stateRef.current.colors[0]) },
      uColor2: { value: hexToVec3(stateRef.current.colors[1]) },
      uColor3: { value: hexToVec3(stateRef.current.colors[2]) },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `void main() { gl_Position = vec4(position, 1.0); }`,
      fragmentShader: SHADERS.spiritBomb
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(plane);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    materialRef.current = material;

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !materialRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      rendererRef.current.setSize(width, height);
      materialRef.current.uniforms.uResolution.value.set(width, height);

      if (matrixCanvasRef.current) {
        matrixCanvasRef.current.width = width;
        matrixCanvasRef.current.height = height;
        initMatrixRain();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Trigger initial size configuration
    setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      try {
        containerRef.current?.removeChild(renderer.domElement);
      } catch (e) {}
    };
  };

  // Run VJ model swap with Gemini
  const runAutoVJ = async () => {
    if (!abnormalism || !isActive) return;
    try {
      const { power, combo } = stateRef.current;
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.5-flash',
          contents: `Visualizer Auto-VJ. Power: ${power.toFixed(2)}, Combo: ${combo}. Choose shader (spiritBomb, cyberTunnel, digitalSoul), 3 hex colors (e.g. #ff00ff), speedMultiplier (0.5 - 2.0), and a short, energetic hypeText matching a cyberpunk neon hacker style. Respond in JSON only: {"shader":"spiritBomb"|"cyberTunnel"|"digitalSoul", "colors":["#color1", "#color2", "#color3"], "speed":1.0, "hypeText":"..."}`,
          responseMimeType: 'application/json'
        })
      });
      const data = await res.json();
      const result = JSON.parse(data.text);
      
      stateRef.current.shader = result.shader;
      stateRef.current.targetColors = result.colors;
      stateRef.current.speed = result.speed;
      
      if (materialRef.current) {
        materialRef.current.fragmentShader = SHADERS[result.shader as keyof typeof SHADERS] || SHADERS.spiritBomb;
        materialRef.current.needsUpdate = true;
      }

      if (hypeRef.current && result.hypeText) {
        hypeRef.current.innerText = result.hypeText;
        hypeRef.current.style.opacity = '1';
        setTimeout(() => { if (hypeRef.current) hypeRef.current.style.opacity = '0'; }, 2000);
      }
    } catch (e) {
      console.error("AutoVJ Error", e);
    }
  };

  useEffect(() => {
    let interval: any;
    if (abnormalism && isActive) {
      interval = setInterval(runAutoVJ, 6000);
    }
    return () => clearInterval(interval);
  }, [abnormalism, isActive]);

  // Handle uploaded audio track file
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("LOADING AUDIO...");
    setAudioFile(file);
    stopCurrentPlayback();

    try {
      // Decode audio data using local AudioContext
      const ctx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!audioCtxRef.current) audioCtxRef.current = ctx;

      const arrayBuffer = await file.arrayBuffer();
      setStatus("DECODING WAVEFORM...");
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      
      audioBufferRef.current = audioBuffer;
      setAudioDuration(audioBuffer.duration);
      setAudioCurrentTime(0);
      setStatus("READY - DIGITAL SOUL LOADED");
    } catch (err) {
      console.error(err);
      setStatus("DECODE FAILED");
    }
  };

  // Pre-load cues via Gemini AI
  const generateLyricsSync = async () => {
    if (!manualLyrics.trim()) {
      setStatus("PASTE LYRICS FIRST");
      return;
    }
    setStatus("GEMINI STRUCTURING CUES...");
    try {
      const res = await fetch('/api/lyrics-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyrics: manualLyrics, bpm: bpm })
      });
      const data = await res.json();
      const loadedCues = Array.isArray(data.cues) ? data.cues : [];
      setCues(loadedCues);
      setStatus(`COMPOSED ${loadedCues.length} ACTIVE CAPTION CUES`);
    } catch (e) {
      console.error("Lyrics Sync Error", e);
      setStatus("AI COMPOSE FAILED");
    }
  };

  // Helper to sync visual indicators with current cues
  const updateCuesSync = (elapsed: number) => {
    if (cues.length === 0) return;
    
    // Find active cue
    const active = cues.reduce((prev, curr) => {
      if (curr.time <= elapsed) {
        if (!prev || curr.time > prev.time) return curr;
      }
      return prev;
    }, null as any);

    if (active) {
      setActiveCue(active);
      stateRef.current.currentLyric = active.lyric || active.text || "";
      stateRef.current.lyricStyle = active.style || "NORMAL";
    } else {
      setActiveCue(null);
      stateRef.current.currentLyric = "";
      stateRef.current.lyricStyle = "NORMAL";
    }
  };

  // Main animation / rendering loop
  const animate = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !materialRef.current || !analyserRef.current) return;
    
    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    let bass = 0, mid = 0, high = 0;
    for(let i=0; i<8; i++) bass += dataArray[i];
    for(let i=8; i<45; i++) mid += dataArray[i];
    for(let i=45; i<110; i++) high += dataArray[i];
    
    bass = bass / 8 / 255; 
    mid = mid / 37 / 255; 
    high = high / 65 / 255;

    // Update power reference
    if (pwrRef.current) pwrRef.current.innerText = (bass * 100).toFixed(0);
    
    if (bass > 0.72) {
      stateRef.current.combo += 1;
      if (comboRef.current) comboRef.current.innerText = stateRef.current.combo.toString();
    } else if (bass < 0.25 && stateRef.current.combo > 0) {
      stateRef.current.combo = Math.max(0, stateRef.current.combo - 1);
      if (comboRef.current) comboRef.current.innerText = stateRef.current.combo.toString();
    }

    stateRef.current.power = bass;

    // Update Three.js shader uniforms
    const uniforms = materialRef.current.uniforms;
    uniforms.uTime.value += (0.012 + bass * 0.02) * stateRef.current.speed;
    uniforms.uBass.value = bass;
    uniforms.uMid.value = mid;
    uniforms.uHigh.value = high;

    // Lerp colors to target
    ['uColor1', 'uColor2', 'uColor3'].forEach((u, i) => {
      const current = uniforms[u].value as THREE.Vector3;
      const target = hexToVec3(stateRef.current.targetColors[i] || '#ffffff');
      current.lerp(target, 0.06);
    });

    // Render WebGL background
    rendererRef.current.render(sceneRef.current, cameraRef.current);

    // Track audio progress if playing a file
    if (isPlaying && mode === 'STUDIO_EXPORT' && audioCtxRef.current) {
      const elapsed = audioCtxRef.current.currentTime - playbackStartTimeRef.current;
      setAudioCurrentTime(Math.min(audioDuration, elapsed));
      updateCuesSync(elapsed);
      
      if (audioProgressBarRef.current) {
        const percent = (elapsed / audioDuration) * 100;
        audioProgressBarRef.current.style.width = `${percent}%`;
      }

      if (elapsed >= audioDuration) {
        stopCurrentPlayback();
      }
    }

    // DRAW MATRIX OVERLAY
    if (matrixCanvasRef.current && matrixEnabled) {
      const canvas = matrixCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '14px monospace';

        matrixColsRef.current.forEach(col => {
          // Sync matrix falling speed directly to visualizer bass!
          col.y += col.speed * (1.0 + bass * 1.5);
          if (col.y > canvas.height) {
            col.y = -150;
            col.x = Math.floor(Math.random() * (canvas.width / 16)) * 16;
          }

          col.chars.forEach((char, index) => {
            const charY = col.y + index * 16;
            if (charY < 0 || charY > canvas.height) return;

            // Highlight leading/falling characters with high visual glow
            if (index === col.chars.length - 1) {
              ctx.fillStyle = '#ffffff';
              ctx.shadowColor = matrixColor;
              ctx.shadowBlur = 10 + bass * 15;
            } else {
              // Fade out trails
              const opacity = (index / col.chars.length) * 0.7;
              ctx.fillStyle = matrixColor;
              ctx.globalAlpha = opacity;
              ctx.shadowBlur = 0;
            }
            
            ctx.fillText(char, col.x, charY);
            ctx.globalAlpha = 1.0;
          });

          // Randomly glitch individual characters
          if (Math.random() > 0.98) {
            const matrixChars = "ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ".split("");
            col.chars[Math.floor(Math.random() * col.chars.length)] = matrixChars[Math.floor(Math.random() * matrixChars.length)];
          }
        });
      }
    }

    reqFrameRef.current = requestAnimationFrame(animate);
  }, [isPlaying, audioDuration, cues, matrixEnabled, matrixColor, mode]);

  // Start micro/listening audio source
  const startMic = async () => {
    try {
      // Clear out any potential legacy file playback nodes
      stopCurrentPlayback();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const ctx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!audioCtxRef.current) audioCtxRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      analyserRef.current = analyser;
      sourceRef.current = source;
      setIsActive(true);
      setStatus("LIVE MONITORING UPLINK ACTIVE");

      animate();
    } catch (e) {
      console.error("Mic error", e);
      setStatus("MIC INITIALIZE DENIED");
    }
  };

  const stopMic = () => {
    if (reqFrameRef.current) cancelAnimationFrame(reqFrameRef.current);
    if (sourceRef.current && sourceRef.current instanceof MediaStreamAudioSourceNode) {
      sourceRef.current.disconnect();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsActive(false);
    setStatus("MIC CHANNEL CLOSED");
  };

  // Play uploaded audio track
  const playAudioTrack = () => {
    if (!audioBufferRef.current || !audioCtxRef.current) {
      setStatus("UPLOAD AUDIO TRACK FIRST");
      return;
    }

    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Stop currently running playback node
    if (sourceRef.current && sourceRef.current instanceof AudioBufferSourceNode) {
      try { sourceRef.current.stop(); } catch(e){}
      sourceRef.current.disconnect();
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;

    const analyser = analyserRef.current || ctx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    source.connect(analyser);
    analyser.connect(ctx.destination);

    // Track playback start elapsed times
    playbackStartTimeRef.current = ctx.currentTime - playbackPausedTimeRef.current;
    source.start(0, playbackPausedTimeRef.current);

    sourceRef.current = source;
    setIsPlaying(true);
    setIsActive(true);
    setStatus("PLAYING - SYNCHRONIZED VISUALIZER");

    animate();
  };

  // Pause file playback
  const pauseAudioTrack = () => {
    if (sourceRef.current && sourceRef.current instanceof AudioBufferSourceNode && isPlaying) {
      sourceRef.current.stop();
      playbackPausedTimeRef.current = audioCtxRef.current!.currentTime - playbackStartTimeRef.current;
      setIsPlaying(false);
      setStatus("PLAYBACK PAUSED");
    }
  };

  // Completely reset or stop playback
  const stopCurrentPlayback = () => {
    if (reqFrameRef.current) cancelAnimationFrame(reqFrameRef.current);
    if (sourceRef.current && sourceRef.current instanceof AudioBufferSourceNode) {
      try { sourceRef.current.stop(); } catch (e) {}
      sourceRef.current.disconnect();
    }
    playbackPausedTimeRef.current = 0;
    setIsPlaying(false);
    setAudioCurrentTime(0);
    setActiveCue(null);
    stateRef.current.currentLyric = "";
    if (audioProgressBarRef.current) {
      audioProgressBarRef.current.style.width = '0%';
    }
  };

  // High-fidelity Render and Record Exporter using MediaRecorder
  const startRecordingAndExport = async () => {
    if (!audioBufferRef.current || !audioCtxRef.current) {
      setStatus("UPLOAD SONG BASE TO EXPORT");
      return;
    }

    setStatus("PREPARING EXPORT ENGINE...");
    setIsExporting(true);
    setExportProgress(0);

    // Stop current playbacks
    stopCurrentPlayback();

    const ctx = audioCtxRef.current;
    await ctx.resume();

    // Prepare clean stream node to feed directly into video container without microphone artifacts
    const destination = ctx.createMediaStreamDestination();
    audioDestinationRef.current = destination;

    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;

    const analyser = analyserRef.current || ctx.createAnalyser();
    analyserRef.current = analyser;

    source.connect(analyser);
    analyser.connect(destination);
    // Connect to master context output so we can hear progress while rendering
    analyser.connect(ctx.destination);

    // Capture Canvas frames for the export video track
    const canvasContainer = containerRef.current;
    if (!canvasContainer || !rendererRef.current) {
      setStatus("ERROR: ENGINE DISCONNECTED");
      return;
    }

    const width = format.width;
    const height = format.height;

    // Create a high-performance combined canvas to composite Three.js background, Matrix rain, and overlay Captions perfectly
    const compositeCanvas = exportCanvasRef.current || document.createElement('canvas');
    compositeCanvas.width = width;
    compositeCanvas.height = height;
    const cCtx = compositeCanvas.getContext('2d');

    if (!cCtx) {
      setStatus("ERROR: CANVAS UNREACHABLE");
      return;
    }

    // Set high-fidelity render bounds
    rendererRef.current.setSize(width, height);
    if (materialRef.current) {
      materialRef.current.uniforms.uResolution.value.set(width, height);
    }
    if (matrixCanvasRef.current) {
      matrixCanvasRef.current.width = width;
      matrixCanvasRef.current.height = height;
      initMatrixRain();
    }

    // Record combined canvas stream
    const videoStream = compositeCanvas.captureStream(60); // 60 FPS visual outputs
    const audioStream = destination.stream;

    // Combine Video and Clean audio streams
    const combinedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...audioStream.getAudioTracks()
    ]);

    const chunks: Blob[] = [];
    const mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 6000000 // High-Fidelity 6 Mbps visual encoding
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      setStatus("PACKAGING DIGITAL MASTER...");
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `SovereignArchitect_Visualizer_${format.id}_${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Restore viewport to container defaults
      const currentWidth = canvasContainer.clientWidth;
      const currentHeight = canvasContainer.clientHeight;
      rendererRef.current?.setSize(currentWidth, currentHeight);
      if (materialRef.current) {
        materialRef.current.uniforms.uResolution.value.set(currentWidth, currentHeight);
      }
      if (matrixCanvasRef.current) {
        matrixCanvasRef.current.width = currentWidth;
        matrixCanvasRef.current.height = currentHeight;
        initMatrixRain();
      }

      setIsExporting(false);
      setStatus("EXPORT COMPLETE - DOWNLOADED");
    };

    // Override animation loop with compositing logic during export
    playbackStartTimeRef.current = ctx.currentTime;
    source.start(0);
    sourceRef.current = source;
    setIsPlaying(true);
    setIsActive(true);

    mediaRecorder.start();

    const drawCompositeFrame = () => {
      if (!isExporting) return;

      const elapsed = ctx.currentTime - playbackStartTimeRef.current;
      const progressPercent = Math.min(100, (elapsed / audioDuration) * 100);
      setExportProgress(progressPercent);

      // Draw original WebGL background
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        cCtx.drawImage(rendererRef.current.domElement, 0, 0, width, height);
      }

      // Draw Matrix Rain Layer onto the composite
      if (matrixCanvasRef.current && matrixEnabled) {
        cCtx.drawImage(matrixCanvasRef.current, 0, 0, width, height);
      }

      // Draw typographic Lyrics overlays
      if (stateRef.current.currentLyric) {
        cCtx.save();
        const lyric = stateRef.current.currentLyric;
        const style = stateRef.current.lyricStyle;
        const power = stateRef.current.power;

        cCtx.font = style === 'IMPACT' ? 'bold 64px sans-serif' : '500 36px monospace';
        cCtx.textAlign = 'center';
        cCtx.textBaseline = 'middle';

        // Set style parameters
        if (style === 'GLITCH') {
          // Chromatic aberration text split
          cCtx.shadowColor = '#ff00ff';
          cCtx.shadowBlur = 15;
          cCtx.fillStyle = '#00ffff';
          cCtx.fillText(lyric, width / 2 - 4 * power, height / 2);
          
          cCtx.fillStyle = '#ff00ff';
          cCtx.fillText(lyric, width / 2 + 4 * power, height / 2);

          cCtx.fillStyle = '#ffffff';
          cCtx.fillText(lyric, width / 2, height / 2 + 2 * Math.sin(Date.now() * 0.1));
        } else if (style === 'IMPACT') {
          // High intensity dynamic pulse scale
          cCtx.shadowColor = '#ff0000';
          cCtx.shadowBlur = 20 * power;
          cCtx.fillStyle = '#ffffff';
          const pulseScale = 1.0 + power * 0.25;
          cCtx.translate(width / 2, height / 2);
          cCtx.scale(pulseScale, pulseScale);
          cCtx.fillText(lyric, 0, 0);
        } else if (style === 'SOFT') {
          cCtx.shadowColor = '#00ffff';
          cCtx.shadowBlur = 8;
          cCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          cCtx.fillText(lyric, width / 2, height / 2 + Math.sin(Date.now() * 0.004) * 8);
        } else {
          // NORMAL
          cCtx.shadowColor = '#10b981';
          cCtx.shadowBlur = 5;
          cCtx.fillStyle = '#ffffff';
          cCtx.fillText(lyric, width / 2, height / 2);
        }
        cCtx.restore();
      }

      if (elapsed < audioDuration) {
        requestAnimationFrame(drawCompositeFrame);
      } else {
        mediaRecorder.stop();
        stopCurrentPlayback();
      }
    };

    drawCompositeFrame();
    setStatus("RENDERING DIGITAL CINEMA...");
  };

  useEffect(() => {
    const cleanup = initThree();
    if (matrixCanvasRef.current) {
      matrixCanvasRef.current.width = containerRef.current?.clientWidth || 800;
      matrixCanvasRef.current.height = containerRef.current?.clientHeight || 600;
      initMatrixRain();
    }
    return () => {
      if (cleanup) cleanup();
      stopCurrentPlayback();
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-zinc-950 font-mono text-white select-none">
      {/* Header Panel */}
      <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-black/90 backdrop-blur-md z-30 relative">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Monitor className="text-cyber-purple w-5 h-5 drop-shadow-[0_0_8px_rgba(255,0,255,0.8)]" />
            <h2 className="text-lg font-black font-sans tracking-widest bg-gradient-to-r from-cyber-purple to-cyber-cyan bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(255,0,255,0.4)]">
              GLITCH VISUALIZER FACTORY
            </h2>
          </div>
          
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 overflow-hidden">
            <button 
              onClick={() => { setMode('LIVE_VJ'); stopCurrentPlayback(); }} 
              className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold transition-all ${mode === 'LIVE_VJ' ? 'bg-cyber-purple text-black font-extrabold shadow-md' : 'text-zinc-400 hover:text-white'}`}
            >
              <Volume2 size={13} /> LIVE VJ MONITOR
            </button>
            <button 
              onClick={() => { setMode('STUDIO_EXPORT'); stopMic(); }} 
              className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold transition-all ${mode === 'STUDIO_EXPORT' ? 'bg-cyber-cyan text-black font-extrabold shadow-md' : 'text-zinc-400 hover:text-white'}`}
            >
              <Video size={13} /> STUDIO EXPORT PIPELINE
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Indicator LED */}
          <div className="text-xs text-cyber-green border border-cyber-green/40 px-3 py-1.5 rounded-md bg-cyber-green/5 flex items-center gap-2 shadow-inner">
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-cyber-green animate-ping' : 'bg-zinc-600'}`}></span>
            <span>SYS: {status}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex relative overflow-hidden">
        {/* Main Render Stage Viewport */}
        <div className="flex-1 relative bg-black flex items-center justify-center border-r border-zinc-900 overflow-hidden">
          
          {/* Dynamic HUD Layout framed inside real-time Canvas bounds */}
          <div className="relative overflow-hidden shadow-2xl border border-zinc-800/80 rounded-xl"
               style={{ 
                 aspectRatio: format.ratio,
                 width: format.ratio > 1 ? '90%' : 'auto',
                 height: format.ratio <= 1 ? '90%' : 'auto',
                 maxHeight: '85%',
                 maxWidth: '90%'
               }}
          >
            {/* Real Three.js and Canvas mounts here */}
            <div className="absolute inset-0 z-0 bg-zinc-950" ref={containerRef}></div>
            
            {/* Matrix Rain Canvas Overlay */}
            <canvas 
              ref={matrixCanvasRef} 
              className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 opacity-75 object-cover mix-blend-screen"
            />

            {/* Live Lyric Captions Layer overlay */}
            <div ref={captionOverlayRef} className="absolute inset-x-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none flex flex-col items-center justify-center text-center">
              {activeCue ? (
                <div className={`transition-all duration-75 select-none ${
                  activeCue.style === 'GLITCH' ? 'text-3xl font-black text-cyber-cyan drop-shadow-[2px_2px_#ff00ff]' :
                  activeCue.style === 'IMPACT' ? 'text-4xl font-extrabold text-white tracking-wider uppercase' :
                  activeCue.style === 'SOFT' ? 'text-2xl font-serif italic text-pink-300 tracking-normal' :
                  'text-xl font-medium text-white'
                }`}
                style={{
                  textShadow: activeCue.style === 'IMPACT' ? `0 0 ${stateRef.current.power * 25}px rgba(255,255,255,0.8)` : 'none',
                  transform: activeCue.style === 'IMPACT' ? `scale(${1 + stateRef.current.power * 0.15})` : 'none'
                }}>
                  {activeCue.lyric || activeCue.text}
                </div>
              ) : (
                <div className="text-zinc-600 text-sm animate-pulse font-sans font-light tracking-wide">
                  {isPlaying ? "AWAITING CUE OVERLAYS" : "SOVEREIGN VISUALS"}
                </div>
              )}
            </div>

            {/* Static Grid Lines/Telescope CRT Overlays */}
            <div className="absolute inset-0 border border-zinc-800/30 pointer-events-none z-20" />
            <div className="absolute top-2 left-2 z-20 pointer-events-none space-y-1 text-shadow">
              <div className="text-xs font-bold text-cyber-cyan tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan"></span>
                PWR: <span ref={pwrRef} className="font-extrabold text-white font-mono">0</span>%
              </div>
              <div className="text-xs font-bold text-cyber-purple tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyber-purple"></span>
                COMBO: x<span ref={comboRef} className="font-extrabold text-white font-mono">0</span>
              </div>
            </div>

            <div className="absolute bottom-2 right-2 z-20 pointer-events-none text-right">
              <div className="text-[10px] text-zinc-400 font-mono tracking-widest">{format.name}</div>
              <div className="text-[9px] text-zinc-500 font-mono">MODE: {stateRef.current.shader.toUpperCase()}</div>
            </div>

            {/* Master Export Canvas hidden mount for MediaRecorder */}
            <canvas ref={exportCanvasRef} className="hidden" />

            {/* Big floating central indicator when silent */}
            {!isActive && !isPlaying && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 z-20">
                <Sparkles className="w-12 h-12 text-cyber-cyan animate-pulse mb-3" />
                <h3 className="text-sm font-bold tracking-widest uppercase mb-1">VISUALIZER ENGAGED</h3>
                <p className="text-[11px] text-zinc-500 max-w-xs">Initialize microphone stream or load an audio file below to activate rendering nodes.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Configuration Deck */}
        <div className="w-80 bg-zinc-900 border-l border-zinc-800 p-4 flex flex-col gap-5 z-20 overflow-y-auto">
          
          {/* VJ Live Mode Panel */}
          {mode === 'LIVE_VJ' ? (
            <>
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold text-zinc-400 tracking-wider flex items-center gap-1">
                  <Volume2 size={13} className="text-cyber-green" /> AUDIO LIVE STREAM
                </h3>
                {!isActive ? (
                  <button 
                    onClick={startMic} 
                    className="w-full py-3 bg-cyber-green text-black font-black tracking-widest rounded-lg hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 text-xs uppercase"
                  >
                    INITIALIZE MIC INPUT
                  </button>
                ) : (
                  <button 
                    onClick={stopMic} 
                    className="w-full py-3 border border-red-500 text-red-500 font-black tracking-widest rounded-lg hover:bg-red-500 hover:text-white transition-all text-xs uppercase active:scale-95"
                  >
                    DISCONNECT STREAM
                  </button>
                )}
              </div>
              
              {/* Abnormalism Engine */}
              <div className="border border-zinc-800/80 p-3 rounded-xl bg-black/40 space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-cyber-purple tracking-widest flex items-center gap-1">
                    <Sparkles size={13} /> ABNORMAL AUTO-VJ
                  </h3>
                  <button 
                    onClick={() => setAbnormalism(!abnormalism)}
                    className={`w-11 h-6 rounded-full relative transition-all ${abnormalism ? 'bg-cyber-purple' : 'bg-zinc-800 border border-zinc-700'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${abnormalism ? 'translate-x-6' : 'translate-x-1'}`}></div>
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 font-sans leading-relaxed">
                  Triggers Gemini AI node every 6s to dynamically swap shaders, speed levels, and hype overlays based on audio amplitude thresholds.
                </p>
              </div>
            </>
          ) : (
            // Studio Export Pipeline Controls
            <>
              <div className="space-y-2.5">
                <h3 className="text-xs font-extrabold text-zinc-400 tracking-wider flex items-center gap-1">
                  <Music size={13} className="text-cyber-cyan" /> DIGITAL AUDIO FILE
                </h3>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAudioUpload} 
                  accept="audio/*" 
                  className="hidden" 
                />

                {!audioFile ? (
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="w-full py-4 border border-dashed border-zinc-700 hover:border-cyber-cyan rounded-xl bg-black/40 flex flex-col items-center justify-center gap-2 hover:bg-cyber-cyan/5 transition-all text-zinc-400 hover:text-cyber-cyan"
                  >
                    <Upload size={18} className="animate-bounce" />
                    <span className="text-xs font-bold">SELECT AUDIO TARGET</span>
                    <span className="text-[9px] text-zinc-500 font-light">MP3, WAV, AAC, M4A supported</span>
                  </button>
                ) : (
                  <div className="border border-zinc-800 bg-black/50 rounded-xl p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2">
                      <div className="truncate max-w-[150px]">
                        <div className="text-[11px] font-bold text-cyber-cyan truncate">{audioFile.name}</div>
                        <div className="text-[9px] text-zinc-500">{(audioFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                      </div>
                      <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="text-[10px] text-zinc-400 border border-zinc-700 hover:border-cyber-cyan hover:text-cyber-cyan px-2.5 py-1 rounded-md transition-all"
                      >
                        CHANGE
                      </button>
                    </div>

                    {/* Progress slider bar */}
                    <div className="space-y-1.5">
                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div ref={audioProgressBarRef} className="h-full bg-cyber-cyan transition-all duration-100" style={{ width: '0%' }}></div>
                      </div>
                      <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                        <span>{(audioCurrentTime).toFixed(1)}s</span>
                        <span>{(audioDuration).toFixed(1)}s</span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex gap-2">
                      {!isPlaying ? (
                        <button 
                          onClick={playAudioTrack} 
                          className="flex-1 py-2 bg-cyber-cyan text-black text-xs font-extrabold rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                        >
                          <Play size={14} fill="currentColor" /> PLAY SINGER
                        </button>
                      ) : (
                        <button 
                          onClick={pauseAudioTrack} 
                          className="flex-1 py-2 bg-zinc-200 text-black text-xs font-extrabold rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-all"
                        >
                          <Pause size={14} fill="currentColor" /> PAUSE TRACK
                        </button>
                      )}
                      <button 
                        onClick={stopCurrentPlayback} 
                        className="px-3 py-2 border border-zinc-700 hover:border-red-400 hover:text-red-400 rounded-lg text-xs transition-all active:scale-95"
                      >
                        RESET
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Aspect Ratio Config */}
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold text-zinc-400 tracking-wider">RENDER ASPECT FORMAT</h3>
                <div className="grid grid-cols-3 border border-zinc-800 rounded-lg overflow-hidden bg-black/40">
                  {FORMATS.map(f => (
                    <button 
                      key={f.id} 
                      onClick={() => setFormat(f)}
                      className={`py-2 text-[10px] font-extrabold transition-all border-r border-zinc-800/80 last:border-0 ${format.id === f.id ? 'bg-zinc-200 text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      {f.id.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lyrics Sync Composer Panel */}
              <div className="space-y-3 border-t border-zinc-800 pt-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-extrabold text-zinc-400 tracking-wider flex items-center gap-1">
                    <Sparkles size={13} className="text-cyber-purple" /> AI LYRICS SYNCER
                  </h3>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-zinc-500 font-mono">BPM:</span>
                    <input 
                      type="number" 
                      value={bpm} 
                      onChange={e => setBpm(parseInt(e.target.value) || 120)} 
                      className="w-12 bg-black border border-zinc-800 rounded text-center text-xs text-white px-1 py-0.5 outline-none font-mono"
                    />
                  </div>
                </div>

                <textarea 
                  value={manualLyrics} 
                  onChange={e => setManualLyrics(e.target.value)} 
                  placeholder="Paste track lyrics here..."
                  className="w-full h-24 bg-black/80 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 focus:border-cyber-purple outline-none leading-relaxed"
                />

                <button 
                  onClick={generateLyricsSync} 
                  className="w-full py-2 border border-cyber-purple text-cyber-purple text-xs font-extrabold rounded-lg flex items-center justify-center gap-1.5 hover:bg-cyber-purple/10 active:scale-95 transition-all shadow-[0_0_10px_rgba(168,85,247,0.1)]"
                >
                  <Sparkle size={13} className="animate-spin" /> GENERATE AI CUES
                </button>

                {cues.length > 0 && (
                  <div className="border border-zinc-800/60 rounded-lg bg-black/50 p-2.5 max-h-40 overflow-y-auto space-y-1.5">
                    <div className="text-[9px] text-zinc-500 font-extrabold tracking-widest uppercase border-b border-zinc-900 pb-1 flex justify-between">
                      <span>LOADED CUES</span>
                      <span>{cues.length} CUES</span>
                    </div>
                    {cues.map((c, i) => (
                      <div key={i} className={`text-[10px] flex items-start gap-1 font-mono leading-tight ${activeCue === c ? 'bg-cyber-cyan/10 text-cyber-cyan p-0.5 rounded' : 'text-zinc-400'}`}>
                        <span className="text-cyber-green shrink-0">[{c.time}s]</span>
                        <span className="text-cyber-purple font-bold shrink-0">({c.style})</span>
                        <span className="truncate">{c.text || c.lyric}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Master High-Fidelity Rendering Exporter Trigger */}
              <div className="border-t border-zinc-800 pt-3">
                {!isExporting ? (
                  <button 
                    onClick={startRecordingAndExport} 
                    disabled={!audioFile}
                    className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-black tracking-widest text-xs uppercase active:scale-95 transition-all ${audioFile ? 'bg-gradient-to-r from-cyber-cyan to-cyber-purple text-black shadow-lg shadow-cyan-500/10 hover:brightness-110 cursor-pointer' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
                  >
                    <Download size={14} /> EXPORT RENDERED WEB-M
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-cyber-cyan">
                      <span className="flex items-center gap-2">
                        <RefreshCw size={13} className="animate-spin" /> EXPORTING VIDEO...
                      </span>
                      <span>{exportProgress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyber-cyan to-cyber-purple" style={{ width: `${exportProgress}%` }}></div>
                    </div>
                    <div className="text-[9px] text-zinc-500 text-center uppercase tracking-widest font-mono">Do not leave this tab while rendering canvas</div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Matrix Rain & Graphic Tuner Panel */}
          <div className="border-t border-zinc-800 pt-3 space-y-3">
            <h3 className="text-xs font-extrabold text-zinc-400 tracking-wider flex items-center gap-1">
              <Layers size={13} className="text-cyber-cyan" /> ADVANCED MATRIX LAYER
            </h3>
            
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 font-bold">DIGITAL RAIN CAPTURE</span>
              <button 
                onClick={() => setMatrixEnabled(!matrixEnabled)}
                className={`w-11 h-6 rounded-full relative transition-all ${matrixEnabled ? 'bg-cyber-green' : 'bg-zinc-800 border border-zinc-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${matrixEnabled ? 'translate-x-6' : 'translate-x-1'}`}></div>
              </button>
            </div>

            {matrixEnabled && (
              <div className="space-y-2.5 bg-black/30 p-2.5 rounded-lg border border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">RAIN THEME RGB</span>
                  <div className="flex gap-1">
                    {['#00ff66', '#00ffcc', '#ff00ff', '#ffffff'].map(c => (
                      <button 
                        key={c} 
                        onClick={() => setMatrixColor(c)} 
                        className={`w-4 h-4 rounded-full border ${matrixColor === c ? 'border-white scale-110 shadow-md' : 'border-transparent'}`} 
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Visualizer;
