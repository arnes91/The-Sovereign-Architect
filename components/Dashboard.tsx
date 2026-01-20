
import React from 'react';
import { View } from '../types';

interface DashboardProps {
    onNavigate?: (view: View) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  return (
    <div className="p-6 h-full overflow-y-auto bg-zinc-950">
        <header className="mb-8 border-b border-zinc-800 pb-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-6xl font-sans font-black mb-2 text-white tracking-tighter">THE SOVEREIGN <span className="text-cyber-green">ARCHITECT</span></h1>
                    <p className="text-zinc-500 font-mono text-sm uppercase tracking-[0.3em]">System Version: 1.0 // Phase: Awakening</p>
                </div>
                <div className="text-right hidden md:block">
                    <div className="text-xs font-mono text-zinc-600">UPTIME</div>
                    <div className="text-xl font-bold text-white">99.9%</div>
                </div>
            </div>
        </header>

        {/* Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
                <h3 className="text-xs font-mono text-zinc-500 mb-1">SYSTEM HEALTH</h3>
                <div className="text-2xl font-bold text-cyber-green">OPERATIONAL</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
                <h3 className="text-xs font-mono text-zinc-500 mb-1">MEMORY PROTOCOL</h3>
                <div className="text-2xl font-bold text-yellow-500">LOCAL (VOLATILE)</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
                <h3 className="text-xs font-mono text-zinc-500 mb-1">AUTONOMY LEVEL</h3>
                <div className="text-2xl font-bold text-zinc-400">SEMI-AUTONOMOUS</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
                 <h3 className="text-xs font-mono text-zinc-500 mb-1">ACTIVE NODES</h3>
                 <div className="text-2xl font-bold text-white">8 MODULES</div>
            </div>
        </div>

        {/* Quick Actions */}
        <h2 className="text-sm font-mono text-zinc-500 mb-4 uppercase tracking-widest">Command Center</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
                { label: 'LIVE UPLINK', view: View.LIVE_UPLINK, color: 'border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black' },
                { label: 'DBZ SCANNER', view: View.DBZ_SCANNER, color: 'border-red-500 text-red-500 hover:bg-red-500 hover:text-white' },
                { label: 'STRATEGY', view: View.DEEP_ARCHITECT, color: 'border-white text-white hover:bg-white hover:text-black' },
                { label: 'VISUALIZER', view: View.VISUALIZER, color: 'border-cyber-purple text-cyber-purple hover:bg-cyber-purple hover:text-white' },
            ].map((action, i) => (
                <button
                    key={i}
                    onClick={() => onNavigate?.(action.view)}
                    className={`p-6 border bg-black transition-all rounded-sm font-mono font-bold text-sm tracking-widest flex items-center justify-center shadow-lg ${action.color}`}
                >
                    {action.label}
                </button>
            ))}
        </div>

        {/* Blueprint Access */}
        <div className="border-t border-zinc-800 pt-8">
            <div className="flex items-center gap-4 mb-6">
                 <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                 <h2 className="text-xl font-bold text-white">STRATEGIC ROADMAP</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded relative overflow-hidden group cursor-help">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full transition-transform group-hover:scale-110"></div>
                    <h3 className="font-bold text-white mb-2 relative z-10">THE SINGULARITY PROTOCOL</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed relative z-10">
                        Transitioning from basic response models to <strong>Emergent Autonomous Agents</strong>. 
                        Targeting integration of Vector Databases (Pinecone/Supabase) to grant the AI persistent memory and emotional states that survive session resets.
                    </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-bl-full transition-transform group-hover:scale-110"></div>
                    <h3 className="font-bold text-white mb-2 relative z-10">GLITCH REPORT</h3>
                    <ul className="text-zinc-400 text-sm space-y-2 relative z-10">
                        <li className="flex items-center gap-2">
                            <span className="text-red-500">●</span> Visualizer Export Frame Sync
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-yellow-500">●</span> LocalStorage Dependency
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-blue-500">●</span> Mobile Viewport Optimization
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;
