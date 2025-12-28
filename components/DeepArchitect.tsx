import React, { useState, useRef, useEffect } from 'react';
import { streamStrategyChat } from '../services/geminiService';
import { GroundingMetadata } from '../types';
import ReactMarkdown from 'react-markdown';

const DeepArchitect: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [mode, setMode] = useState<'THINKING' | 'SEARCH' | 'FAST'>('THINKING');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, { ...userMsg, type: 'user' }]);
    setInput('');
    setIsStreaming(true);

    // Prepare history for API (exclude local-only fields if any)
    const apiHistory = messages.map(m => ({ role: m.role, parts: [{ text: m.content }] }));

    try {
        let fullResponse = '';
        let groundingData: GroundingMetadata | null = null;
        
        // Add placeholder for model response
        setMessages(prev => [...prev, { role: 'model', content: '', type: 'model', isThinking: mode === 'THINKING' }]);

        const stream = streamStrategyChat(apiHistory, userMsg.content, mode);
        
        for await (const chunk of stream) {
            const text = chunk.text; // Access text via property, not method
            if (text) {
                fullResponse += text;
                setMessages(prev => {
                    const newArr = [...prev];
                    const last = newArr[newArr.length - 1];
                    last.content = fullResponse;
                    return newArr;
                });
            }
            if (chunk.candidates?.[0]?.groundingMetadata) {
                groundingData = chunk.candidates[0].groundingMetadata as unknown as GroundingMetadata;
            }
        }
        
        // Final update with grounding data
        if (groundingData) {
            setMessages(prev => {
                const newArr = [...prev];
                const last = newArr[newArr.length - 1];
                last.groundingMetadata = groundingData;
                return newArr;
            });
        }

    } catch (e) {
        console.error(e);
        setMessages(prev => [...prev, { role: 'model', content: "Error: Neural Link Severed.", type: 'error' }]);
    } finally {
        setIsStreaming(false);
    }
  };

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto p-4 md:p-6 w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-2xl font-bold font-sans text-white">DEEP ARCHITECT</h2>
            <p className="text-xs font-mono text-zinc-500">Strategic Advisor Node</p>
        </div>
        <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
            {(['THINKING', 'SEARCH', 'FAST'] as const).map(m => (
                <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold font-mono transition-all ${mode === m ? 'bg-zinc-100 text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    {m}
                </button>
            ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mb-6 space-y-6 pr-2">
        {messages.length === 0 && (
            <div className="h-full flex items-center justify-center text-zinc-700 font-mono text-sm">
                Awaiting strategic query...
            </div>
        )}
        {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg p-4 ${
                    msg.role === 'user' 
                    ? 'bg-zinc-800 text-white border border-zinc-700' 
                    : 'bg-black/40 text-zinc-300 border border-zinc-900'
                }`}>
                    <div className="prose prose-invert prose-sm max-w-none font-sans">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    
                    {msg.groundingMetadata && msg.groundingMetadata.groundingChunks?.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-zinc-800">
                            <p className="text-xs font-mono text-cyber-green mb-2">SOURCES DETECTED:</p>
                            <div className="flex flex-wrap gap-2">
                                {msg.groundingMetadata.groundingChunks.map((chunk: any, idx: number) => (
                                    chunk.web?.uri && (
                                        <a key={idx} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-xs bg-zinc-900 px-2 py-1 rounded text-zinc-400 hover:text-white truncate max-w-[200px] border border-zinc-800">
                                            {chunk.web.title || chunk.web.uri}
                                        </a>
                                    )
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="relative">
        <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={mode === 'THINKING' ? "Ask a complex strategic question..." : "Ask for market intel..."}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg py-4 px-6 text-white font-sans focus:outline-none focus:border-cyber-green transition-colors pr-16"
            disabled={isStreaming}
        />
        <button 
            onClick={sendMessage}
            disabled={isStreaming}
            className="absolute right-2 top-2 bottom-2 aspect-square bg-zinc-800 hover:bg-zinc-700 text-white rounded-md flex items-center justify-center disabled:opacity-50"
        >
            {isStreaming ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            )}
        </button>
      </div>
    </div>
  );
};

export default DeepArchitect;