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
    <div className="h-full flex flex-col bg-black overflow-hidden relative">
      {/* Neural Core Module Header */}
      <div className="bg-zinc-950 border-b border-zinc-800 p-3 md:p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-cyber-green/10 border border-cyber-green/30 rounded-lg">
            <Cpu className="w-5 h-5 text-cyber-green animate-pulse" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-mono font-bold text-white flex items-center gap-2">
              NEURAL AI CORE <span className="text-[10px] bg-cyber-green/20 text-cyber-green border border-cyber-green/40 px-2 py-0.5 rounded font-mono">CONSOLIDATED HUB</span>
            </h2>
            <p className="text-[11px] font-mono text-zinc-500 hidden sm:block">
              AI Companion • Strategy Node (Deep Architect) • Live Uplink (Voice & Vision)
            </p>
          </div>
        </div>

        {/* Sub-tab selection buttons */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('COMPANION')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
              activeSubTab === 'COMPANION'
                ? 'bg-cyber-green text-black shadow-[0_0_12px_rgba(0,255,65,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI COMPANION</span>
          </button>

          <button
            onClick={() => setActiveSubTab('STRATEGY')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
              activeSubTab === 'STRATEGY'
                ? 'bg-cyber-green text-black shadow-[0_0_12px_rgba(0,255,65,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>STRATEGY NODE</span>
          </button>

          <button
            onClick={() => setActiveSubTab('LIVE_UPLINK')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
              activeSubTab === 'LIVE_UPLINK'
                ? 'bg-cyber-green text-black shadow-[0_0_12px_rgba(0,255,65,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>LIVE UPLINK</span>
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
