import { WorkspaceService } from './workspaceService';
import { StorageService } from './storageService';
import { LoggerService } from './loggerService';
import { contextBus } from './contextBusService';
import { db, isFirebaseConfigured } from '../firebase';
import { doc, setDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';

export interface KeepNoteRecord {
  id: string;
  title: string;
  textContent: string;
  sourceModule: string;
  syncedToGoogleKeep: boolean;
  createdAt: number;
}

export class KeepSyncService {
  /**
   * Saves a note directly to Google Keep (or local/Firestore backup fallback)
   */
  static async saveNote(title: string, content: string, sourceModule = 'GENERAL'): Promise<KeepNoteRecord> {
    LoggerService.logWorkspace(`KeepSync: Request to save note "${title}" from [${sourceModule}]...`);

    let googleKeepId: string | null = null;
    let synced = false;

    try {
      const res = await WorkspaceService.createKeepNote(title, content);
      if (res && res.id) {
        googleKeepId = res.id;
        synced = true;
      }
    } catch (e: any) {
      console.warn("Google Keep API direct sync notice:", e.message || e);
    }

    const noteRecord: KeepNoteRecord = {
      id: googleKeepId || `keep-note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      textContent: content,
      sourceModule,
      syncedToGoogleKeep: synced,
      createdAt: Date.now()
    };

    // Save to Firestore if available
    try {
      if (isFirebaseConfigured) {
        await setDoc(doc(db, 'google_keep_notes', noteRecord.id), noteRecord, { merge: true });
      }
    } catch (e) {
      console.warn("Firestore keep_notes backup warning:", e);
    }

    // Mirror to local Knowledge Base as a CONTEXTUAL node
    try {
      await StorageService.saveKnowledgeItem({
        id: noteRecord.id,
        type: 'CONTEXTUAL',
        title: `[KEEP] ${title}`,
        content,
        tags: ['google-keep', sourceModule.toLowerCase()],
        createdAt: noteRecord.createdAt
      });
    } catch (e) {
      console.warn("Keep note local Knowledge Base mirror warning:", e);
    }

    // Publish event on Context Bus
    await contextBus.publish({
      sourceModule: 'WORKSPACE',
      type: 'KEEP_SAVED',
      title: `Google Keep Note: ${title}`,
      payload: noteRecord
    });

    return noteRecord;
  }

  /**
   * Retrieves all saved Google Keep notes
   */
  static async getSavedNotes(): Promise<KeepNoteRecord[]> {
    try {
      if (isFirebaseConfigured) {
        const q = query(collection(db, 'google_keep_notes'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const notes: KeepNoteRecord[] = [];
        snap.forEach(d => notes.push(d.data() as KeepNoteRecord));
        if (notes.length > 0) return notes;
      }
    } catch (e) {
      console.warn("Firestore getSavedNotes fallback:", e);
    }

    // Fallback: Query Knowledge Base items tagged with google-keep
    try {
      const kbItems = await StorageService.getKnowledgeItems();
      return kbItems
        .filter(k => k.tags?.includes('google-keep') || k.title.startsWith('[KEEP]'))
        .map(k => ({
          id: k.id,
          title: k.title.replace('[KEEP] ', ''),
          textContent: k.content,
          sourceModule: 'KNOWLEDGE_BASE',
          syncedToGoogleKeep: true,
          createdAt: k.createdAt
        }));
    } catch (e) {
      return [];
    }
  }
}
