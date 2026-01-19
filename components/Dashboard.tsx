import React from 'react';
import { View } from '../types';

interface DashboardProps {
    onNavigate?: (view: View) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  return (
    <div className="p-6 h-full overflow-y-auto">
        <header className="mb-12">
            <h1 className="text-5xl font-sans font-bold mb-4 text-white">THE QUIET ARCHITECT</h1>
            <p className="text-xl text-zinc-400 font-light max-w-2xl">
                A strategic ecosystem integrating high-frequency creative output with rigorous, enterprise-grade technical infrastructure.
            </p>
        </header>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
                { label: 'NEW CONCEPT', view: View.CONCEPT_STUDIO, color: 'border-cyber-purple text-cyber-purple' },
                { label: 'POWER SCAN', view: View.DBZ_SCANNER, color: 'border-red-500 text-red-500' },
                { label: 'STRATEGY', view: View.DEEP_ARCHITECT, color: 'border-white text-white' },
                { label: 'VISUALIZER', view: View.VISUALIZER, color: 'border-cyber-green text-cyber-green' },
            ].map((action, i) => (
                <button
                    key={i}
                    onClick={() => onNavigate?.(action.view)}
                    className={`p-4 border bg-zinc-900/50 hover:bg-zinc-800 transition-colors rounded-lg font-mono font-bold text-xs tracking-widest ${action.color}`}
                >
                    + {action.label}
                </button>
            ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg hover:border-cyber-green transition-colors group">
                <h3 className="text-cyber-green font-mono text-sm mb-2 group-hover:translate-x-1 transition-transform">PHASE 1: BUILD</h3>
                <p className="text-zinc-300 text-sm leading-relaxed">Development of modular technical tools (SunoSync, Dashboard). Creating proprietary assets to streamline future production.</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg hover:border-cyber-purple transition-colors group">
                <h3 className="text-cyber-purple font-mono text-sm mb-2 group-hover:translate-x-1 transition-transform">PHASE 2: USE</h3>
                <p className="text-zinc-300 text-sm leading-relaxed">Immediate application of tools to generate creative assets for "Brzi Arzi". Validating tools via "dogfooding".</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg hover:border-white transition-colors group">
                <h3 className="text-white font-mono text-sm mb-2 group-hover:translate-x-1 transition-transform">PHASE 3: PRODUCTIZE</h3>
                <p className="text-zinc-300 text-sm leading-relaxed">Packaging workflows into "Ritual Packs" & "Echo Nodes". Monetizing the exhaust of the production process.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="border border-zinc-800 bg-black/50 p-6 rounded-lg">
                <h2 className="text-2xl font-bold text-white mb-4">GEOPOLITICAL MOAT</h2>
                <div className="space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-zinc-800 flex items-center justify-center font-bold text-lg text-zinc-500">BS</div>
                        <div>
                            <h4 className="font-bold text-zinc-200">Balkan as Feature</h4>
                            <p className="text-sm text-zinc-400 mt-1">Leveraging regional resilience and multilingual capabilities. Local-First software design to ensure sovereignty.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-zinc-800 flex items-center justify-center font-bold text-lg text-zinc-500">$$</div>
                        <div>
                            <h4 className="font-bold text-zinc-200">DePIN Strategy</h4>
                            <p className="text-sm text-zinc-400 mt-1">Pivot to Grass and Render networks to circumvent geo-blocking in Silicon Valley affiliate programs.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="border border-zinc-800 bg-black/50 p-6 rounded-lg relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-20 text-6xl font-bold text-zinc-700">V7</div>
                 <h2 className="text-2xl font-bold text-white mb-4">VALIDATOR ECONOMY</h2>
                 <p className="text-zinc-400 text-sm mb-6">
                    Targeting high-yield revenue by acting as a "High-Competency Validator" for major AI labs.
                 </p>
                 <div className="flex justify-between items-center bg-zinc-900 p-4 rounded mb-2">
                    <span className="font-mono text-xs text-zinc-500">PROSUMER VALUATION</span>
                    <span className="font-bold text-cyber-green">50x Standard User</span>
                 </div>
                 <div className="flex justify-between items-center bg-zinc-900 p-4 rounded">
                    <span className="font-mono text-xs text-zinc-500">TARGET PLATFORMS</span>
                    <span className="font-bold text-white">Scale.ai / Respondent</span>
                 </div>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;