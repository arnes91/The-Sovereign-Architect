import { StorageService } from './storageService';
import { LoggerService } from './loggerService';

export interface ContextEvent {
  id: string;
  sourceModule: 'KNOWLEDGE_BASE' | 'ANALYTICS_LAB' | 'LIVE_UPLINK' | 'WORKSPACE' | 'YOUTUBE_PIPELINE' | 'CONCEPT_STUDIO' | 'OTTO_BRIDGE';
  type: 'ITEM_CREATED' | 'ANALYSIS_COMPLETED' | 'TASK_DISPATCHED' | 'KEEP_SAVED' | 'DRIVE_BACKUP' | 'MEMORY_EVOLVED';
  title: string;
  payload: any;
  timestamp: number;
}

type EventCallback = (event: ContextEvent) => void;

class ContextBus {
  private subscribers: Set<EventCallback> = new Set();
  private recentEvents: ContextEvent[] = [];

  constructor() {
    this.loadInitialContext();
  }

  private async loadInitialContext() {
    try {
      const stored = await StorageService.getLiveMemory();
      if (stored) {
        LoggerService.logWorkspace('ContextBus initialized with persistent memory footprint.');
      }
    } catch (e) {
      console.warn('ContextBus init fallback:', e);
    }
  }

  public subscribe(callback: EventCallback): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  public async publish(event: Omit<ContextEvent, 'id' | 'timestamp'>) {
    const fullEvent: ContextEvent = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now()
    };

    this.recentEvents = [fullEvent, ...this.recentEvents.slice(0, 49)];

    // Notify all listeners
    this.subscribers.forEach(cb => {
      try {
        cb(fullEvent);
      } catch (err) {
        console.error('ContextBus subscriber error:', err);
      }
    });

    // Save to persistent long-term vector memory & live log
    const summaryStr = `[${fullEvent.sourceModule}] ${fullEvent.type}: ${fullEvent.title}`;
    LoggerService.logInfo(`[ContextBus] ${summaryStr}`);

    try {
      await StorageService.saveToLongTermMemory(summaryStr + '\n' + JSON.stringify(fullEvent.payload).substring(0, 500));
    } catch (e) {
      console.warn('Failed to persist event to vector memory:', e);
    }
  }

  public getRecentEvents(): ContextEvent[] {
    return [...this.recentEvents];
  }

  public async getCrossModuleSummary(): Promise<string> {
    try {
      const memories = await StorageService.getRelevantMemories();
      const kbItems = await StorageService.getKnowledgeItems();
      return `
--- CROSS-MODULE CONTEXT SUMMARY ---
Knowledge Base Items: ${kbItems.length}
Recent Context Memories:
${memories.slice(0, 5).map(m => `- ${m}`).join('\n')}
Recent Events:
${this.recentEvents.slice(0, 5).map(e => `- [${e.sourceModule}] ${e.title}`).join('\n')}
      `.trim();
    } catch (e) {
      return 'Context summary unavailable.';
    }
  }
}

export const contextBus = new ContextBus();
