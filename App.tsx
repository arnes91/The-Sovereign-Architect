
import React, { useState, useEffect } from 'react';
import { View } from './types';
import Sidebar from './components/layout/Sidebar';
import { ModuleGuard } from './components/core/ModuleGuard';
import { Auth } from './components/Auth';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

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
import YouTubePipeline from './components/modules/YouTubePipeline';
import AdinsPlayground from './components/modules/AdinsPlayground';
import ShowcaseController from './components/modules/ShowcaseController';
import ManagedAgentsLab from './components/modules/ManagedAgentsLab';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedGuest = localStorage.getItem('brzi_guest_session');
    if (savedGuest) {
      try {
        setSession(JSON.parse(savedGuest));
      } catch (e) {
        localStorage.removeItem('brzi_guest_session');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setSession(user);
        localStorage.removeItem('brzi_guest_session');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGuestLogin = () => {
    const guestUser = {
      uid: 'guest_architect',
      email: 'guest@brzi.ai',
      displayName: 'Guest Architect',
      isGuest: true
    };
    localStorage.setItem('brzi_guest_session', JSON.stringify(guestUser));
    setSession(guestUser);
  };

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
        return <ModuleGuard moduleName="DistroKid Pipeline"><UploadDeck /></ModuleGuard>;
      case View.YOUTUBE_PIPELINE: 
        return <ModuleGuard moduleName="YouTube Pipeline"><YouTubePipeline /></ModuleGuard>;
      case View.ADINS_PLAYGROUND:
        return <ModuleGuard moduleName="Adin's Playground"><AdinsPlayground /></ModuleGuard>;
      case View.MANAGED_AGENTS_LAB:
        return <ModuleGuard moduleName="Managed Agents Lab"><ManagedAgentsLab /></ModuleGuard>;
      default: 
        return <ModuleGuard moduleName="Dashboard"><Dashboard onNavigate={handleNavigate} /></ModuleGuard>;
    }
  };

  if (loading) {
      return <div className="h-screen w-screen bg-black flex items-center justify-center text-white">INITIALIZING SOVEREIGN CORE...</div>;
  }

  if (!session) {
      return <Auth onLogin={() => {}} onGuestLogin={handleGuestLogin} />;
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
             <span className="font-bold text-white tracking-tighter">BRZI<span className="text-cyber-green">.AI</span></span>
             <select 
                value={currentView} 
                onChange={(e) => handleNavigate(e.target.value as View)}
                className="bg-zinc-900 text-xs p-2 rounded border border-zinc-700 font-mono text-cyber-green font-bold uppercase tracking-widest focus:outline-none"
             >
                 <option value={View.DASHBOARD}>Executive Dashboard</option>
                 <option value={View.ADINS_PLAYGROUND}>Adin's World</option>
                 <option value={View.AI_COMPANION}>AI Companion</option>
                 <option value={View.KNOWLEDGE_BASE}>Knowledge Core</option>
                 <option value={View.DBZ_SCANNER}>DBZ Scanner</option>
                 <option value={View.ANALYTICS_LAB}>Analytics Lab</option>
                 <option value={View.CONCEPT_STUDIO}>Concept Studio</option>
                 <option value={View.AI_COMPOSER}>AI Composer</option>
                 <option value={View.VISUALIZER}>Glitch Visualizer</option>
                 <option value={View.UPLOAD_DECK}>DistroKid Pipeline</option>
                 <option value={View.YOUTUBE_PIPELINE}>YouTube Pipeline</option>
                 <option value={View.DEEP_ARCHITECT}>Strategy Node</option>
                 <option value={View.LIVE_UPLINK}>Live Uplink</option>
                 <option value={View.MANAGED_AGENTS_LAB}>Managed Agents</option>
             </select>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
            {renderView()}
            <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[url('https://upload.wikimedia.org/wikipedia/commons/7/76/Noise.png')] z-50"></div>
        </div>
      </main>
    </div>
  );
};

export default App;
