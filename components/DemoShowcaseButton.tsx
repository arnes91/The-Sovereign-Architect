import React, { useState, useRef } from 'react';

export const DemoShowcaseButton = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('START SHOWCASE & RECORD');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startShowcase = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' },
        audio: true
      });

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
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
        a.download = `Brzi_Arzi_Showcase_${new Date().getTime()}.webm`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setIsRecording(false);
        setStatus('START SHOWCASE & RECORD');
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus('RECORDING... RUNNING SHOWCASE');

      // Automate showcase (simulate AI clicking through)
      runAutomatedTour();

    } catch (err) {
      console.error("Showcase recording failed", err);
      setStatus('RECORDING FAILED');
      setTimeout(() => setStatus('START SHOWCASE & RECORD'), 3000);
    }
  };

  const runAutomatedTour = () => {
    // Simple script to scroll and click
    const steps = [
      () => window.scrollTo({ top: 0, behavior: 'smooth' }),
      () => {
        // Scroll to the Genblaze module
        window.scrollTo({ top: 300, behavior: 'smooth' });
      },
      () => {
        // Click the Execute E2E Pipeline button
        const buttons = document.querySelectorAll('button');
        const executeBtn = Array.from(buttons).find(b => b.textContent?.includes('EXECUTE E2E PIPELINE'));
        if (executeBtn) {
          (executeBtn as HTMLElement).click();
        }
      },
      () => {
        // Wait for pipeline
      },
      () => {
        // Wait for pipeline
      },
      () => {
        // Wait for pipeline
      },
      () => {
        // Stop recording
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
    }, 2500);
  };

  return (
    <button
      onClick={startShowcase}
      disabled={isRecording}
      className={`px-4 py-2 border font-mono text-xs uppercase tracking-widest rounded transition-all ${
        isRecording 
          ? 'bg-red-500/20 text-red-500 border-red-500 animate-pulse'
          : 'bg-cyber-purple/10 text-cyber-purple border-cyber-purple hover:bg-cyber-purple hover:text-black'
      }`}
    >
      {status}
    </button>
  );
};
