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

const AICompanion: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isStreaming]);

  const playResponse = async (text: string) => {
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

        const stream = streamStrategyChat(
            apiHistory, 
            currentInput, 
            'FAST', 
            PERSONALITIES.AI_COMPANION.instruction
        );

        let fullResponse = "";
        
        // Add placeholder for model response
        const responseId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, {
            id: responseId,
            role: 'model',
            content: '',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);

        for await (const chunk of stream) {
            const text = chunk.text;
            if (text) {
                fullResponse += text;
                setMessages(prev => prev.map(m => 
                    m.id === responseId ? { ...m, content: fullResponse } : m
                ));
            }
        }

        // Trigger voice output after text is complete
        await playResponse(fullResponse);

    } catch (error) {
        console.error("Chat error:", error);
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            content: "Error: Connection interrupted.",
            timestamp: new Date().toLocaleTimeString()
        }]);
    } finally {
        setIsStreaming(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 border-b border-zinc-800 pb-4 flex justify-between items-center">
        <div>
            <h2 className="text-3xl font-sans font-bold text-white">AI COMPANION</h2>
            <p className="text-zinc-500 font-mono text-sm">Personalized Strategic Partner</p>
        </div>
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isTalking ? 'bg-cyber-green animate-pulse' : 'bg-zinc-700'}`}></div>
            <span className="text-xs font-mono text-zinc-500">{isTalking ? 'SPEAKING' : 'IDLE'}</span>
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
        
        {isStreaming && messages[messages.length - 1]?.role === 'user' && (
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
