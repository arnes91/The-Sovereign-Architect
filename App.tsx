import React, { useState } from 'react';
import { View } from './types';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './components/Dashboard';
import DBZScanner from './components/DBZScanner';
import ConceptStudio from './components/ConceptStudio';
import DeepArchitect from './components/DeepArchitect';
import LiveUplink from './components/LiveUplink';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);

  const renderView = () => {
    switch (currentView) {
      case View.DASHBOARD: return <Dashboard />;
      case View.DBZ_SCANNER: return <DBZScanner />;
      case View.CONCEPT_STUDIO: return <ConceptStudio />;
      case View.DEEP_ARCHITECT: return <DeepArchitect />;
      case View.LIVE_UPLINK: return <LiveUplink />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-black text-white font-sans overflow-hidden">
      <Sidebar currentView={currentView} setView={setCurrentView} />
      
      <main className="flex-1 h-full bg-zinc-950 relative">
        {/* Mobile Header */}
        <div className="md:hidden p-4 border-b border-zinc-800 flex justify-between items-center bg-black">
             <span className="font-bold text-white">BRZI.AI</span>
             <select 
                value={currentView} 
                onChange={(e) => setCurrentView(e.target.value as View)}
                className="bg-zinc-900 text-xs p-2 rounded border border-zinc-700"
             >
                 {Object.values(View).map(v => <option key={v} value={v}>{v}</option>)}
             </select>
        </div>

        {renderView()}

        {/* Global Grain/Overlay Effect */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[url('https://upload.wikimedia.org/wikipedia/commons/7/76/Noise.png')]"></div>
      </main>
    </div>
  );
};

export default App;
