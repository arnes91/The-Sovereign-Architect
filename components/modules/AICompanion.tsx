
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { streamStrategyChat, generateSpeech, decodePCM } from '../../services/geminiService';
import { StorageService } from '../../services/storageService';
import { PERSONALITIES } from '../../config/personalities';
import { PROMPT_TEMPLATES } from '../../config/promptTemplates';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

interface AICompanionProps {
    demoTrigger?: string;
}

const AICompanion: React.FC<AICompanionProps> = ({ demoTrigger }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeStyle, setActiveStyle] = useState<keyof typeof PERSONALITIES.AI_COMPANION.styles>('DEFAULT');
  const [memoryContext, setMemoryContext] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isStreaming]);

  // LOAD MEMORY ON MOUNT
  useEffect(() => {
      StorageService.getChatHistory().then(setMessages);
      StorageService.getRelevantMemories().then(ltm => {
          if (ltm.length > 0) {
              console.log("Injecting Long Term Memory:", ltm);
              setMemoryContext(ltm.join("\n"));
          }
      });
  }, []);

  // SAVE TO STORAGE ON CHANGE
  useEffect(() => {
      if (messages.length > 0) {
          StorageService.saveChatHistory(messages);
      }
  }, [messages]);

  // --- DEMO TRIGGER ---
  useEffect(() => {
      if (demoTrigger === 'SIMULATE_COMPANION' && !isStreaming) {
          const demoMsg = "Identify top 3 tasks to improve my Spotify algorithm reach today.";
          let i = 0;
          setInput("");
          const typeInt = setInterval(() => {
              setInput(prev => prev + demoMsg.charAt(i));
              i++;
              if (i >= demoMsg.length) {
                  clearInterval(typeInt);
                  setTimeout(() => handleSend(true), 500);
              }
          }, 30);
      }
  }, [demoTrigger]);

  const clearHistory = async () => {
      if(confirm("Wipe ALL Chat Memory (Short & Long Term)?")) {
          setMessages([]);
          await StorageService.clearLongTermMemory();
          setMemoryContext("");
      }
  };

  const playResponse = async (text: string) => {
    if (isMuted) return;
    try {
        setIsTalking(true);
        const audioBase64 = await generateSpeech(text, PERSONALITIES.AI_COMPANION.voice);
        if (audioBase64) {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = ctx;
            const buffer = decodePCM(audioBase64, ctx, 24000);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
            source.onended = () => setIsTalking(false);
        } else {
            setIsTalking(false);
        }
    } catch (e) {
        console.error("Speech synthesis failed", e);
        setIsTalking(false);
    }
  };

  const handleSend = async (isDemo = false) => {
    const textToSend = isDemo ? "Identify top 3 tasks to improve my Spotify algorithm reach today." : input;
    
    if (!textToSend.trim() || isStreaming) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsStreaming(true);

    // DEMO BYPASS
    if (isDemo) {
        setTimeout(() => {
             const demoResponse = `Here is your optimal playlist strategy:
1. **Metadata Update:** Rename your top playlist to "High Energy Coding 2024".
2. **Frequency:** Release 2 Short-form videos using the "Balkan Phonk" sound.
3. **Engagement:** Reply to the first 10 comments on your latest video within 1 hour.`;
             
             setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'model',
                content: demoResponse,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
            setIsStreaming(false);
        }, 1500);
        return;
    }

    try {
        // Slice history to last 20 messages to prevent token limit errors
        const recentMessages = messages.slice(-20);
        const apiHistory = recentMessages.map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
        }));

        const styleName = PERSONALITIES.AI_COMPANION.styles[activeStyle].name;
        const styleInstruction = PROMPT_TEMPLATES.AI_COMPANION_STYLES[activeStyle];
        
        // MEMORY INJECTION
        const memoryInjection = memoryContext 
            ? `\n\n[LONG TERM MEMORY RECALL]:\nThe user has previously discussed the following. Use this context if relevant:\n${memoryContext}` 
            : "";

        const systemInstruction = `
          ${PROMPT_TEMPLATES.AI_COMPANION_CORE}
          ${memoryInjection}
          --- CURRENT INTERACTION MODE: ${styleName} ---
          ${styleInstruction}
        `;

        const stream = streamStrategyChat(
            apiHistory, 
            textToSend, 
            'STANDARD', 
            systemInstruction
        );

        let fullResponse = "";
        let hasStarted = false;

        for await (const chunk of stream) {
            const text = chunk.text;
            if (text) {
                fullResponse += text;
                if (!hasStarted) {
                    hasStarted = true;
                    setMessages(prev => [...prev, {
                        id: (Date.now() + 1).toString(),
                        role: 'model',
                        content: fullResponse,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }]);
                } else {
                    setMessages(prev => {
                        const newArr = [...prev];
                        newArr[newArr.length - 1].content = fullResponse;
                        return newArr;
                    });
                }
            }
        }
        await playResponse(fullResponse);

    } catch (error: any) {
        console.error("Chat error:", error);
        let errorText = "Error: Connection interrupted.";
        if (error.message?.includes("REGION_LOCKED")) {
            errorText = "⚠️ SYSTEM ERROR: Region Lock Detected.";
        }
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            content: errorText,
            timestamp: new Date().toLocaleTimeString()
        }]);
    } finally {
        setIsStreaming(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-4xl mx-auto">
      <div className="mb-6 border-b border-zinc-800 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-sans font-bold text-white">AI COMPANION</h2>
            <div className="flex items-center gap-2">
                <p className="text-zinc-500 font-mono text-sm">Personalized Strategic Partner</p>
                {isTalking && (
                     <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-green opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyber-green"></span>
                     </span>
                )}
            </div>
            {memoryContext && (
                <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] bg-indigo-900/50 text-indigo-300 border border-indigo-700 px-2 py-0.5 rounded font-mono">
                        🧠 LONG TERM MEMORY ACTIVE
                    </span>
                </div>
            )}
        </div>
        <div className="flex items-center gap-3">
             <div className="relative">
                 <select 
                    value={activeStyle}
                    onChange={(e) => setActiveStyle(e.target.value as keyof typeof PERSONALITIES.AI_COMPANION.styles)}
                    className="appearance-none bg-zinc-900 border border-zinc-700 text-xs font-mono text-white py-2 pl-3 pr-8 rounded focus:border-cyber-green outline-none cursor-pointer"
                 >
                    {Object.entries(PERSONALITIES.AI_COMPANION.styles).map(([key, style]) => (
                        <option key={key} value={key}>{style.name.toUpperCase()}</option>
                    ))}
                 </select>
                 <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                 </div>
             </div>
             <button 
                onClick={clearHistory}
                className="p-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-500 hover:text-white"
                title="Wipe Memory"
             >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </button>
             <button 
                onClick={() => setIsMuted(!isMuted)}
                className={`p-2 rounded border transition-all ${isMuted ? 'bg-red-900/30 border-red-800 text-red-400' : 'bg-zinc-900 border-zinc-700 text-cyber-green'}`}
                title={isMuted ? "Unmute Voice" : "Mute Voice"}
             >
                {isMuted ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                )}
             </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto mb-6 pr-2 space-y-4">
        {messages.length === 0 && (
             <div className="h-full flex flex-col items-center justify-center text-zinc-700 opacity-50">
                 <div className="w-16 h-16 border-2 border-zinc-800 rounded-full flex items-center justify-center mb-4">
                     <div className="w-12 h-12 bg-zinc-800 rounded-full animate-pulse"></div>
                 </div>
                 <p className="font-mono text-sm">Online. Ready to assist.</p>
                 <p className="font-mono text-xs text-zinc-600 mt-2">Current Mode: {PERSONALITIES.AI_COMPANION.styles[activeStyle].name}</p>
             </div>
        )}
        {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[80%] rounded-xl p-4 ${
                    msg.role === 'user' 
                    ? 'bg-zinc-800 text-white rounded-br-none border border-zinc-700' 
                    : 'bg-black text-zinc-300 rounded-bl-none border border-zinc-900'
                }`}>
                    <div className="prose prose-invert prose-sm max-w-none font-sans">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                </div>
                <span className="text-[10px] font-mono text-zinc-600 mt-1 px-1">
                    {msg.role === 'model' && 'AI • '}{msg.timestamp}
                </span>
            </div>
        ))}
        {isStreaming && (messages.length === 0 || messages[messages.length - 1]?.role === 'user') && (
             <div className="flex justify-start">
                 <div className="bg-black border border-zinc-900 rounded-xl rounded-bl-none p-4 flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-cyber-green rounded-full animate-bounce"></span>
                     <span className="w-1.5 h-1.5 bg-cyber-green rounded-full animate-bounce delay-75"></span>
                     <span className="w-1.5 h-1.5 bg-cyber-green rounded-full animate-bounce delay-150"></span>
                 </div>
             </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-lg p-1 flex items-center">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your instruction..."
            className="flex-1 bg-transparent text-white font-sans px-4 py-3 outline-none"
            disabled={isStreaming}
          />
          <button 
            onClick={() => handleSend()}
            disabled={isStreaming || !input.trim()}
            className={`p-3 rounded-md transition-colors ${
                input.trim() && !isStreaming 
                ? 'bg-cyber-green text-black hover:bg-emerald-400' 
                : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
      </div>
    </div>
  );
};
export default AICompanion;
