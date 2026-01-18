
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { streamStrategyChat, generateSpeech, decodePCM } from '../../services/geminiService';
import { PERSONALITIES } from '../../config/personalities';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

const STORAGE_KEY_CHAT = 'brzi_companion_chat';

const AICompanion: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(() => {
      // Load history synchronously
      const stored = localStorage.getItem(STORAGE_KEY_CHAT);
      return stored ? JSON.parse(stored) : [];
  });
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeStyle, setActiveStyle] = useState<keyof typeof PERSONALITIES.AI_COMPANION.styles>('DEFAULT');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isStreaming]);

  // Persist messages whenever they change
  useEffect(() => {
      if (messages.length > 0) {
          localStorage.setItem(STORAGE_KEY_CHAT, JSON.stringify(messages));
      }
  }, [messages]);

  const clearHistory = () => {
      if(confirm("Clear chat memory?")) {
          setMessages([]);
          localStorage.removeItem(STORAGE_KEY_CHAT);
      }
  };

  const playResponse = async (text: string) => {
    if (isMuted) return;
    
    try {
        setIsTalking(true);
        // Use the configured voice from personalities
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

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMessage]);
    const currentInput = input;
    setInput('');
    setIsStreaming(true);

    try {
        const apiHistory = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
        }));

        // Construct system instruction based on selected style
        const styleConfig = PERSONALITIES.AI_COMPANION.styles[activeStyle];
        const systemInstruction = `
          ${PERSONALITIES.AI_COMPANION.instruction}
          
          --- CURRENT INTERACTION MODE: ${styleConfig.name} ---
          ${styleConfig.instruction}
        `;

        const stream = streamStrategyChat(
            apiHistory, 
            currentInput, 
            'STANDARD', 
            systemInstruction
        );

        let fullResponse = "";
        let hasStarted = false;

        for await (const chunk of stream) {
            const text = chunk.text;
            if (text) {
                fullResponse += text;
                
                // Only create the model message when the first chunk arrives
                // This keeps the "Thinking" indicator visible during latency
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

        // Trigger voice output after text is complete
        await playResponse(fullResponse);

    } catch (error: any) {
        console.error("Chat error:", error);
        
        let errorText = "Error: Connection interrupted.";
        if (error.message?.includes("REGION_LOCKED")) {
            errorText = "⚠️ SYSTEM ERROR: Region Lock Detected. The specific AI model used by this persona is unavailable in your current location.";
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
      {/* Header */}
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
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
             {/* Style Selector */}
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

             {/* Clear Button */}
             <button 
                onClick={clearHistory}
                className="p-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-500 hover:text-white"
                title="Clear History"
             >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </button>

             {/* Mute Toggle */}
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

      {/* Chat Area */}
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
        
        {/* Thinking Indicator: Visible only when streaming AND last message is user (before first chunk) */}
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

      {/* Input Area */}
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
            onClick={handleSend}
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
