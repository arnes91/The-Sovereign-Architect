
import React from 'react';
import { View } from '../../types';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  isMobile?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isMobile }) => {
  const menu = [
    { id: View.DASHBOARD, label: 'EXECUTIVE', icon: 'M4 6h16M4 12h16m-7 6h7' },
    { id: View.ADINS_PLAYGROUND, label: "ADIN'S WORLD", icon: 'M13 10V3L4 14h7v7l9-11h-7z' }, // Rocket/Bolt icon reuse
    { id: View.AI_COMPANION, label: 'AI COMPANION', icon: 'M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z' },
    { id: View.KNOWLEDGE_BASE, label: 'KNOWLEDGE BASE', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { id: View.DBZ_SCANNER, label: 'DBZ SCANNER', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { id: View.ANALYTICS_LAB, label: 'ANALYTICS LAB', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: View.CONCEPT_STUDIO, label: 'CONCEPT STUDIO', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: View.AI_COMPOSER, label: 'AI COMPOSER', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3' },
    { id: View.VISUALIZER, label: 'GLITCH VISUALIZER', icon: 'M4 10h3l3 8 4-12 3 8h3' },
    { id: View.UPLOAD_DECK, label: 'DISTROKID PIPELINE', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { id: View.YOUTUBE_PIPELINE, label: 'YOUTUBE PIPELINE', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
    { id: View.DEEP_ARCHITECT, label: 'STRATEGY NODE', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
    { id: View.LIVE_UPLINK, label: 'LIVE UPLINK', icon: 'M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 012.728 0M12 12a3 3 0 100-6 3 3 0 000 6z' },
    { id: View.MANAGED_AGENTS_LAB, label: 'MANAGED AGENTS', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  ];

  const showInfo = (label: string) => {
      alert(`DOCS: Viewing documentation for ${label}.\nRef: WORKFLOW.md`);
  };

  return (
    <div className={`w-64 border-r border-zinc-800 bg-black flex flex-col h-full ${isMobile ? 'flex' : 'hidden md:flex'}`}>
      <div className="p-6">
        <div className="text-2xl font-bold tracking-tighter text-white">BRZI<span className="text-cyber-green">.AI</span></div>
        <div className="text-[10px] font-mono text-zinc-600 mt-1">SOVEREIGN ARCHITECTURE v8.0</div>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {menu.map(item => (
          <div key={item.id} className="flex items-center gap-2 group">
              <button
                onClick={() => setView(item.id)}
                className={`flex-1 flex items-center gap-3 px-4 py-3 text-xs font-bold font-mono tracking-widest rounded transition-all ${
                  currentView === item.id 
                  ? 'bg-zinc-900 text-white border border-zinc-700' 
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
                {item.label}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); showInfo(item.label); }}
                className="p-2 text-zinc-700 hover:text-cyber-green opacity-0 group-hover:opacity-100 transition-opacity"
                title="Module Info"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>
          </div>
        ))}
      </nav>

      <div className="p-6 border-t border-zinc-900 flex justify-between items-center">
         <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-cyber-green animate-pulse"></div>
             <span className="text-[10px] font-mono text-zinc-500">SYSTEM OPTIMAL</span>
         </div>
         <button 
             onClick={() => {
                 import('../../firebase').then(({ auth }) => {
                     auth.signOut();
                 });
             }}
             className="text-[10px] font-mono text-zinc-500 hover:text-red-500 transition-colors"
             title="Sign Out"
         >
             LOGOUT
         </button>
      </div>
    </div>
  );
};

export default Sidebar;
