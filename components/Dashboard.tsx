
import React, { useState } from 'react';
import { View } from '../types';
import { getAI } from '../services/geminiService';

interface DashboardProps {
    onNavigate?: (view: View) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [dbzResult, setDbzResult] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [fighter1, setFighter1] = useState('Goku');
  const [fighter2, setFighter2] = useState('Vegeta');

  const runStrategicAnalysis = async () => {
      setIsAnalyzing(true);
      try {
          const ai = getAI();
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: 'Provide a brief, 3-bullet point strategic insight for growing a music and AI focused brand in 2026. Keep it punchy and actionable.',
          });
          setAnalysisResult(response.text || 'Analysis failed.');
      } catch (e) {
          console.error(e);
          setAnalysisResult('Error running analysis.');
      } finally {
          setIsAnalyzing(false);
      }
  };

  const runBattleSimulation = async () => {
      setIsSimulating(true);
      try {
          const ai = getAI();
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Simulate a brief DBZ battle between ${fighter1} and ${fighter2}. Analyze their power levels, fighting styles, and declare a winner in 3-4 sentences.`,
          });
          setDbzResult(response.text || 'Simulation failed.');
      } catch (e) {
          console.error(e);
          setDbzResult('Error running simulation.');
      } finally {
          setIsSimulating(false);
      }
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-zinc-950 text-white pb-24">
        <header className="mb-8 border-b border-zinc-800 pb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-4xl md:text-6xl font-sans font-black mb-2 tracking-tighter">THE SOVEREIGN <span className="text-cyber-green">ARCHITECT</span></h1>
                    <p className="text-zinc-500 font-mono text-xs md:text-sm uppercase tracking-[0.2em] md:tracking-[0.3em]">System Version: 2.0 // Phase: Integration</p>
                </div>
                <div className="text-left md:text-right flex md:block gap-4">
                    <div>
                        <div className="text-xs font-mono text-zinc-600">UPTIME</div>
                        <div className="text-xl font-bold text-white">99.9%</div>
                    </div>
                </div>
            </div>
        </header>

        {/* Status Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
            <div className="bg-zinc-900/50 border border-zinc-800 p-3 md:p-4 rounded-lg">
                <h3 className="text-[10px] md:text-xs font-mono text-zinc-500 mb-1">SYSTEM HEALTH</h3>
                <div className="text-lg md:text-2xl font-bold text-cyber-green">OPERATIONAL</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 p-3 md:p-4 rounded-lg">
                <h3 className="text-[10px] md:text-xs font-mono text-zinc-500 mb-1">MEMORY PROTOCOL</h3>
                <div className="text-lg md:text-2xl font-bold text-blue-500">INDEXED DB</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 p-3 md:p-4 rounded-lg">
                <h3 className="text-[10px] md:text-xs font-mono text-zinc-500 mb-1">AUTONOMY LEVEL</h3>
                <div className="text-lg md:text-2xl font-bold text-zinc-400">SEMI-AUTONOMOUS</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 p-3 md:p-4 rounded-lg">
                 <h3 className="text-[10px] md:text-xs font-mono text-zinc-500 mb-1">ACTIVE NODES</h3>
                 <div className="text-lg md:text-2xl font-bold text-white">12 MODULES</div>
            </div>
        </div>

        {/* Command Center */}
        <h2 className="text-xs md:text-sm font-mono text-zinc-500 mb-3 uppercase tracking-widest">Command Center</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-10">
            {[
                { label: 'LIVE UPLINK', view: View.LIVE_UPLINK, color: 'border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black' },
                { label: 'DBZ SCANNER', view: View.DBZ_SCANNER, color: 'border-red-500 text-red-500 hover:bg-red-500 hover:text-white' },
                { label: 'STRATEGY', view: View.DEEP_ARCHITECT, color: 'border-white text-white hover:bg-white hover:text-black' },
                { label: 'ANALYTICS', view: View.ANALYTICS_LAB, color: 'border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white' },
            ].map((action, i) => (
                <button
                    key={i}
                    onClick={() => onNavigate?.(action.view)}
                    className={`p-4 md:p-6 border bg-black transition-all rounded-sm font-mono font-bold text-xs md:text-sm tracking-widest flex items-center justify-center shadow-lg ${action.color}`}
                >
                    {action.label}
                </button>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
            {/* Deep Strategic Analysis */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 md:p-6 rounded-xl flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                        Deep Strategic Analysis
                    </h2>
                    <button 
                        onClick={runStrategicAnalysis}
                        disabled={isAnalyzing}
                        className="px-3 py-1.5 bg-purple-500/20 text-purple-400 border border-purple-500/50 rounded text-xs font-mono hover:bg-purple-500 hover:text-white transition-colors disabled:opacity-50"
                    >
                        {isAnalyzing ? 'ANALYZING...' : 'RUN ANALYSIS'}
                    </button>
                </div>
                <div className="flex-1 bg-black border border-zinc-800 rounded p-4 text-sm text-zinc-300 font-mono whitespace-pre-wrap overflow-y-auto max-h-48">
                    {analysisResult || 'Awaiting command to generate strategic insights...'}
                </div>
            </div>

            {/* Automation Hub */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 md:p-6 rounded-xl flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                        Automation Hub
                    </h2>
                </div>
                <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between p-3 bg-black border border-zinc-800 rounded">
                        <div>
                            <div className="font-bold text-sm">YouTube to Spotify Sync</div>
                            <div className="text-xs text-zinc-500">Cross-promotes new releases</div>
                        </div>
                        <div className="text-xs font-mono text-zinc-500 border border-zinc-700 px-2 py-1 rounded">IDLE</div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-black border border-zinc-800 rounded">
                        <div>
                            <div className="font-bold text-sm">Social Media Blast</div>
                            <div className="text-xs text-zinc-500">Auto-generates posts for new content</div>
                        </div>
                        <div className="text-xs font-mono text-zinc-500 border border-zinc-700 px-2 py-1 rounded">IDLE</div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-black border border-zinc-800 rounded">
                        <div>
                            <div className="font-bold text-sm">Analytics Aggregation</div>
                            <div className="text-xs text-zinc-500">Compiles weekly performance reports</div>
                        </div>
                        <div className="text-xs font-mono text-cyber-green border border-cyber-green/50 px-2 py-1 rounded">ACTIVE</div>
                    </div>
                </div>
            </div>
        </div>

        {/* DBZ Power Scaling */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 md:p-6 rounded-xl mb-10">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                    DBZ Power Scaling & Simulation
                </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                    <label className="block text-xs font-mono text-zinc-500 mb-1">FIGHTER 1</label>
                    <input 
                        type="text" 
                        value={fighter1}
                        onChange={(e) => setFighter1(e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded p-2 text-sm text-white focus:border-orange-500 outline-none"
                    />
                </div>
                <div className="flex items-end justify-center pb-2">
                    <span className="text-xl font-black text-orange-500 italic">VS</span>
                </div>
                <div>
                    <label className="block text-xs font-mono text-zinc-500 mb-1">FIGHTER 2</label>
                    <input 
                        type="text" 
                        value={fighter2}
                        onChange={(e) => setFighter2(e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded p-2 text-sm text-white focus:border-orange-500 outline-none"
                    />
                </div>
            </div>
            <button 
                onClick={runBattleSimulation}
                disabled={isSimulating || !fighter1 || !fighter2}
                className="w-full py-3 bg-orange-500/20 text-orange-400 border border-orange-500/50 rounded text-sm font-bold tracking-widest hover:bg-orange-500 hover:text-white transition-colors disabled:opacity-50 mb-4"
            >
                {isSimulating ? 'SIMULATING BATTLE...' : 'INITIATE COMBAT SIMULATION'}
            </button>
            {dbzResult && (
                <div className="bg-black border border-zinc-800 rounded p-4 text-sm text-zinc-300 font-mono whitespace-pre-wrap">
                    {dbzResult}
                </div>
            )}
        </div>

    </div>
  );
};

export default Dashboard;
