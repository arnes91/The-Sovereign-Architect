
import React, { useState, useRef, useEffect } from 'react';
import { streamStrategyChat } from '../services/geminiService';
import { GroundingMetadata } from '../types';
import ReactMarkdown from 'react-markdown';
import { LoggerService } from '../services/loggerService';

interface DeepArchitectProps {
    demoTrigger?: string; // New prop for demo mode
}

const DeepArchitect: React.FC<DeepArchitectProps> = ({ demoTrigger }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [mode, setMode] = useState<'THINKING' | 'SEARCH' | 'FAST'>('THINKING');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Ref for speech recognition
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- DEMO MODE EFFECT ---
  useEffect(() => {
      let typeInterval: NodeJS.Timeout;
      if (demoTrigger === 'SIMULATE_CHAT' && !isStreaming) {
          const demoPrompt = "Analyze the current viral potential of AI wrapper apps in the Balkan market.";
          let charIndex = 0;
          
          setMessages([]); // Clear previous
          
          typeInterval = setInterval(() => {
              if (charIndex < demoPrompt.length) {
                  setInput(prev => prev + demoPrompt.charAt(charIndex));
                  charIndex++;
              } else {
                  clearInterval(typeInterval);
                  // Simulate send after typing
                  setTimeout(() => {
                      sendMessage(demoPrompt);
                  }, 500);
              }
          }, 30); // Typing speed
      }
      return () => {
          if (typeInterval) clearInterval(typeInterval);
      };
  }, [demoTrigger]);

  useEffect(() => {
    // Init Speech Recognition if available
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';
        
        recognitionRef.current.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(prev => prev + (prev ? ' ' : '') + transcript);
            setIsListening(false);
        };
        
        recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
        };
        
        recognitionRef.current.onend = () => {
            setIsListening(false);
        };
    }
  }, []);

  const toggleListening = () => {
      if (!recognitionRef.current) return;
      if (isListening) {
          recognitionRef.current.stop();
      } else {
          setIsListening(true);
          recognitionRef.current.start();
      }
  };

  const sendMessage = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || isStreaming) return;

    const userMsg = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, { ...userMsg, type: 'user' }]);
    setInput('');
    setIsStreaming(true);

    // If simulating, fake the response for reliability and speed during demo
    if (demoTrigger === 'SIMULATE_CHAT') {
        setTimeout(() => {
             setMessages(prev => [...prev, { role: 'model', content: '', type: 'model', isThinking: true }]);
             
             const fakeResponse = "Analysis Complete.\n\n**Market Opportunity:** High.\n**Trend:** Micro-SaaS AI wrappers are seeing 300% growth in EU emerging markets.\n**Strategy:** Leverage 'Brzi Arzi' brand for localized distribution. Focus on low-latency voice interaction.";
             let i = 0;
             const streamInt = setInterval(() => {
                 setMessages(prev => {
                    const newArr = [...prev];
                    newArr[newArr.length - 1].content = fakeResponse.substring(0, i);
                    newArr[newArr.length - 1].isThinking = false;
                    return newArr;
                 });
                 i++;
                 if (i > fakeResponse.length) {
                     clearInterval(streamInt);
                     setIsStreaming(false);
                 }
             }, 20);
        }, 1000);
        return;
    }

    const apiHistory = messages.map(m => ({ role: m.role, parts: [{ text: m.content }] }));

    try {
        let fullResponse = '';
        let groundingData: GroundingMetadata | null = null;
        
        LoggerService.logAgent(`Strategic query initiated. Mode: ${mode}`, { prompt: userMsg.content });
        setMessages(prev => [...prev, { role: 'model', content: '', type: 'model', isThinking: mode === 'THINKING' }]);

        const stream = streamStrategyChat(apiHistory, userMsg.content, mode);
        
        for await (const chunk of stream) {
            const text = chunk.text;
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
        
        if (groundingData) {
            LoggerService.logAgent(`Strategic response completed with grounding sources.`, { sourcesCount: groundingData.groundingChunks?.length });
            setMessages(prev => {
                const newArr = [...prev];
                const last = newArr[newArr.length - 1];
                last.groundingMetadata = groundingData;
                return newArr;
            });
        } else {
            LoggerService.logAgent(`Strategic response completed.`);
        }

    } catch (e: any) {
        LoggerService.logError(`Deep Architect process error: ${e.message || e}`, { error: e });
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
                        <ReactMarkdown>{msg.content || ''}</ReactMarkdown>
                    </div>
                    
                    {!!(msg.groundingMetadata && msg.groundingMetadata.groundingChunks && msg.groundingMetadata.groundingChunks.length > 0) && (
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

      <div className="relative flex gap-2">
        {/* Voice Input Button */}
        <button
            onClick={toggleListening}
            className={`p-4 rounded-lg border transition-all ${
                isListening 
                ? 'bg-red-600 text-white border-red-500 animate-pulse' 
                : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white'
            }`}
            title="Toggle Voice Input"
        >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
        </button>

        <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={isListening ? "Listening..." : mode === 'THINKING' ? "Ask a complex strategic question..." : "Ask for market intel..."}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg py-4 px-6 text-white font-sans focus:outline-none focus:border-cyber-green transition-colors"
            disabled={isStreaming}
        />
        <button 
            onClick={() => sendMessage()}
            disabled={isStreaming}
            className="bg-zinc-800 hover:bg-zinc-700 text-white p-4 rounded-lg flex items-center justify-center disabled:opacity-50 min-w-[3.5rem]"
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
