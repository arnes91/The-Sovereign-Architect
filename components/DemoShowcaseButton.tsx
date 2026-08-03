import React, { useState, useRef } from 'react';
import { Video, Download, ExternalLink, Play, CheckCircle } from 'lucide-react';

interface DemoShowcaseButtonProps {
  onStartDemo?: () => void;
}

export const DemoShowcaseButton: React.FC<DemoShowcaseButtonProps> = ({ onStartDemo }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('AI SHOWCASE TOUR');
  const [progress, setProgress] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const openNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const startShowcase = async () => {
    if (onStartDemo) {
      onStartDemo();
      return;
    }

    try {
      // Attempt browser screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' },
        audio: true
      });

      setupRecorderAndStart(stream, 'screen');
      runAutomatedTour();

    } catch (err) {
      console.warn("Screen capture disallowed or blocked in iframe. Launching Canvas Synth Showcase Video Generator...", err);
      // Fallback to high-definition synthesized Canvas video recorder
      startCanvasSynthesizerRecording();
    }
  };

  const setupRecorderAndStart = (stream: MediaStream, type: 'screen' | 'synth') => {
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }

    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Brzi_Arzi_Backblaze_Hackathon_Showcase_${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setIsRecording(false);
      setStatus('START SHOWCASE & RECORD');
      setProgress(0);
    };

    mediaRecorder.start();
    setIsRecording(true);
    setStatus(`RECORDING DEMO (${type.toUpperCase()})...`);
  };

  const startCanvasSynthesizerRecording = () => {
    setIsRecording(true);
    setStatus('GENERATING SHOWCASE VIDEO (.WEBM)...');

    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create audio stream for video track
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const dest = audioCtx.createMediaStreamDestination();
    
    // Play synth beep sequence
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(dest);
    osc.start();

    const canvasStream = canvas.captureStream(30);
    dest.stream.getAudioTracks().forEach(track => canvasStream.addTrack(track));

    setupRecorderAndStart(canvasStream, 'synth');

    // Presentation Slides Data
    const slides = [
      {
        title: "BRZI ARZI — SOVEREIGN ARCHITECT",
        subtitle: "Backblaze Generative Media Hackathon 2026 Submission",
        badge: "E2E AI MEDIA PIPELINE x BACKBLAZE B2",
        details: ["Autonomous Music & AI Media Orchestration", "Genblaze Python/REST SDK Integration", "Durable Storage on Backblaze B2 (bucket: brziai)"]
      },
      {
        title: "GENBLAZE x B2 MEDIA PIPELINE",
        subtitle: "From Prompt to Pipeline to Durable Cloud Storage",
        badge: "ACTIVE MODULE SHOWCASE",
        details: ["Multi-model AI Generation (Gemini 3.1 Flash / GMI Cloud)", "Automatic Provenance & Metadata Manifest Extraction", "Direct B2 Bucket Upload: b2://brziai/genblaze_manifest.json"]
      },
      {
        title: "BACKBLAZE B2 CLOUD STORAGE INTEGRATION",
        subtitle: "S3-Compatible High Scalability Object Storage",
        badge: "VERIFIED DEPLOYMENT",
        details: ["Endpoint: s3.eu-central-003.backblazeb2.com", "Master Key & Application Key Authorization", "Public URL & Immutable Provenance Records"]
      },
      {
        title: "SYSTEM CORE & MULTI-AGENT ARCHITECTURE",
        subtitle: "Brzi Arzi Music Pipeline & Cognitive Core",
        badge: "FULL-STACK AI ENGINE",
        details: ["Real-time Audio Uplink & Gemini 3.1 Live Preview", "Automated Release Pipeline Tracker & Playlist Pulse", "Sovereign AI Companion & Automated Studio Operations"]
      },
      {
        title: "READY FOR DEVPOST EVALUATION",
        subtitle: "Project Built & Deployed for Backblaze Hackathon 2026",
        badge: "SUBMISSION READY",
        details: ["Live URL: Cloud Run Production Deployment", "Repository: Public GitHub with Full Setup Guide", "Thank You Judges & Backblaze Team!"]
      }
    ];

    let currentSlide = 0;
    const durationPerSlide = 3000; // 3 seconds per slide = 15s total video
    const totalDuration = slides.length * durationPerSlide;
    const startTime = Date.now();

    const renderLoop = () => {
      const elapsed = Date.now() - startTime;
      currentSlide = Math.min(Math.floor(elapsed / durationPerSlide), slides.length - 1);
      const slide = slides[currentSlide];
      const pct = Math.min(100, Math.floor((elapsed / totalDuration) * 100));
      setProgress(pct);

      // Background Gradient
      const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
      grad.addColorStop(0, '#09090b');
      grad.addColorStop(0.5, '#001028');
      grad.addColorStop(1, '#09090b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1920, 1080);

      // Grid Overlay
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 1920; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1080);
        ctx.stroke();
      }
      for (let y = 0; y < 1080; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1920, y);
        ctx.stroke();
      }

      // Card Container
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(160, 140, 1600, 800, 24);
      ctx.fill();
      ctx.stroke();

      // Top Header Badge
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.roundRect(220, 200, 500, 40, 20);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(slide.badge, 240, 226);

      // Title
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'black 54px sans-serif';
      ctx.fillText(slide.title, 220, 320);

      // Subtitle
      ctx.fillStyle = '#94a3b8';
      ctx.font = '28px sans-serif';
      ctx.fillText(slide.subtitle, 220, 380);

      // Divider
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(220, 420);
      ctx.lineTo(1700, 420);
      ctx.stroke();

      // Bullet Details
      slide.details.forEach((detail, idx) => {
        const y = 500 + idx * 80;
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 32px monospace';
        ctx.fillText('▶', 220, y);

        ctx.fillStyle = '#f8fafc';
        ctx.font = '500 32px sans-serif';
        ctx.fillText(detail, 270, y);
      });

      // Progress bar at bottom
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(160, 910, 1600, 12);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(160, 910, 1600 * (pct / 100), 12);

      // Watermark & Time
      ctx.fillStyle = '#64748b';
      ctx.font = '16px monospace';
      ctx.fillText(`BRZI ARZI DEMO RECORDING // ${pct}% COMPLETE`, 1400, 880);

      if (elapsed < totalDuration) {
        requestAnimationFrame(renderLoop);
      } else {
        osc.stop();
        audioCtx.close();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        }
      }
    };

    requestAnimationFrame(renderLoop);
  };

  const runAutomatedTour = () => {
    const steps = [
      () => window.scrollTo({ top: 0, behavior: 'smooth' }),
      () => window.scrollTo({ top: 300, behavior: 'smooth' }),
      () => {
        const buttons = document.querySelectorAll('button');
        const executeBtn = Array.from(buttons).find(b => b.textContent?.includes('EXECUTE E2E PIPELINE'));
        if (executeBtn) (executeBtn as HTMLElement).click();
      },
      () => {},
      () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        steps[currentStep]();
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 3000);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={startShowcase}
        disabled={isRecording}
        className={`px-4 py-2 border font-mono text-xs uppercase tracking-widest rounded transition-all flex items-center gap-2 ${
          isRecording 
            ? 'bg-red-500/20 text-red-500 border-red-500 animate-pulse'
            : 'bg-cyber-purple/20 text-cyber-purple border-cyber-purple hover:bg-cyber-purple hover:text-black'
        }`}
      >
        <Video className="w-3.5 h-3.5" />
        {isRecording ? `${status} (${progress}%)` : 'GENERATE SHOWCASE VIDEO'}
      </button>

      <button
        onClick={openNewTab}
        title="Open app in a new tab to capture your actual screen"
        className="px-3 py-2 border border-zinc-700 text-zinc-400 font-mono text-xs hover:border-zinc-500 hover:text-white rounded transition-colors flex items-center gap-1"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        NEW TAB
      </button>
    </div>
  );
};
