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

interface AppOrchestratorContextType {
  activeModule: string;
  setActiveModule: (module: string) => void;
  userPersona: UserPersona;
  recentBusEvents: ContextEvent[];
  liveMemorySummary: string;
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

  const { trackEvent } = useAnalytics(activeModule);

  useEffect(() => {
    // Subscribe to Context Bus
    const unsubscribe = contextBus.subscribe((evt) => {
      setRecentBusEvents(prev => [evt, ...prev.slice(0, 49)]);
    });

    refreshGlobalMemory();

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
        publishContextEvent,
        logAnalytics,
        refreshGlobalMemory,
        saveNoteToKeep
      }}
    >
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
