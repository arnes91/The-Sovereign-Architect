import React from 'react';
import { View } from '../../types';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const menu = [
    { id: View.DASHBOARD, label: 'EXECUTIVE', icon: 'M4 6h16M4 12h16m-7 6h7' },
    { id: View.AI_COMPANION, label: 'AI COMPANION', icon: 'M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z' },
    { id: View.DBZ_SCANNER, label: 'DBZ SCANNER', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { id: View.CONCEPT_STUDIO, label: 'CONCEPT STUDIO', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: View.DEEP_ARCHITECT, label: 'STRATEGY NODE', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
    { id: View.LIVE_UPLINK, label: 'LIVE UPLINK', icon: 'M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 012.728 0M12 12a3 3 0 100-6 3 3 0 000 6z' },
  ];

  return (
    <div className="w-64 border-r border-zinc-800 bg-black flex flex-col h-full hidden md:flex">
      <div className="p-6">
        <div className="text-2xl font-bold tracking-tighter text-white">BRZI<span className="text-cyber-green">.AI</span></div>
        <div className="text-[10px] font-mono text-zinc-600 mt-1">SOVEREIGN ARCHITECTURE v7.0</div>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        {menu.map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold font-mono tracking-widest rounded transition-all ${
              currentView === item.id 
              ? 'bg-zinc-900 text-white border border-zinc-700' 
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-zinc-900">
         <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-cyber-green animate-pulse"></div>
             <span className="text-[10px] font-mono text-zinc-500">SYSTEM OPTIMAL</span>
         </div>
      </div>
    </div>
  );
};

export default Sidebar;
