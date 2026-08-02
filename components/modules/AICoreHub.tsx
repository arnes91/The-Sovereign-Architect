import React, { useState } from 'react';
import AICompanion from './AICompanion';
import DeepArchitect from '../DeepArchitect';
import LiveUplink from '../LiveUplink';
import { Bot, Cpu, Radio, Sparkles } from 'lucide-react';

export interface AICoreHubProps {
  initialTab?: 'COMPANION' | 'STRATEGY' | 'LIVE_UPLINK';
  demoTrigger?: string;
}

export const AICoreHub: React.FC<AICoreHubProps> = ({ initialTab = 'COMPANION', demoTrigger }) => {
  const [activeSubTab, setActiveSubTab] = useState<'COMPANION' | 'STRATEGY' | 'LIVE_UPLINK'>(initialTab);

  return (
    <div className="h-full flex flex-col md:flex-row bg-black overflow-hidden relative">
      {/* Left Navigation Sub-Menu */}
      <div className="md:w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col shrink-0 z-20">
        <div className="p-4 border-b border-zinc-800 hidden md:flex items-center gap-2">
          <div className="p-2 bg-cyber-green/10 border border-cyber-green/30 rounded-lg">
            <Cpu className="w-5 h-5 text-cyber-green animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold text-white leading-tight">NEURAL AI CORE</h2>
            <p className="text-[10px] font-mono text-zinc-500">CONSOLIDATED HUB</p>
          </div>
        </div>

        {/* Sub-tab selection buttons */}
        <div className="flex md:flex-col gap-1 p-2 md:p-4 overflow-x-auto md:overflow-y-auto">
          <button
            onClick={() => setActiveSubTab('COMPANION')}
            className={`flex-none flex items-center justify-start gap-3 px-3 py-2.5 rounded text-xs font-mono font-bold transition-all ${
              activeSubTab === 'COMPANION'
                ? 'bg-cyber-green/10 text-cyber-green border border-cyber-green/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span className="hidden md:inline">AI COMPANION</span>
            <span className="md:hidden">COMPANION</span>
          </button>

          <button
            onClick={() => setActiveSubTab('STRATEGY')}
            className={`flex-none flex items-center justify-start gap-3 px-3 py-2.5 rounded text-xs font-mono font-bold transition-all ${
              activeSubTab === 'STRATEGY'
                ? 'bg-cyber-green/10 text-cyber-green border border-cyber-green/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden md:inline">STRATEGY NODE</span>
            <span className="md:hidden">STRATEGY</span>
          </button>

          <button
            onClick={() => setActiveSubTab('LIVE_UPLINK')}
            className={`flex-none flex items-center justify-start gap-3 px-3 py-2.5 rounded text-xs font-mono font-bold transition-all ${
              activeSubTab === 'LIVE_UPLINK'
                ? 'bg-cyber-green/10 text-cyber-green border border-cyber-green/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span className="hidden md:inline">LIVE UPLINK</span>
            <span className="md:hidden">UPLINK</span>
          </button>
        </div>
      </div>

      {/* Main active sub-module container */}
      <div className="flex-1 overflow-hidden relative">
        {activeSubTab === 'COMPANION' && (
          <div className="h-full overflow-y-auto">
            <AICompanion demoTrigger={demoTrigger} />
          </div>
        )}

        {activeSubTab === 'STRATEGY' && (
          <div className="h-full overflow-y-auto">
            <DeepArchitect demoTrigger={demoTrigger} />
          </div>
        )}

        {activeSubTab === 'LIVE_UPLINK' && (
          <div className="h-full overflow-y-auto">
            <LiveUplink />
          </div>
        )}
      </div>
    </div>
  );
};

export default AICoreHub;
