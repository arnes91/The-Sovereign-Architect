
import React, { useState, useEffect } from 'react';
import { View } from './types';
import Sidebar from './components/layout/Sidebar';
import { ModuleGuard } from './components/core/ModuleGuard';
import { Auth } from './components/Auth';
import { supabase } from './services/supabaseClient';

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
import Visualizer from './components/Visualizer';
import UploadDeck from './components/modules/UploadDeck';
import AdinsPlayground from './components/modules/AdinsPlayground';
import ShowcaseController from './components/modules/ShowcaseController';

const isSupabaseConfigured = () => {
    return import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co';
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const [currentView, setCurrentView] = useState<View>(() => {
    // Deep Linking Check
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('scan')) return View.DBZ_SCANNER;
    }
    return View.DASHBOARD;
  });

  // DEMO STATE
  // We separate this from currentView so the Controller persists while changing views
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoAction, setDemoAction] = useState<string>("");

  const handleNavigate = (view: View) => {
      if (view === View.SHOWCASE_MODE) {
          setIsDemoMode(true);
      } else {
          setCurrentView(view);
      }
  };

  const renderView = () => {
    switch (currentView) {
      case View.DASHBOARD: 
        return <ModuleGuard moduleName="Dashboard"><Dashboard onNavigate={handleNavigate} /></ModuleGuard>;
      case View.AI_COMPANION:
        return <ModuleGuard moduleName="AI Companion"><AICompanion demoTrigger={demoAction} /></ModuleGuard>;
      case View.DBZ_SCANNER: 
        return <ModuleGuard moduleName="DBZ Scanner"><DBZScanner /></ModuleGuard>;
      case View.CONCEPT_STUDIO: 
        return <ModuleGuard moduleName="Concept Studio"><ConceptStudio demoTrigger={demoAction} /></ModuleGuard>;
      case View.AI_COMPOSER: 
        return <ModuleGuard moduleName="AI Composer"><AIComposer /></ModuleGuard>;
      case View.ANALYTICS_LAB: 
        return <ModuleGuard moduleName="Analytics Lab"><AnalyticsLab demoTrigger={demoAction} /></ModuleGuard>;
      case View.KNOWLEDGE_BASE: 
        return <ModuleGuard moduleName="Knowledge Base"><KnowledgeBase /></ModuleGuard>;
      case View.DEEP_ARCHITECT: 
        return <ModuleGuard moduleName="Deep Architect"><DeepArchitect demoTrigger={demoAction} /></ModuleGuard>;
      case View.LIVE_UPLINK: 
        return <ModuleGuard moduleName="Live Uplink"><LiveUplink /></ModuleGuard>;
      case View.VISUALIZER: 
        return <ModuleGuard moduleName="Visualizer"><Visualizer /></ModuleGuard>;
      case View.UPLOAD_DECK: 
        return <ModuleGuard moduleName="Upload Deck"><UploadDeck /></ModuleGuard>;
      case View.ADINS_PLAYGROUND:
        return <ModuleGuard moduleName="Adin's Playground"><AdinsPlayground /></ModuleGuard>;
      default: 
        return <ModuleGuard moduleName="Dashboard"><Dashboard onNavigate={handleNavigate} /></ModuleGuard>;
    }
  };

  if (loading) {
      return <div className="h-screen w-screen bg-black flex items-center justify-center text-white">INITIALIZING SOVEREIGN CORE...</div>;
  }

  if (isSupabaseConfigured() && !session) {
      return <Auth onLogin={() => {}} />;
  }

  return (
    <div className="flex h-screen w-screen bg-black text-white font-sans overflow-hidden">
      <Sidebar currentView={currentView} setView={handleNavigate} />
      
      {/* SHOWCASE CONTROLLER OVERLAY */}
      {/* This now sits ON TOP of the app and persists regardless of currentView */}
      {isDemoMode && (
          <ShowcaseController 
              onViewChange={(v) => setCurrentView(v)} 
              onActionTrigger={(a) => setDemoAction(a)}
              onExit={() => {
                  setIsDemoMode(false);
                  setCurrentView(View.DASHBOARD);
                  setDemoAction("");
              }}
          />
      )}

      <main className="flex-1 h-full bg-zinc-950 relative flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden p-4 border-b border-zinc-800 flex justify-between items-center bg-black shrink-0">
             <span className="font-bold text-white">BRZI.AI</span>
             <select 
                value={currentView} 
                onChange={(e) => handleNavigate(e.target.value as View)}
                className="bg-zinc-900 text-xs p-2 rounded border border-zinc-700"
             >
                 {Object.values(View).filter(v => v !== View.SHOWCASE_MODE).map(v => <option key={v} value={v}>{v}</option>)}
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
