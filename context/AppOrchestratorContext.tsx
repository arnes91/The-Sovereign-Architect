import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { contextBus, ContextEvent } from '../services/contextBusService';
import { StorageService } from '../services/storageService';
import { KeepSyncService } from '../services/keepSyncService';
import { useAnalytics } from '../hooks/useAnalytics';

interface UserPersona {
  name: string;
  alias: string;
  role: string;
  systemTag: string;
  bio: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'ACTION_REQUIRED';
  actionText?: string;
  actionPayload?: any;
  timestamp: number;
}

interface AppOrchestratorContextType {
  activeModule: string;
  setActiveModule: (module: string) => void;
  userPersona: UserPersona;
  recentBusEvents: ContextEvent[];
  liveMemorySummary: string;
  notifications: SystemNotification[];
  pushNotification: (notification: Omit<SystemNotification, 'id' | 'timestamp'>) => void;
  dismissNotification: (id: string) => void;
  publishContextEvent: (event: Omit<ContextEvent, 'id' | 'timestamp'>) => Promise<void>;
  logAnalytics: (action: string, label?: string, metadata?: any) => void;
  refreshGlobalMemory: () => Promise<void>;
  saveNoteToKeep: (title: string, content: string) => Promise<any>;
}

const DEFAULT_PERSONA: UserPersona = {
  name: 'Arnes Osmic',
  alias: 'BRZI ARZI / Glitch Sovereign',
  role: '34yo Balkan Tech-Necromancer, Reality Hacker & Creative Warlord',
  systemTag: 'BRZI_STUDIO spine | Adin (7yo son)',
  bio: 'Single father, AI systems architect, sonic explorer. Multilingual fusion (Bosnian, English tech-jargon). Sound: Glitchcore, liquid DnB, cyberpunk trap, minimal electronic techno.'
};

const AppOrchestratorContext = createContext<AppOrchestratorContextType | undefined>(undefined);

export const AppOrchestratorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeModule, setActiveModuleState] = useState<string>('DASHBOARD');
  const [userPersona] = useState<UserPersona>(DEFAULT_PERSONA);
  const [recentBusEvents, setRecentBusEvents] = useState<ContextEvent[]>([]);
  const [liveMemorySummary, setLiveMemorySummary] = useState<string>('');
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  
  const { trackEvent } = useAnalytics(activeModule);

  useEffect(() => {
    // Subscribe to Context Bus
    const unsubscribe = contextBus.subscribe((evt) => {
      setRecentBusEvents(prev => [evt, ...prev.slice(0, 49)]);
    });

    refreshGlobalMemory();
    
    // Demo mock: Automatically push a 'Ready for Final Push' notification for demo purposes
    setTimeout(() => {
      pushNotification({
        title: 'READY FOR FINAL PUSH',
        message: 'Track "Glitch Sevdah" has all required assets.',
        type: 'ACTION_REQUIRED',
        actionText: 'REVIEW CHECKLIST',
        actionPayload: { trackName: 'Glitch Sevdah' }
      });
    }, 5000);

    return () => unsubscribe();
  }, []);

  const refreshGlobalMemory = async () => {
    try {
      const summary = await contextBus.getCrossModuleSummary();
      setLiveMemorySummary(summary);
    } catch (e) {
      console.warn('AppOrchestrator memory refresh error:', e);
    }
  };

  const setActiveModule = (module: string) => {
    setActiveModuleState(module);
    trackEvent({
      moduleId: module,
      action: 'MODULE_CHANGE',
      label: `Switched module to ${module}`
    });
  };

  const pushNotification = (notification: Omit<SystemNotification, 'id' | 'timestamp'>) => {
    const newNotification: SystemNotification = {
      ...notification,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now()
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const publishContextEvent = async (event: Omit<ContextEvent, 'id' | 'timestamp'>) => {
    await contextBus.publish(event);
    await refreshGlobalMemory();
  };

  const logAnalytics = (action: string, label?: string, metadata?: any) => {
    trackEvent({
      moduleId: activeModule,
      action,
      label,
      metadata
    });
  };

  const saveNoteToKeep = async (title: string, content: string) => {
    return await KeepSyncService.saveNote(title, content, activeModule);
  };

  return (
    <AppOrchestratorContext.Provider
      value={{
        activeModule,
        setActiveModule,
        userPersona,
        recentBusEvents,
        liveMemorySummary,
        notifications,
        pushNotification,
        dismissNotification,
        publishContextEvent,
        logAnalytics,
        refreshGlobalMemory,
        saveNoteToKeep
      }}
    >
      {/* Global Notifications Overlay */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {notifications.map(notif => (
          <div key={notif.id} className={`pointer-events-auto w-80 bg-zinc-950 border rounded-lg shadow-2xl overflow-hidden flex flex-col transition-all transform animate-in fade-in slide-in-from-right-8 ${notif.type === 'ACTION_REQUIRED' ? 'border-amber-500/50' : 'border-zinc-800'}`}>
            <div className={`h-1 w-full ${notif.type === 'ACTION_REQUIRED' ? 'bg-amber-500 animate-pulse' : notif.type === 'SUCCESS' ? 'bg-cyber-green' : notif.type === 'ERROR' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
            <div className="p-4 flex gap-3">
              <div className="flex-1">
                <h4 className="text-xs font-bold font-mono text-white mb-1 uppercase tracking-wider">{notif.title}</h4>
                <p className="text-sm text-zinc-400">{notif.message}</p>
                {notif.actionText && (
                  <button 
                    onClick={() => {
                      dismissNotification(notif.id);
                      if (notif.actionPayload) {
                        // Normally handle routing or showing a modal here.
                        console.log("Action triggered", notif.actionPayload);
                      }
                    }}
                    className="mt-3 text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded hover:bg-amber-500 hover:text-black transition-colors"
                  >
                    {notif.actionText}
                  </button>
                )}
              </div>
              <button onClick={() => dismissNotification(notif.id)} className="text-zinc-600 hover:text-white transition-colors h-fit p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
      {children}
    </AppOrchestratorContext.Provider>
  );
};

export const useAppOrchestrator = () => {
  const context = useContext(AppOrchestratorContext);
  if (!context) {
    throw new Error('useAppOrchestrator must be used within an AppOrchestratorProvider');
  }
  return context;
};
