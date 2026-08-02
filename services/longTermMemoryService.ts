import { db, isFirebaseConfigured } from '../firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { StorageService } from './storageService';
import { LoggerService } from './loggerService';

export interface AgentStateRecord {
  agentId: string;
  agentName: string;
  personality: string;
  status: 'IDLE' | 'ACTIVE' | 'PROCESSING' | 'EVOLVING';
  lastTask?: string;
  memoryFootprint: string[];
  updatedAt: number;
}

export interface ConversationRecord {
  id: string;
  moduleId: string; // 'AI_COMPANION' | 'LIVE_UPLINK' | 'MANAGED_AGENTS' | 'DEEP_ARCHITECT'
  sender: 'user' | 'agent' | 'system';
  text: string;
  metadata?: any;
  timestamp: number;
}

export interface StrategicOutcome {
  id: string;
  title: string;
  category: 'CONTENT' | 'BUSINESS' | 'TECH' | 'PHILOSOPHY';
  summary: string;
  keyInsights: string[];
  actionItems: string[];
  confidenceScore: number;
  timestamp: number;
}

export class LongTermMemoryService {
  /**
   * Save or update agent state in Firestore & IndexedDB
   */
  static async saveAgentState(state: AgentStateRecord): Promise<void> {
    const data = { ...state, updatedAt: Date.now() };
    LoggerService.logAgent(`Persisting state for agent ${state.agentName} (${state.agentId})...`);

    try {
      if (isFirebaseConfigured) {
        await setDoc(doc(db, 'agent_states', state.agentId), data, { merge: true });
      }
    } catch (err: any) {
      console.warn("Firestore saveAgentState fallback:", err);
    }

    // Always mirror in local storage
    try {
      await StorageService.saveToLongTermMemory(`[AGENT_STATE: ${state.agentName}] Status: ${state.status} | Last: ${state.lastTask || 'N/A'}`);
    } catch (e) {
      console.warn("Local storage mirror error:", e);
    }
  }

  /**
   * Retrieve active agent state
   */
  static async getAgentState(agentId: string): Promise<AgentStateRecord | null> {
    try {
      if (isFirebaseConfigured) {
        const snap = await getDoc(doc(db, 'agent_states', agentId));
        if (snap.exists()) {
          return snap.data() as AgentStateRecord;
        }
      }
    } catch (err) {
      console.warn("Firestore getAgentState fallback:", err);
    }
    return null;
  }

  /**
   * Record conversation turn across Live Uplink, Managed Agents, or Companion
   */
  static async saveConversationTurn(record: ConversationRecord): Promise<void> {
    try {
      if (isFirebaseConfigured) {
        await setDoc(doc(db, 'conversation_history', record.id), record);
      }
    } catch (err) {
      console.warn("Firestore saveConversationTurn fallback:", err);
    }

    // Mirror to long term vector memory
    const memoryString = `[${record.moduleId}] ${record.sender.toUpperCase()}: ${record.text.substring(0, 300)}`;
    await StorageService.saveToLongTermMemory(memoryString);
  }

  /**
   * Get recent conversation history for a specific module
   */
  static async getConversationHistory(moduleId: string, maxItems = 20): Promise<ConversationRecord[]> {
    try {
      if (isFirebaseConfigured) {
        const q = query(
          collection(db, 'conversation_history'),
          orderBy('timestamp', 'desc'),
          limit(maxItems)
        );
        const snap = await getDocs(q);
        const records: ConversationRecord[] = [];
        snap.forEach(d => {
          const data = d.data() as ConversationRecord;
          if (data.moduleId === moduleId) records.push(data);
        });
        return records.reverse();
      }
    } catch (err) {
      console.warn("Firestore getConversationHistory fallback:", err);
    }
    return [];
  }

  /**
   * Save strategic learning outcome / decision point
   */
  static async saveStrategicOutcome(outcome: StrategicOutcome): Promise<void> {
    try {
      if (isFirebaseConfigured) {
        await setDoc(doc(db, 'strategic_outcomes', outcome.id), outcome);
      }
    } catch (err) {
      console.warn("Firestore saveStrategicOutcome fallback:", err);
    }

    const summaryStr = `[STRATEGIC_OUTCOME: ${outcome.category}] ${outcome.title}\nInsights: ${outcome.keyInsights.join('; ')}`;
    await StorageService.saveToLongTermMemory(summaryStr);
    LoggerService.logAgent(`Strategic outcome persisted: "${outcome.title}"`);
  }

  /**
   * Retrieve all strategic learning outcomes
   */
  static async getStrategicOutcomes(maxItems = 10): Promise<StrategicOutcome[]> {
    try {
      if (isFirebaseConfigured) {
        const q = query(
          collection(db, 'strategic_outcomes'),
          orderBy('timestamp', 'desc'),
          limit(maxItems)
        );
        const snap = await getDocs(q);
        const outcomes: StrategicOutcome[] = [];
        snap.forEach(d => outcomes.push(d.data() as StrategicOutcome));
        return outcomes;
      }
    } catch (err) {
      console.warn("Firestore getStrategicOutcomes fallback:", err);
    }
    return [];
  }
}
