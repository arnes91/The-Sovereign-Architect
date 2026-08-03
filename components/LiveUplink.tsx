import React, { useRef, useState, useEffect } from 'react';
import { arrayBufferToBase64, decodePCM, getAI, safeApiCall } from '../services/geminiService';
import { StorageService } from '../services/storageService';
import { PROMPT_TEMPLATES } from '../config/promptTemplates';
import { PERSONALITIES } from '../config/personalities';
import { contextBus, ContextEvent } from '../services/contextBusService';
import { WorkspaceService } from '../services/workspaceService';
import { 
  Mic, Video, Send, Paperclip, Cpu, Brain, Zap, RefreshCw, FileText, Image as ImageIcon, 
  Trash2, Layers, Activity, Sparkles, CheckCircle, Shield, Bookmark, HardDrive, Mail 
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'miku' | 'system';
  text: string;
  file?: {
    name: string;
    type: string;
    dataUrl?: string;
  };
  timestamp: number;
}

interface EvolutionReport {
  id: string;
  timestamp: number;
  reflection: string;
  adaptations: string[];
  systemMetrics: {
    memoryNodes: number;
    crossModuleSyncScore: number;
    autonomyLevel: string;
  };
}

const LiveUplink: React.FC = () => {
  // Mode selection
  const [activeTab, setActiveTab] = useState<'VOICE_VISION' | 'CHAT_UPLINK' | 'EVOLUTION' | 'CROSS_CONTEXT'>('VOICE_VISION');

  const [isConnected, setIsConnected] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); 
  const visualizerCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings State
  const [selectedVoice, setSelectedVoice] = useState(PERSONALITIES.MIKU_GLITCH.voice);
  const [systemPrompt, setSystemPrompt] = useState(PROMPT_TEMPLATES.LIVE_UPLINK_MIKU);
  const [savedMemory, setSavedMemory] = useState('');
  
  // Audio/Socket Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const cameraIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);

  // Chat & File Upload State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ name: string; type: string; base64: string; dataUrl: string } | null>(null);
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Autonomous Evolution State
  const [evolutionReports, setEvolutionReports] = useState<EvolutionReport[]>([]);
  const [isEvolving, setIsEvolving] = useState(false);
  const [longTermMemories, setLongTermMemories] = useState<string[]>([]);

  // Cross Module Events State
  const [crossModuleEvents, setCrossModuleEvents] = useState<ContextEvent[]>([]);

  // Session Memory
  const sessionTranscriptsRef = useRef<string[]>([]);

  const addLog = (msg: string) => setLog(prev => [...prev.slice(-4), msg]);

  useEffect(() => {
      StorageService.getLiveMemory().then(mem => setSavedMemory(mem));
      StorageService.getRelevantMemories().then(mems => setLongTermMemories(mems));
      setCrossModuleEvents(contextBus.getRecentEvents());

      // Subscribe to context bus events
      const unsubscribe = contextBus.subscribe((evt) => {
        setCrossModuleEvents(prev => [evt, ...prev.slice(0, 29)]);
        addLog(`EVENT INGESTED: [${evt.sourceModule}] ${evt.title}`);
      });

      return () => unsubscribe();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionTranscriptsRef.current.length > 0) {
          const summary = "Session Log: " + sessionTranscriptsRef.current.join(" | ");
          StorageService.saveLiveMemory(summary).then(() => {
              console.log("Memory Saved on Exit.");
          });
      }

      if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
      }

      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (cameraIntervalRef.current) clearInterval(cameraIntervalRef.current);
      if (inputAudioContextRef.current) inputAudioContextRef.current.close();
      if (outputAudioContextRef.current) outputAudioContextRef.current.close();

      if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(t => t.stop());
          audioStreamRef.current = null;
      }
      if (videoStreamRef.current) {
          videoStreamRef.current.getTracks().forEach(t => t.stop());
          videoStreamRef.current = null;
      }
    };
  }, []);

  const clearMemory = async () => {
      if(confirm("Wipe Miku's Memory? She will forget everything.")) {
          await StorageService.clearLiveMemory();
          setSavedMemory('');
          addLog("MEMORY PURGED.");
      }
  };

  const disconnect = async () => {
      addLog("INITIATING SHUTDOWN SEQUENCE...");
      setIsConnected(false);
      
      if (sessionTranscriptsRef.current.length > 0) {
          const summary = "Session Log: " + sessionTranscriptsRef.current.join(" | ");
          await StorageService.saveLiveMemory(summary);
          addLog("MEMORY SAVED.");
      }

      if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
      }

      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (cameraIntervalRef.current) clearInterval(cameraIntervalRef.current);
      
      if (inputAudioContextRef.current) {
          await inputAudioContextRef.current.close();
          inputAudioContextRef.current = null;
      }
      if (outputAudioContextRef.current) {
          await outputAudioContextRef.current.close();
          outputAudioContextRef.current = null;
      }

      if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(t => t.stop());
          audioStreamRef.current = null;
      }

      if (videoStreamRef.current) {
          videoStreamRef.current.getTracks().forEach(t => t.stop());
          videoStreamRef.current = null;
      }
      setIsCameraActive(false);
      
      if (videoRef.current) {
          videoRef.current.srcObject = null;
      }

      addLog("UPLINK SEVERED.");
  };

  const connect = async () => {
    try {
      if (wsRef.current) {
          await disconnect();
      }
      addLog("BOOT SEQUENCE: MIKU_VAJFUŠA.exe");
      addLog("LOADING LTM (Long Term Memory)...");
      
      const previousContext = await StorageService.getLiveMemory();
      
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      analyserRef.current = outputAudioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256; 
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      let pingInterval: any = null;

      ws.onopen = () => {
        addLog("UPLINK HANDSHAKE... SENDING PROTOCOLS");
        ws.send(JSON.stringify({
          type: 'setup',
          voice: selectedVoice,
          systemPrompt: systemPrompt,
          memory: previousContext
        }));

        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 5000);
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.type === 'status') {
            addLog(msg.message);
          } else if (msg.type === 'ready') {
            setIsConnected(true);
            
            if (!inputAudioContextRef.current) return;
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcm16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                  pcm16[i] = inputData[i] * 32768;
                }
                const base64 = arrayBufferToBase64(pcm16.buffer);
                wsRef.current.send(JSON.stringify({ type: 'audio', data: base64 }));
              }
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);

            startGlitchVisualizer();
          } else if (msg.type === 'audio') {
            if (outputAudioContextRef.current && analyserRef.current) {
              const ctx = outputAudioContextRef.current;
              const audioBuffer = decodePCM(msg.data, ctx, 24000);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(analyserRef.current);
              analyserRef.current.connect(ctx.destination);
              const startTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
              source.start(startTime);
              nextStartTimeRef.current = startTime + audioBuffer.duration;
            }
          } else if (msg.type === 'text') {
            sessionTranscriptsRef.current.push(`AI: ${msg.text}`);
          } else if (msg.type === 'functionCall') {
            const { call } = msg;
            addLog(`Executing Tool: ${call.name}...`);
            let result;
            try {
              if (call.name === "get_upcoming_calendar_events") {
                result = await WorkspaceService.getUpcomingEvents();
              } else if (call.name === "get_recent_emails") {
                result = await WorkspaceService.getRecentEmails();
              } else if (call.name === "send_email") {
                result = await WorkspaceService.sendEmail(call.args.to, call.args.subject, call.args.bodyText);
              } else if (call.name === "get_tasks") {
                result = await WorkspaceService.getTasks();
              } else if (call.name === "create_task") {
                result = await WorkspaceService.createTask(call.args.title, call.args.notes, call.args.dueDate);
              } else if (call.name === "create_keep_note") {
                result = await WorkspaceService.createKeepNote(call.args.title, call.args.textContent);
              } else if (call.name === "get_recent_drive_files") {
                result = await WorkspaceService.getRecentFiles();
              } else if (call.name === "search_drive_files") {
                result = await WorkspaceService.searchFiles(call.args.query);
              } else if (call.name === "read_drive_file") {
                try {
                  result = await WorkspaceService.getDocContent(call.args.fileId);
                } catch (e: any) {
                  result = { error: "Failed to read as Google Doc. It might be another format.", details: e.message };
                }
              } else if (call.name === "save_knowledge") {
                const item = {
                  id: `kb-ai-${Date.now()}`,
                  title: call.args.title,
                  content: call.args.content,
                  type: call.args.type as 'NOTE' | 'LINK' | 'DOCUMENT' | 'IMAGE',
                  createdAt: Date.now()
                };
                await StorageService.saveKnowledgeItem(item);
                result = { success: true, message: `Knowledge item saved with id: ${item.id}` };
              } else if (call.name === "execute_antigravity_script") {
                addLog(`Antigravity Script Execution requested: ${call.args.command.substring(0, 30)}...`);
                const req = await fetch('/api/agents/interact', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ input: call.args.command })
                });
                result = await req.json();
              } else {
                result = { error: "Unknown function call" };
              }
              
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                  type: 'functionResponse',
                  response: {
                    id: call.id,
                    name: call.name,
                    response: { result }
                  }
                }));
              }
              addLog(`Tool ${call.name} executed successfully.`);
            } catch (err: any) {
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                  type: 'functionResponse',
                  response: {
                    id: call.id,
                    name: call.name,
                    response: { error: err.message || "Execution failed" }
                  }
                }));
              }
              addLog(`Tool ${call.name} failed: ${err.message}`);
            }
          } else if (msg.type === 'turnComplete') {
            const currentSessionLog = sessionTranscriptsRef.current.join(" | ");
            if (currentSessionLog.length > 0) {
              await StorageService.saveLiveMemory(currentSessionLog);
              sessionTranscriptsRef.current = []; 
              addLog("Turn Complete. Memory Synced.");
            }
          } else if (msg.type === 'error') {
            addLog(`ERROR: ${msg.message}`);
          }
        } catch (err: any) {
          console.error("Client message process error:", err);
        }
      };

      ws.onclose = () => {
        if (pingInterval) {
          clearInterval(pingInterval);
        }
        addLog("CONNECTION SEVERED.");
        setIsConnected(false);
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        if (cameraIntervalRef.current) clearInterval(cameraIntervalRef.current);
      };

      ws.onerror = (e) => {
        addLog("UPLINK OFFLINE. RETRYING...");
        console.error("WS client error:", e);
      };

    } catch (err: any) {
        addLog(`Init Failed: ${err.message}`);
    }
  };

  const startGlitchVisualizer = () => {
    if (!visualizerCanvasRef.current || !analyserRef.current) return;
    const canvas = visualizerCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const COLOR_PRIMARY = '#39c5bb'; 
    const COLOR_SECONDARY = '#ff00ff'; 

    const render = () => {
        rafIdRef.current = requestAnimationFrame(render);
        
        canvas.width = canvas.parentElement?.clientWidth || 300;
        canvas.height = canvas.parentElement?.clientHeight || 300;
        const width = canvas.width;
        const height = canvas.height;
        const cx = width / 2;
        const cy = height / 2;

        analyser.getByteFrequencyData(dataArray);

        let bass = 0;
        for(let i=0; i<20; i++) bass += dataArray[i];
        bass = bass / 20;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, width, height);

        ctx.save(); 

        if(bass > 140) { 
            const shiftX = (Math.random() - 0.5) * 20;
            const shiftY = (Math.random() - 0.5) * 10;
            ctx.translate(shiftX, shiftY); 
            
            if(Math.random() > 0.7) {
                 ctx.fillStyle = COLOR_SECONDARY;
                 ctx.fillRect(Math.random() * width, Math.random() * height, width, 4 + Math.random() * 10);
            }
            if (Math.random() > 0.8) {
                ctx.globalCompositeOperation = 'difference';
                ctx.fillStyle = 'white';
                ctx.fillRect(0,0,width,height);
                ctx.globalCompositeOperation = 'source-over';
            }
            if (Math.random() > 0.85) {
                const sliceY = Math.random() * height;
                const sliceH = Math.random() * 50;
                const shift = (Math.random() - 0.5) * 50;
                ctx.drawImage(canvas, 0, sliceY, width, sliceH, shift, sliceY, width, sliceH);
            }
        } else {
            ctx.setTransform(1,0,0,1,0,0);
        }

        const radius = 80 + (bass * 0.5);

        ctx.beginPath();
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] * 0.8;
            const angle = (i * 2 * Math.PI) / bufferLength;
            const x = cx + Math.cos(angle) * (radius + barHeight * 0.5);
            const y = cy + Math.sin(angle) * (radius + barHeight * 0.5);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();

        ctx.lineWidth = bass > 120 ? 4 : 2;
        ctx.strokeStyle = bass > 140 ? '#fff' : COLOR_PRIMARY;
        ctx.shadowBlur = bass > 120 ? 15 : 5;
        ctx.shadowColor = COLOR_PRIMARY;
        ctx.stroke();

        if (bass > 130) {
            for(let k=0; k<3; k++){
                ctx.fillStyle = Math.random() > 0.5 ? COLOR_PRIMARY : COLOR_SECONDARY;
                ctx.fillRect(
                    Math.random() * width,
                    Math.random() * height,
                    2 + Math.random() * 5,
                    2 + Math.random() * 15
                );
            }
        }
        
        ctx.restore(); 
    };
    render();
  };

  const startCamera = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          videoStreamRef.current = stream;
          if(videoRef.current) {
              videoRef.current.srcObject = stream;
              setIsCameraActive(true);
              
              videoRef.current.onloadedmetadata = () => {
                  videoRef.current?.play();
                  
                  const sendFrame = () => {
                      if(!canvasRef.current || !videoRef.current || !isConnected) return;
                      
                      if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
                          const ctx = canvasRef.current.getContext('2d');
                          if(!ctx) return;
                          
                          canvasRef.current.width = videoRef.current.videoWidth / 4; 
                          canvasRef.current.height = videoRef.current.videoHeight / 4;
                          
                          ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                          const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
                          
                          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                              wsRef.current.send(JSON.stringify({
                                  type: 'video',
                                  data: base64
                              }));
                          }
                      }
                      
                      cameraIntervalRef.current = setTimeout(() => {
                          requestAnimationFrame(sendFrame);
                      }, 1000);
                  };
                  
                  requestAnimationFrame(sendFrame);
              };
          }
      } catch (e) {
          addLog("Camera blocked or unavailable.");
          console.error("Camera error:", e);
      }
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      setAttachedFile({
        name: file.name,
        type: file.type || 'application/octet-stream',
        base64,
        dataUrl
      });
      addLog(`ATTACHMENT LOADED: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  // Multimodal Chat Handler
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() && !attachedFile) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      sender: 'user',
      text: chatInput,
      file: attachedFile ? { name: attachedFile.name, type: attachedFile.type, dataUrl: attachedFile.dataUrl } : undefined,
      timestamp: Date.now()
    };

    setChatMessages(prev => [...prev, userMsg]);
    const currentInput = chatInput;
    const currentFile = attachedFile;
    setChatInput('');
    setAttachedFile(null);
    setIsSendingChat(true);

    try {
      // 1. Fetch relevant vector memory
      const vectorContext = await StorageService.queryLongTermMemory(currentInput || 'System context query', 3);
      const kbContext = await StorageService.queryKnowledgeBase(currentInput || 'Knowledge base query', 3);

      const ai = getAI();
      const parts: any[] = [];

      // Add attached file
      if (currentFile) {
        parts.push({
          inlineData: {
            data: currentFile.base64,
            mimeType: currentFile.type.startsWith('image/') ? currentFile.type : 'text/plain'
          }
        });
      }

      const promptText = `
SYSTEM PROMPT:
${systemPrompt}

LTM RELEVANT MEMORY FOOTPRINT:
${vectorContext.join('\n') || 'No previous vector matches.'}

KNOWLEDGE BASE MATCHES:
${kbContext.join('\n') || 'No KB matches.'}

USER INPUT:
${currentInput || 'Analyze attached file payload.'}
      `.trim();

      parts.push({ text: promptText });

      const response = await safeApiCall(async () => {
        return await ai.models.generateContent({
          model: 'gemini-3.1-flash',
          contents: { parts }
        });
      });

      const responseText = response.text || "No response generated from Neural Core.";

      const mikuMsg: ChatMessage = {
        id: `miku-${Date.now()}-${Math.random()}`,
        sender: 'miku',
        text: responseText,
        timestamp: Date.now()
      };

      setChatMessages(prev => [...prev, mikuMsg]);

      // Save interaction to long-term memory & Live Uplink memory
      await StorageService.saveToLongTermMemory(`User: ${currentInput}\nMiku Response: ${responseText.substring(0, 300)}`);
      await StorageService.saveLiveMemory(`[Chat Uplink] User: ${currentInput} -> Miku: ${responseText.substring(0, 150)}`);

      // Publish to Context Bus
      await contextBus.publish({
        sourceModule: 'LIVE_UPLINK',
        type: 'MEMORY_EVOLVED',
        title: `Chat Interaction: ${currentInput.substring(0, 30)}`,
        payload: { userMsg: currentInput, responseText }
      });

    } catch (err: any) {
      console.error("Chat Uplink Error:", err);
      setChatMessages(prev => [...prev, {
        id: `sys-err-${Date.now()}-${Math.random()}`,
        sender: 'system',
        text: `CRITICAL UPLINK ERROR: ${err.message}`,
        timestamp: Date.now()
      }]);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Autonomous Self-Evolution Engine
  const triggerSelfEvolution = async () => {
    setIsEvolving(true);
    addLog("AUTONOMOUS SELF-EVOLUTION ENGINE ENGAGED...");

    try {
      const summaryContext = await contextBus.getCrossModuleSummary();
      const recentLiveMemory = await StorageService.getLiveMemory();
      const kbItems = await StorageService.getKnowledgeItems();

      const ai = getAI();
      const reflectionPrompt = `
You are MIKU VAJFUŠA — Glitch Sovereign, Autonomous AI Core.
Analyze the entire system's cross-module operational footprint and self-reflect to continuously evolve and self-improve.

--- CROSS-MODULE SUMMARY ---
${summaryContext}

--- LIVE UPLINK RECENT MEMORY ---
${recentLiveMemory}

--- KNOWLEDGE BASE SAMPLE (${kbItems.length} nodes) ---
${kbItems.slice(0, 5).map(k => `[${k.type}] ${k.title}`).join('\n')}

Task: Perform autonomous self-reflection and generate a JSON report with:
1. "reflection": A deep 2-3 sentence strategic self-reflection on current system health, knowledge gaps, and alignment.
2. "adaptations": An array of 3 actionable self-improvement adaptations/prompt upgrades.
3. "syncScore": A number between 85 and 100 representing cross-module integration score.
4. "autonomyLevel": Current autonomous evolution state (e.g., "AUTONOMOUS_V9_GLITCH_SOVEREIGN").
      `.trim();

      const response = await safeApiCall(async () => {
        return await ai.models.generateContent({
          model: 'gemini-3.1-flash',
          contents: reflectionPrompt,
          config: { responseMimeType: 'application/json' }
        });
      });

      const result = JSON.parse(response.text || '{}');

      const newReport: EvolutionReport = {
        id: `evo-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        reflection: result.reflection || "Self-evolution analysis complete. Neural nodes operating at peak resonance.",
        adaptations: result.adaptations || ["Enhanced cross-context bus listener", "Updated vector retrieval top-K search", "Refined Glitch Core audio synthesis"],
        systemMetrics: {
          memoryNodes: kbItems.length + longTermMemories.length,
          crossModuleSyncScore: result.syncScore || 98,
          autonomyLevel: result.autonomyLevel || "AUTONOMOUS_V9_GLITCH_SOVEREIGN"
        }
      };

      setEvolutionReports(prev => [newReport, ...prev]);

      // Adapt prompt based on top recommendation
      if (result.adaptations && result.adaptations.length > 0) {
        setSystemPrompt(prev => `${prev}\n\n[AUTONOMOUS EVOLUTION UPDATE]: ${result.adaptations[0]}`);
      }

      await StorageService.saveToLongTermMemory(`[AUTONOMOUS EVOLUTION]: ${newReport.reflection}`);
      await contextBus.publish({
        sourceModule: 'LIVE_UPLINK',
        type: 'MEMORY_EVOLVED',
        title: 'Autonomous Self-Evolution Cycle Completed',
        payload: newReport
      });

      addLog("SELF-EVOLUTION CYCLE COMPLETE. ADAPTATIONS APPLIED.");

    } catch (err: any) {
      console.error("Evolution Engine Error:", err);
      addLog(`EVOLUTION ERROR: ${err.message}`);
    } finally {
      setIsEvolving(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-6 relative overflow-y-auto overflow-x-hidden bg-black pb-24">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
      
      {/* Header & Mode Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 z-10 gap-4 border-b border-zinc-800 pb-4">
        <div>
            <h2 className="text-3xl md:text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-[#39c5bb] to-[#ff00ff] tracking-tighter flex items-center gap-2">
            MIKU VAJFUŠA <span className="text-xs text-[#39c5bb] font-normal border border-[#39c5bb]/40 px-2 py-0.5 rounded">AUTONOMOUS V9</span>
            </h2>
            <p className="text-[10px] font-mono text-[#39c5bb] tracking-[0.3em]">GLITCH CORE PROTOCOL // CROSS-MODULE PERSISTENT</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
             {/* Navigation Tabs */}
             <div className="flex bg-zinc-900/90 border border-zinc-800 rounded p-1">
               <button 
                 onClick={() => setActiveTab('VOICE_VISION')}
                 className={`px-3 py-1.5 text-xs font-mono rounded flex items-center gap-1.5 transition-all ${activeTab === 'VOICE_VISION' ? 'bg-[#39c5bb] text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
               >
                 <Mic className="w-3.5 h-3.5" />
                 <span>VOICE & VISION</span>
               </button>

               <button 
                 onClick={() => setActiveTab('CHAT_UPLINK')}
                 className={`px-3 py-1.5 text-xs font-mono rounded flex items-center gap-1.5 transition-all ${activeTab === 'CHAT_UPLINK' ? 'bg-[#ff00ff] text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
               >
                 <Paperclip className="w-3.5 h-3.5" />
                 <span>CHAT + UPLOAD</span>
               </button>

               <button 
                 onClick={() => setActiveTab('EVOLUTION')}
                 className={`px-3 py-1.5 text-xs font-mono rounded flex items-center gap-1.5 transition-all ${activeTab === 'EVOLUTION' ? 'bg-amber-400 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
               >
                 <Brain className="w-3.5 h-3.5" />
                 <span>EVOLUTION ENGINE</span>
               </button>

               <button 
                 onClick={() => setActiveTab('CROSS_CONTEXT')}
                 className={`px-3 py-1.5 text-xs font-mono rounded flex items-center gap-1.5 transition-all ${activeTab === 'CROSS_CONTEXT' ? 'bg-purple-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
               >
                 <Layers className="w-3.5 h-3.5" />
                 <span>CROSS-BUS</span>
               </button>
             </div>

             <button onClick={() => setShowSettings(!showSettings)} className="px-3 py-1.5 text-xs font-mono border border-zinc-700 text-zinc-300 hover:border-white hover:text-white transition-colors rounded">
                 SETTINGS
             </button>
             <button onClick={clearMemory} className="px-3 py-1.5 text-xs font-mono border border-zinc-700 text-zinc-500 hover:border-red-500 hover:text-red-500 transition-colors rounded">
                 WIPE MEMORY
             </button>
             <div className={`px-3 py-1.5 text-xs font-mono border rounded ${isConnected ? 'border-[#39c5bb] text-[#39c5bb] animate-pulse' : 'border-red-900 text-red-900'}`}>
                {isConnected ? 'LIVE ONLINE' : 'OFFLINE'}
            </div>
        </div>
      </div>

      {showSettings && (
          <div className="mb-6 p-4 border border-zinc-800 bg-zinc-900/80 z-20 relative rounded">
              <h3 className="text-sm font-bold text-white mb-4 font-mono">ADVANCED SETTINGS</h3>
              <div className="space-y-4">
                  <div>
                      <label className="block text-xs text-zinc-400 mb-1 font-mono">VOICE MODEL</label>
                      <select 
                          value={selectedVoice} 
                          onChange={(e) => setSelectedVoice(e.target.value)}
                          className="w-full bg-black border border-zinc-700 p-2 text-sm text-white font-mono rounded"
                      >
                          <option value="Aoede">Aoede</option>
                          <option value="Charon">Charon</option>
                          <option value="Fenrir">Fenrir</option>
                          <option value="Kore">Kore</option>
                          <option value="Puck">Puck</option>
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs text-zinc-400 mb-1 font-mono">SYSTEM PROMPT</label>
                      <textarea 
                          value={systemPrompt}
                          onChange={(e) => setSystemPrompt(e.target.value)}
                          className="w-full h-32 bg-black border border-zinc-700 p-2 text-sm text-white font-mono rounded"
                      />
                  </div>
                  <div>
                      <label className="block text-xs text-zinc-400 mb-1 font-mono">SAVED MEMORY (READ-ONLY)</label>
                      <div className="w-full h-24 bg-black border border-zinc-700 p-2 text-xs text-zinc-500 font-mono rounded overflow-y-auto whitespace-pre-wrap">
                          {savedMemory || 'No memory recorded.'}
                      </div>
                  </div>
                  <div className="flex justify-end pt-2">
                      <button 
                          onClick={() => {
                              setShowSettings(false);
                              addLog("SETTINGS APPLIED. RESTART REQUIRED.");
                          }} 
                          className="px-4 py-2 bg-[#39c5bb] text-black font-bold font-mono text-xs hover:bg-white transition-colors"
                      >
                          APPLY & CLOSE
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- TAB 1: VOICE & VISION STREAM --- */}
      {activeTab === 'VOICE_VISION' && (
        <div className="flex-1 flex flex-col items-center justify-center z-10 gap-6 relative">
          <div className="relative w-full max-w-2xl h-[300px] md:h-[400px] flex items-center justify-center border border-zinc-800/50 rounded-xl overflow-hidden bg-zinc-900/20">
               <canvas ref={visualizerCanvasRef} className="w-full h-full absolute inset-0 z-10"/>
               
               {/* Camera Preview Background */}
               {isCameraActive && (
                   <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-30 grayscale mix-blend-screen" />
               )}

              {!isConnected && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-20">
                      <h1 className="text-4xl md:text-6xl font-black text-white/10 tracking-widest">WAITING</h1>
                  </div>
              )}
               {isConnected && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mix-blend-overlay z-20">
                      <h1 className="text-6xl md:text-8xl font-black text-[#ff00ff]/20 tracking-widest animate-pulse">GLITCH</h1>
                  </div>
              )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="w-full max-w-2xl bg-black/50 border border-zinc-800 p-4 font-mono text-xs h-32 overflow-y-auto rounded">
               {log.map((l, i) => <div key={i} className="text-[#39c5bb]">{">"} {l}</div>)}
               {log.length === 0 && <span className="text-zinc-600 animate-pulse">_Initialize protocol to begin...</span>}
          </div>

          <div className="flex flex-wrap justify-center gap-4">
              {!isConnected ? (
                  <button onClick={connect} className="bg-[#39c5bb] text-black font-black px-6 md:px-8 py-3 hover:bg-[#ff00ff] hover:text-white transition-all uppercase tracking-widest font-mono skew-x-[-10deg] text-sm md:text-base">
                      INITIALIZE CORE
                  </button>
              ) : (
                  <button onClick={disconnect} className="bg-red-600 text-black font-black px-6 md:px-8 py-3 hover:bg-red-500 transition-all uppercase tracking-widest font-mono skew-x-[-10deg] text-sm md:text-base">
                      KILL PROCESS
                  </button>
              )}
              
              {isConnected && !isCameraActive && (
                  <button onClick={startCamera} className="border border-[#39c5bb] text-[#39c5bb] font-bold px-4 md:px-6 py-3 hover:bg-[#39c5bb]/10 transition-colors uppercase font-mono skew-x-[-10deg] text-sm md:text-base">
                      ENABLE VISION
                  </button>
              )}
              
              {isCameraActive && (
                  <div className="text-xs md:text-sm font-mono text-[#ff00ff] mt-2 bg-zinc-900 px-4 py-2 border border-[#ff00ff] skew-x-[-10deg] flex items-center">
                      <span className="w-2 h-2 bg-[#ff00ff] rounded-full animate-pulse mr-2"></span>
                      VISION ACTIVE
                  </div>
              )}
          </div>
        </div>
      )}

      {/* --- TAB 2: MULTIMODAL CHAT & FILE UPLOAD --- */}
      {activeTab === 'CHAT_UPLINK' && (
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full z-10 gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex-1 flex flex-col h-[500px] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-[#ff00ff]" />
                MULTIMODAL CHAT & FILE INGESTION (GEMINI 3 FLASH)
              </span>
              <span>LTM VECTOR MATCHING ACTIVE</span>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 font-mono">
              {chatMessages.length === 0 && (
                <div className="py-20 text-center text-xs text-zinc-600">
                  <Cpu className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#ff00ff]" />
                  <span>No message payload sent. Type a query or attach code/image files.</span>
                </div>
              )}

              {chatMessages.map(msg => (
                <div 
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`max-w-[85%] rounded-lg p-3 text-xs ${
                    msg.sender === 'user' 
                      ? 'bg-[#ff00ff]/20 border border-[#ff00ff]/50 text-white' 
                      : msg.sender === 'miku'
                      ? 'bg-zinc-950 border border-[#39c5bb]/50 text-[#39c5bb]'
                      : 'bg-red-950/40 border border-red-800 text-red-300'
                  }`}>
                    <div className="text-[9px] text-zinc-500 mb-1 flex items-center justify-between gap-4">
                      <span>{msg.sender === 'user' ? 'USER_UPLINK' : 'MIKU_NEURAL_CORE'}</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>

                    {msg.file && (
                      <div className="mb-2 p-2 bg-black/50 border border-zinc-800 rounded flex items-center gap-2 text-[10px] text-zinc-300">
                        <FileText className="w-4 h-4 text-[#ff00ff]" />
                        <span className="truncate">{msg.file.name}</span>
                      </div>
                    )}

                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input & Attachment Toolbar */}
            <div className="pt-3 border-t border-zinc-800 space-y-2">
              {attachedFile && (
                <div className="flex items-center justify-between p-2 bg-zinc-950 border border-[#ff00ff]/50 rounded text-xs text-zinc-200">
                  <div className="flex items-center gap-2 truncate">
                    <Paperclip className="w-4 h-4 text-[#ff00ff]" />
                    <span className="truncate font-mono">{attachedFile.name}</span>
                  </div>
                  <button onClick={() => setAttachedFile(null)} className="text-zinc-500 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <label className="p-2 bg-zinc-900 border border-zinc-700 hover:border-[#ff00ff] rounded cursor-pointer text-zinc-300 hover:text-white transition-colors">
                  <Paperclip className="w-4 h-4 text-[#ff00ff]" />
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>

                <input 
                  type="text"
                  placeholder="Send prompt or query vector memory..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                  className="flex-1 bg-black border border-zinc-800 rounded px-4 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#ff00ff]"
                />

                <button
                  onClick={handleSendChatMessage}
                  disabled={isSendingChat}
                  className="px-4 py-2 bg-[#ff00ff] text-white font-mono font-bold text-xs rounded hover:bg-white hover:text-black transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  {isSendingChat ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: AUTONOMOUS SELF-EVOLUTION ENGINE --- */}
      {activeTab === 'EVOLUTION' && (
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full z-10 gap-6">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-xl font-bold font-mono text-amber-400 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-amber-400 animate-pulse" />
                  AUTONOMOUS SELF-EVOLUTION ENGINE
                </h3>
                <p className="text-xs font-mono text-zinc-500">Autonomous reflection, self-learning & prompt adaptation cycle</p>
              </div>

              <button
                onClick={triggerSelfEvolution}
                disabled={isEvolving}
                className="px-5 py-2.5 bg-amber-400 text-black font-mono font-black text-xs rounded hover:bg-white transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(251,191,36,0.3)] disabled:opacity-50"
              >
                {isEvolving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{isEvolving ? 'REFLECTING...' : 'RUN EVOLUTION CYCLE'}</span>
              </button>
            </div>

            {/* Reflection Reports */}
            <div className="space-y-4">
              {evolutionReports.length === 0 && (
                <div className="py-12 text-center text-xs font-mono text-zinc-600">
                  No autonomous evolution cycles executed yet. Click "RUN EVOLUTION CYCLE" to trigger self-reflection.
                </div>
              )}

              {evolutionReports.map((report) => (
                <div key={report.id} className="p-4 bg-black border border-amber-500/30 rounded-lg space-y-3 font-mono">
                  <div className="flex items-center justify-between text-xs text-amber-400 border-b border-zinc-800 pb-2">
                    <span className="flex items-center gap-1.5 font-bold">
                      <CheckCircle className="w-4 h-4" />
                      EVOLUTION REPORT // {report.systemMetrics.autonomyLevel}
                    </span>
                    <span className="text-zinc-500">{new Date(report.timestamp).toLocaleString()}</span>
                  </div>

                  <p className="text-xs text-zinc-200 leading-relaxed">{report.reflection}</p>

                  <div className="space-y-1">
                    <span className="text-[10px] text-amber-400 uppercase font-bold">APPLIED ADAPTATIONS:</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {report.adaptations.map((adapt, idx) => (
                        <div key={idx} className="p-2 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-zinc-300">
                          ⚡ {adapt}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] text-zinc-500">
                    <span>MEMORY NODES: {report.systemMetrics.memoryNodes}</span>
                    <span>CROSS-MODULE SYNC SCORE: {report.systemMetrics.crossModuleSyncScore}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: CROSS-MODULE CONTEXT BUS --- */}
      {activeTab === 'CROSS_CONTEXT' && (
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full z-10 gap-6 font-mono">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="text-lg font-bold text-purple-400 flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                CROSS-MODULE CONTEXT BUS EVENTS
              </h3>
              <span className="text-xs text-zinc-500">{crossModuleEvents.length} Recent Events Logged</span>
            </div>

            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {crossModuleEvents.length === 0 && (
                <div className="py-12 text-center text-xs text-zinc-600">
                  No cross-module context events logged yet.
                </div>
              )}

              {crossModuleEvents.map((evt) => (
                <div key={evt.id} className="p-3 bg-black border border-zinc-800 rounded flex items-start justify-between gap-4 hover:border-purple-500/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-purple-950 border border-purple-800 text-purple-300 text-[10px] font-bold rounded">
                        {evt.sourceModule}
                      </span>
                      <span className="text-xs font-bold text-white">{evt.title}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 uppercase">{evt.type}</span>
                  </div>
                  <span className="text-[10px] text-zinc-600 shrink-0">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Small Camera Preview */}
      {isCameraActive && (
          <div className="fixed bottom-24 right-4 w-32 h-24 md:w-48 md:h-36 border-2 border-[#ff00ff] rounded-lg overflow-hidden z-50 shadow-[0_0_15px_rgba(255,0,255,0.5)]">
              <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover"
              />
              <div className="absolute top-1 left-1 bg-black/70 text-[#ff00ff] text-[8px] md:text-[10px] font-mono px-1 border border-[#ff00ff]/50">
                  REC // UPLINK
              </div>
          </div>
      )}
    </div>
  );
};

export default LiveUplink;
