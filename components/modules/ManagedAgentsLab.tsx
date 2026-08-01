import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface AgentStep {
  type: string;
  content?: { type: string; text?: string }[];
}

interface Message {
  role: 'user' | 'agent';
  text: string;
  steps?: AgentStep[];
}

export const ManagedAgentsLab: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [interactionId, setInteractionId] = useState<string | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('/api/agents/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: userMessage,
          previousInteractionId: interactionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to communicate with agent');
      }

      setInteractionId(data.interactionId);
      setMessages(prev => [
        ...prev,
        { role: 'agent', text: data.output, steps: data.steps },
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { role: 'agent', text: `**Error**: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-5xl mx-auto w-full">
      <div className="mb-6 border-b border-zinc-800 pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-sans font-bold text-white">MANAGED AGENTS LAB</h2>
          <p className="text-zinc-500 font-mono text-sm">Powered by Antigravity Sandbox Environment</p>
        </div>
      </div>

      <div className="flex-1 bg-black border border-zinc-800 rounded-lg p-6 mb-6 overflow-y-auto flex flex-col gap-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 font-mono text-sm opacity-50">
            <p>Remote execution environment ready.</p>
            <p>Waiting for instructions...</p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-4 ${msg.role === 'user' ? 'bg-zinc-800 text-white' : 'bg-zinc-900 border border-zinc-700 text-zinc-300'}`}>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
              
              {msg.steps && msg.steps.length > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <p className="text-xs font-mono text-zinc-500 mb-2">Execution Trace:</p>
                  <div className="flex flex-col gap-1 text-[10px] font-mono text-zinc-600">
                    {msg.steps.map((step, stepIdx) => (
                      <div key={stepIdx} className="flex gap-2">
                        <span className="text-cyber-green">{step.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-start">
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-zinc-400 font-mono text-sm flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-cyber-purple border-t-transparent rounded-full animate-spin"></div>
              Agent is reasoning and executing...
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the Antigravity agent to write code, fetch a webpage, or execute a script..."
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-cyber-purple"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-zinc-100 hover:bg-white text-black font-bold px-8 py-3 rounded uppercase tracking-widest font-mono disabled:opacity-50"
        >
          {loading ? 'EXECUTING' : 'DISPATCH'}
        </button>
      </form>
    </div>
  );
};

export default ManagedAgentsLab;
