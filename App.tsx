import React, { useState } from 'react';
import { View } from './types';
import Sidebar from './components/layout/Sidebar';
import { ModuleGuard } from './components/core/ModuleGuard';

// Module Imports
import Dashboard from './components/Dashboard';
import DBZScanner from './components/DBZScanner';
import ConceptStudio from './components/ConceptStudio';
import DeepArchitect from './components/DeepArchitect';
import LiveUplink from './components/LiveUplink';
import AICompanion from './components/modules/AICompanion';
import AIComposer from './components/modules/AIComposer';
import AnalyticsLab from './components/modules/AnalyticsLab';
import KnowledgeBase from './components/modules/KnowledgeBase';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(() => {
    // Deep Linking Check
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('scan')) return View.DBZ_SCANNER;
    }
    return View.DASHBOARD;
  });

  const renderView = () => {
    switch (currentView) {
      case View.DASHBOARD: 
        return <ModuleGuard moduleName="Dashboard"><Dashboard onNavigate={setCurrentView} /></ModuleGuard>;
      case View.AI_COMPANION:
        return <ModuleGuard moduleName="AI Companion"><AICompanion /></ModuleGuard>;
      case View.DBZ_SCANNER: 
        return <ModuleGuard moduleName="DBZ Scanner"><DBZScanner /></ModuleGuard>;
      case View.CONCEPT_STUDIO: 
        return <ModuleGuard moduleName="Concept Studio"><ConceptStudio /></ModuleGuard>;
      case View.AI_COMPOSER: 
        return <ModuleGuard moduleName="AI Composer"><AIComposer /></ModuleGuard>;
      case View.ANALYTICS_LAB: 
        return <ModuleGuard moduleName="Analytics Lab"><AnalyticsLab /></ModuleGuard>;
      case View.KNOWLEDGE_BASE: 
        return <ModuleGuard moduleName="Knowledge Base"><KnowledgeBase /></ModuleGuard>;
      case View.DEEP_ARCHITECT: 
        return <ModuleGuard moduleName="Deep Architect"><DeepArchitect /></ModuleGuard>;
      case View.LIVE_UPLINK: 
        return <ModuleGuard moduleName="Live Uplink"><LiveUplink /></ModuleGuard>;
      default: 
        return <ModuleGuard moduleName="Dashboard"><Dashboard onNavigate={setCurrentView} /></ModuleGuard>;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-black text-white font-sans overflow-hidden">
      <Sidebar currentView={currentView} setView={setCurrentView} />
      
      <main className="flex-1 h-full bg-zinc-950 relative flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden p-4 border-b border-zinc-800 flex justify-between items-center bg-black shrink-0">
             <span className="font-bold text-white">BRZI.AI</span>
             <select 
                value={currentView} 
                onChange={(e) => setCurrentView(e.target.value as View)}
                className="bg-zinc-900 text-xs p-2 rounded border border-zinc-700"
             >
                 {Object.values(View).map(v => <option key={v} value={v}>{v}</option>)}
             </select>
        </div>

        <div className="flex-1 overflow-hidden relative">
            {renderView()}
            <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[url('https://upload.wikimedia.org/wikipedia/commons/7/76/Noise.png')] z-50"></div>
        </div>
      </main>
    </div>
  );
};

export default App;