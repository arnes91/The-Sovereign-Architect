import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storageService';

interface OttoBridgeProps {
    onClose?: () => void;
}

const OttoBridge: React.FC<OttoBridgeProps> = ({ onClose }) => {
    const [status, setStatus] = useState<'IDLE' | 'CONNECTING' | 'CONNECTED' | 'ERROR'>('IDLE');
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    useEffect(() => {
        const connectOtto = async () => {
            setStatus('CONNECTING');
            addLog("Initializing Otto Copilot Bridge...");
            
            try {
                // Simulate connection process
                await new Promise(r => setTimeout(r, 1500));
                
                // Check for required config (simulated)
                const config = await StorageService.getOttoConfig();
                if (!config) {
                    addLog("No Otto configuration found. Initializing default context.");
                    await StorageService.saveOttoConfig({
                        version: "1.0",
                        lastSync: Date.now(),
                        activeAgents: []
                    });
                }

                setStatus('CONNECTED');
                addLog("Otto Bridge Connected successfully.");
                addLog("Awaiting instructions from agpt.co workflows...");

            } catch (e: any) {
                setStatus('ERROR');
                addLog(`Connection Failed: ${e.message}`);
            }
        };

        connectOtto();
    }, []);

    return (
        <div className="h-full flex flex-col p-6 bg-zinc-950 border border-zinc-800 rounded-xl relative overflow-hidden">
            {/* Background Glitch Effect */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #00FF00 2px, #00FF00 4px)',
                backgroundSize: '100% 4px'
            }}></div>

            <div className="relative z-10 flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-white font-mono flex items-center gap-2">
                        <span className="text-cyber-green">{'//'}</span> OTTO COPILOT BRIDGE
                    </h2>
                    <p className="text-zinc-500 text-sm font-mono mt-1">agpt.co Integration Module</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${
                            status === 'CONNECTED' ? 'bg-cyber-green animate-pulse' : 
                            status === 'CONNECTING' ? 'bg-yellow-500 animate-bounce' : 
                            status === 'ERROR' ? 'bg-red-500' : 'bg-zinc-600'
                        }`}></span>
                        <span className="text-xs font-mono text-zinc-400">{status}</span>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="text-zinc-500 hover:text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 bg-black border border-zinc-800 rounded-lg p-4 font-mono text-sm overflow-y-auto relative z-10">
                <div className="space-y-2">
                    {logs.map((log, i) => (
                        <div key={i} className="text-zinc-300">
                            {log.includes('ERROR') || log.includes('Failed') ? (
                                <span className="text-red-400">{log}</span>
                            ) : log.includes('Connected') || log.includes('successfully') ? (
                                <span className="text-cyber-green">{log}</span>
                            ) : (
                                log
                            )}
                        </div>
                    ))}
                    {status === 'CONNECTED' && (
                        <div className="flex items-center gap-2 text-zinc-500 mt-4">
                            <span className="animate-pulse">_</span>
                            <span>Listening on port 8080...</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4 relative z-10 flex gap-2">
                <button 
                    disabled={status !== 'CONNECTED'}
                    className="flex-1 bg-zinc-900 border border-zinc-700 text-white py-2 px-4 rounded font-mono text-sm hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                >
                    SYNC WORKFLOWS
                </button>
                <button 
                    disabled={status !== 'CONNECTED'}
                    className="flex-1 bg-cyber-green/10 border border-cyber-green/50 text-cyber-green py-2 px-4 rounded font-mono text-sm hover:bg-cyber-green/20 disabled:opacity-50 transition-colors"
                >
                    TRIGGER AGENT
                </button>
            </div>
        </div>
    );
};

export default OttoBridge;
