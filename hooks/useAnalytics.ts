import { useEffect, useCallback } from 'react';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, addDoc, doc, setDoc, increment } from 'firebase/firestore';
import { contextBus } from '../services/contextBusService';
import { LoggerService } from '../services/loggerService';

export interface AnalyticsEvent {
  moduleId: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp: number;
}

export function useAnalytics(activeModule?: string) {
  // Automatically track module view switch
  useEffect(() => {
    if (!activeModule) return;

    const event: AnalyticsEvent = {
      moduleId: activeModule,
      action: 'MODULE_VIEW',
      label: `Navigated to ${activeModule}`,
      timestamp: Date.now()
    };

    trackEvent(event);
  }, [activeModule]);

  const trackEvent = useCallback(async (event: Omit<AnalyticsEvent, 'timestamp'>) => {
    const fullEvent: AnalyticsEvent = {
      ...event,
      timestamp: Date.now()
    };

    LoggerService.logInfo(`[Analytics] ${fullEvent.moduleId} -> ${fullEvent.action}: ${fullEvent.label || ''}`);

    // Push to Firestore
    try {
      if (isFirebaseConfigured) {
        await addDoc(collection(db, 'analytics_events'), fullEvent);

        // Increment module engagement counter
        const counterRef = doc(db, 'analytics_summary', fullEvent.moduleId);
        await setDoc(counterRef, {
          totalInteractions: increment(1),
          lastActive: Date.now()
        }, { merge: true });
      }
    } catch (e) {
      console.warn("Analytics Firestore push error:", e);
    }

    // Also push event to Context Bus
    try {
      await contextBus.publish({
        sourceModule: (fullEvent.moduleId.toUpperCase().replace(/\s+/g, '_') as any) || 'ANALYTICS_LAB',
        type: 'ANALYSIS_COMPLETED',
        title: `Analytics Event: ${fullEvent.action}`,
        payload: fullEvent
      });
    } catch (e) {
      // ignore context bus sync errors
    }
  }, []);

  return { trackEvent };
}
