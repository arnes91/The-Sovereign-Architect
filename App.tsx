
import React, { useState, useEffect } from 'react';
import { View } from './types';
import Sidebar from './components/layout/Sidebar';
import { ModuleGuard } from './components/core/ModuleGuard';
import { Auth } from './components/Auth';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { AppOrchestratorProvider } from './context/AppOrchestratorContext';

// Module Imports
import Dashboard from './components/Dashboard';
import DBZScanner from './components/DBZScanner';
import ConceptStudio from './components/ConceptStudio';
import DeepArchitect from './components/DeepArchitect';
import LiveUplink from './components/LiveUplink';
import AICompanion from './components/modules/AICompanion';
import AICoreHub from './components/modules/AICoreHub';
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
  const [initStatus, setInitStatus] = useState({
    firebaseAuth: false,
    storageEngine: false,
    dashboardLayout: false
  });

  useEffect(() => {
    let isMounted = true;

    const savedGuest = localStorage.getItem('brzi_guest_session');
    if (savedGuest) {
      try {
        setSession(JSON.parse(savedGuest));
      } catch (e) {
        localStorage.removeItem('brzi_guest_session');
      }
    }

    setTimeout(() => {
      if (isMounted) {
        setInitStatus(prev => ({ ...prev, storageEngine: true }));
      }
    }, 120);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setSession(user);
        localStorage.removeItem('brzi_guest_session');
      }
      if (isMounted) {
        setInitStatus(prev => ({ ...prev, firebaseAuth: true, dashboardLayout: true }));
      }
    });

    const fallbackTimer = setTimeout(() => {
      if (isMounted) {
        setInitStatus({ firebaseAuth: true, storageEngine: true, dashboardLayout: true });
      }
    }, 1000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, []);

  const isAppReady = initStatus.firebaseAuth && initStatus.storageEngine && initStatus.dashboardLayout;

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
        return <ModuleGuard moduleName="AI Core Hub"><AICoreHub initialTab="COMPANION" demoTrigger={demoAction} /></ModuleGuard>;
      case View.DEEP_ARCHITECT: 
        return <ModuleGuard moduleName="AI Core Hub"><AICoreHub initialTab="STRATEGY" demoTrigger={demoAction} /></ModuleGuard>;
      case View.LIVE_UPLINK: 
        return <ModuleGuard moduleName="AI Core Hub"><AICoreHub initialTab="LIVE_UPLINK" /></ModuleGuard>;
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

  if (!isAppReady) {
    const progress = 
      (initStatus.firebaseAuth ? 35 : 10) + 
      (initStatus.storageEngine ? 35 : 10) + 
      (initStatus.dashboardLayout ? 30 : 10);

    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center p-6 text-white font-mono relative overflow-hidden select-none">
        <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/7/76/Noise.png')] opacity-5 pointer-events-none"></div>
        <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 p-6 rounded-xl shadow-2xl relative z-10">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyber-green animate-ping"></span>
              <span className="font-bold text-sm tracking-widest text-zinc-200">SOVEREIGN CORE V3.4</span>
            </div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">INITIALIZATION_PIPELINE</span>
          </div>

          <div className="space-y-3 my-6 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-black/60 rounded border border-zinc-900">
              <span className="text-zinc-400">1. FIREBASE AUTH & SECURITY</span>
              <span className={initStatus.firebaseAuth ? "text-cyber-green font-bold" : "text-amber-500 animate-pulse"}>
                {initStatus.firebaseAuth ? "[ONLINE]" : "[CONNECTING...]"}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-black/60 rounded border border-zinc-900">
              <span className="text-zinc-400">2. PERSISTENT STORAGE ENGINE</span>
              <span className={initStatus.storageEngine ? "text-cyber-green font-bold" : "text-amber-500 animate-pulse"}>
                {initStatus.storageEngine ? "[MOUNTED]" : "[INITIALIZING...]"}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-black/60 rounded border border-zinc-900">
              <span className="text-zinc-400">3. DASHBOARD MODULE LAYOUT</span>
              <span className={initStatus.dashboardLayout ? "text-cyber-green font-bold" : "text-amber-500 animate-pulse"}>
                {initStatus.dashboardLayout ? "[READY]" : "[BUILDING...]"}
              </span>
            </div>
          </div>

          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800">
            <div 
              className="bg-cyber-green h-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className="mt-4 text-[10px] text-zinc-600 text-center uppercase tracking-widest">
            SYNCHRONIZING NEURAL UPLINK & AGENT PIPELINES
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
      return <Auth onLogin={() => {}} onGuestLogin={handleGuestLogin} />;
  }

  return (
    <AppOrchestratorProvider>
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

        <main className="flex-1 h-full bg-zinc-950 relative flex flex-col overflow-hidden">
          {/* Mobile Header */}
          <div className="md:hidden p-4 border-b border-zinc-800 flex justify-between items-center bg-black shrink-0 z-50">
               <span className="font-bold text-white tracking-tighter">BRZI<span className="text-cyber-green">.AI</span></span>
               <select 
                  value={currentView} 
                  onChange={(e) => handleNavigate(e.target.value as View)}
                  className="bg-zinc-900 text-xs p-2 rounded border border-zinc-700 font-mono text-cyber-green font-bold uppercase tracking-widest focus:outline-none"
               >
                   <option value={View.DASHBOARD}>Executive Dashboard</option>
                   <option value={View.ADINS_PLAYGROUND}>Adin's World</option>
                   <option value={View.AI_COMPANION}>AI Core: Companion</option>
                   <option value={View.DEEP_ARCHITECT}>AI Core: Strategy Node</option>
                   <option value={View.LIVE_UPLINK}>AI Core: Live Uplink</option>
                   <option value={View.KNOWLEDGE_BASE}>Knowledge Core</option>
                   <option value={View.DBZ_SCANNER}>DBZ Scanner</option>
                   <option value={View.ANALYTICS_LAB}>Analytics Lab</option>
                   <option value={View.CONCEPT_STUDIO}>Concept Studio</option>
                   <option value={View.AI_COMPOSER}>AI Composer</option>
                   <option value={View.VISUALIZER}>Glitch Visualizer</option>
                   <option value={View.UPLOAD_DECK}>DistroKid Pipeline</option>
                   <option value={View.YOUTUBE_PIPELINE}>YouTube Pipeline</option>
                   <option value={View.MANAGED_AGENTS_LAB}>Managed Agents</option>
               </select>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
              {renderView()}
              <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[url('https://upload.wikimedia.org/wikipedia/commons/7/76/Noise.png')] z-50"></div>
          </div>
        </main>
      </div>
    </AppOrchestratorProvider>
  );
};

export default App;
