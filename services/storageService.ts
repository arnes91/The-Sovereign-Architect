/**
 * Storage Service
 * Handles Local Persistence and Simulated Vector Memory
 */

import { KnowledgeItem, DBZScanResult, GeneratedImage, AnalyticsReport } from "../types";
import { auth, db } from "../firebase";
import { collection, doc, setDoc, getDocs, deleteDoc, query, where, orderBy, limit, getDoc, updateDoc } from 'firebase/firestore';
import { generateEmbedding } from "./geminiService";
import { get, set } from 'idb-keyval';

const KEYS = {
    KNOWLEDGE_BASE: 'brzi_knowledge_base',
    DBZ_HISTORY: 'brzi_dbz_history',
    IMAGE_HISTORY: 'brzi_image_history',
    ANALYTICS_HISTORY: 'brzi_analytics_history',
    SETTINGS: 'brzi_settings',
    LIVE_MEMORY: 'brzi_live_uplink_memory', 
    CHAT_HISTORY: 'brzi_ai_companion_chat',
    LONG_TERM_MEMORY: 'brzi_long_term_vector_sim'
};

const getOwnerId = () => {
    return auth.currentUser?.uid || null;
};

export const StorageService = {
    // --- Knowledge Base ---
    saveKnowledgeItem: async (item: KnowledgeItem) => {
        const owner_id = getOwnerId();
        if (owner_id) {
            try {
                const dataToSave: any = {
                    id: item.id,
                    owner_id,
                    title: item.title || "Untitled",
                    description: item.content || "No content",
                    metadata: { tags: item.tags || [] },
                    created_at: Date.now()
                };
                if (item.source) {
                    dataToSave.source_url = item.source;
                }
                
                // Sanitize undefined values
                Object.keys(dataToSave).forEach(key => {
                    if (dataToSave[key] === undefined) {
                        delete dataToSave[key];
                    }
                });

                await setDoc(doc(db, 'knowledge_base', item.id), dataToSave);
            } catch (e) { console.error("Firebase error:", e); }
        }
        // Fallback
        const current = await StorageService.getKnowledgeItems();
        const updated = [item, ...current];
        await set(KEYS.KNOWLEDGE_BASE, updated);
    },

    getKnowledgeItems: async (): Promise<KnowledgeItem[]> => {
        const owner_id = getOwnerId();
        if (owner_id) {
            try {
                const q = query(collection(db, 'knowledge_base'), where('owner_id', '==', owner_id));
                const querySnapshot = await getDocs(q);
                const items: KnowledgeItem[] = [];
                querySnapshot.forEach((doc) => {
                    const d = doc.data();
                    items.push({
                        id: d.id,
                        title: d.title,
                        content: d.description,
                        source: d.source_url,
                        tags: d.metadata?.tags || [],
                        createdAt: new Date(d.created_at).toISOString()
                    });
                });
                return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            } catch (e) { console.error("Firebase error:", e); }
        }
        // Fallback
        try {
            const data = await get(KEYS.KNOWLEDGE_BASE);
            return data || [];
        } catch (e) { return []; }
    },

    deleteKnowledgeItem: async (id: string) => {
        const owner_id = getOwnerId();
        if (owner_id) {
            try {
                await deleteDoc(doc(db, 'knowledge_base', id));
            } catch (e) { console.error("Firebase error:", e); }
        }
        // Fallback
        const current = await StorageService.getKnowledgeItems();
        const updated = current.filter(i => i.id !== id);
        await set(KEYS.KNOWLEDGE_BASE, updated);
    },

    // --- DBZ History ---
    saveScan: async (scan: DBZScanResult) => {
        const owner_id = getOwnerId();
        if (owner_id) {
            try {
                const newDocRef = doc(collection(db, 'dbz_history'));
                const payload = JSON.parse(JSON.stringify(scan)); // Remove undefined fields
                await setDoc(newDocRef, {
                    id: newDocRef.id,
                    owner_id,
                    operation: 'scan',
                    payload: payload,
                    status: 'completed',
                    created_at: Date.now()
                });
            } catch (e) { console.error("Firebase error:", e); }
        }
        // Fallback
        const current = await StorageService.getScans();
        const updated = [scan, ...current].slice(0, 50); 
        await set(KEYS.DBZ_HISTORY, updated);
    },

    getScans: async (): Promise<DBZScanResult[]> => {
        const owner_id = getOwnerId();
        if (owner_id) {
            try {
                const q = query(collection(db, 'dbz_history'), where('owner_id', '==', owner_id));
                const querySnapshot = await getDocs(q);
                const scans: any[] = [];
                querySnapshot.forEach((doc) => {
                    scans.push(doc.data());
                });
                return scans.sort((a, b) => b.created_at - a.created_at).map(s => s.payload).slice(0, 50);
            } catch (e) { console.error("Firebase error:", e); }
        }
        // Fallback
        try {
            const data = await get(KEYS.DBZ_HISTORY);
            return data || [];
        } catch (e) { return []; }
    },

    // --- Image History ---
    saveGeneratedImage: async (item: GeneratedImage) => {
        const owner_id = getOwnerId();
        if (owner_id) {
            try {
                const newDocRef = doc(collection(db, 'image_history'));
                await setDoc(newDocRef, {
                    id: newDocRef.id,
                    owner_id,
                    prompt: item.prompt,
                    model: (item as any).model || "unknown",
                    storage_path: item.url,
                    created_at: Date.now()
                });
            } catch (e) { console.error("Firebase error:", e); }
        }
        // Fallback
        const current = await StorageService.getGeneratedImages();
        const updated = [item, ...current].slice(0, 50); 
        try {
            await set(KEYS.IMAGE_HISTORY, updated);
        } catch (e) {
            console.error("Failed to save image history to idb", e);
        }
    },

    getGeneratedImages: async (): Promise<GeneratedImage[]> => {
        const owner_id = getOwnerId();
        if (owner_id) {
            try {
                const q = query(collection(db, 'image_history'), where('owner_id', '==', owner_id));
                const querySnapshot = await getDocs(q);
                const images: any[] = [];
                querySnapshot.forEach((doc) => {
                    const d = doc.data();
                    images.push({
                        id: doc.id,
                        prompt: d.prompt,
                        url: d.storage_path,
                        model: d.model,
                        timestamp: new Date(d.created_at).toISOString(),
                        created_at: d.created_at
                    });
                });
                return images.sort((a, b) => b.created_at - a.created_at).slice(0, 20);
            } catch (e) { console.error("Firebase error:", e); }
        }
        // Fallback
        try {
            const data = await get(KEYS.IMAGE_HISTORY);
            return data || [];
        } catch (e) { return []; }
    },

    // --- Analytics ---
    saveAnalyticsReport: async (report: AnalyticsReport) => {
        const owner_id = getOwnerId();
        if (owner_id) {
            try {
                const newDocRef = doc(collection(db, 'analytics_history'));
                const properties = JSON.parse(JSON.stringify(report));
                await setDoc(newDocRef, {
                    id: newDocRef.id,
                    owner_id,
                    event_name: 'report_generated',
                    properties: properties,
                    created_at: Date.now()
                });
            } catch (e) { console.error("Firebase error:", e); }
        }
        // Fallback
        const current = await StorageService.getAnalyticsReports();
        const updated = [report, ...current];
        await set(KEYS.ANALYTICS_HISTORY, updated);
    },

    getAnalyticsReports: async (): Promise<AnalyticsReport[]> => {
        const owner_id = getOwnerId();
        if (owner_id) {
            try {
                const q = query(collection(db, 'analytics_history'), where('owner_id', '==', owner_id));
                const querySnapshot = await getDocs(q);
                const reports: any[] = [];
                querySnapshot.forEach((doc) => {
                    reports.push(doc.data());
                });
                return reports.sort((a, b) => b.created_at - a.created_at).map(r => r.properties);
            } catch (e) { console.error("Firebase error:", e); }
        }
        // Fallback
        try {
            const data = await get(KEYS.ANALYTICS_HISTORY);
            return data || [];
        } catch (e) { return []; }
    },
    
    deleteAnalyticsReport: async (id: string) => {
        const owner_id = getOwnerId();
        if (owner_id) {
            try {
                const q = query(collection(db, 'analytics_history'), where('owner_id', '==', owner_id));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(async (d) => {
                    if (d.data().properties?.id === id) {
                        await deleteDoc(doc(db, 'analytics_history', d.id));
                    }
                });
            } catch (e) { console.error("Firebase error:", e); }
        }
        // Fallback
        const current = await StorageService.getAnalyticsReports();
        const updated = current.filter(r => r.id !== id);
        await set(KEYS.ANALYTICS_HISTORY, updated);
    },

    // --- RELEASES (DISTROKID PIPELINE) ---
    saveReleaseData: async (release: any) => {
        const owner_id = getOwnerId();
        if (owner_id) {
            try {
                const newDocRef = doc(collection(db, 'analytics_history'));
                const properties = JSON.parse(JSON.stringify(release));
                await setDoc(newDocRef, {
                    id: newDocRef.id,
                    owner_id,
                    event_name: 'song_release_prepared',
                    properties: properties,
                    created_at: Date.now()
                });
            } catch (e) { console.error("Firebase error:", e); }
        }
        // Fallback
        const current = await StorageService.getReleaseData();
        const updated = [release, ...current];
        await set('brzi_releases', updated);
    },

    getReleaseData: async (): Promise<any[]> => {
        const owner_id = getOwnerId();
        if (owner_id) {
            try {
                const q = query(collection(db, 'analytics_history'), where('owner_id', '==', owner_id), where('event_name', '==', 'song_release_prepared'));
                const querySnapshot = await getDocs(q);
                const releases: any[] = [];
                querySnapshot.forEach((doc) => {
                    releases.push(doc.data());
                });
                return releases.sort((a, b) => b.created_at - a.created_at).map(r => r.properties);
            } catch (e) { console.error("Firebase error:", e); }
        }
        // Fallback
        try {
            const data = await get('brzi_releases');
            return data || [];
        } catch (e) { return []; }
    },

    // --- LIVE UPLINK MEMORY ---
    saveLiveMemory: async (summary: string) => {
        const current = await StorageService.getLiveMemory();
        const updated = (current + "\n" + summary).slice(-2000);
        
        const owner_id = getOwnerId();
        if (owner_id) {
            try {
                const q = query(collection(db, 'live_memory'), where('owner_id', '==', owner_id), where('key', '==', 'live_memory_1'));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const docId = querySnapshot.docs[0].id;
                    await updateDoc(doc(db, 'live_memory', docId), { value: { content: updated } });
                } else {
                    const newDocRef = doc(collection(db, 'live_memory'));
                    await setDoc(newDocRef, { id: newDocRef.id, owner_id, key: 'live_memory_1', value: { content: updated } });
                }
            } catch (e) { console.error("Firebase error:", e); }
        }
        // Fallback
        await set(KEYS.LIVE_MEMORY, updated);
    },

    getLiveMemory: async (): Promise<string> => {
        const owner_id = getOwnerId();
        if (owner_id) {
            try {
                const q = query(collection(db, 'live_memory'), where('owner_id', '==', owner_id), where('key', '==', 'live_memory_1'));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    return querySnapshot.docs[0].data().value?.content || "";
                }
            } catch (e) { console.error("Firebase error:", e); }
        }
        // Fallback
        return localStorage.getItem(KEYS.LIVE_MEMORY) || "";
    },
    
    clearLiveMemory: async () => {
        const owner_id = getOwnerId();
        if (owner_id) {
            try {
                const q = query(collection(db, 'live_memory'), where('owner_id', '==', owner_id), where('key', '==', 'live_memory_1'));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(async (d) => {
                    await deleteDoc(doc(db, 'live_memory', d.id));
                });
            } catch (e) { console.error("Firebase error:", e); }
        }
        localStorage.removeItem(KEYS.LIVE_MEMORY);
    },

    // --- CHAT COMPANION & LONG TERM MEMORY ---
    getOrCreateChatSession: async (owner_id: string) => {
        const q = query(collection(db, 'chat_sessions'), where('owner_id', '==', owner_id));
        const querySnapshot = await getDocs(q);
        const sessions: any[] = [];
        querySnapshot.forEach((doc) => {
            sessions.push({ id: doc.id, ...doc.data() });
        });
        if (sessions.length > 0) {
            return sessions.sort((a, b) => b.created_at - a.created_at)[0].id;
        }
        
        const newDocRef = doc(collection(db, 'chat_sessions'));
        await setDoc(newDocRef, { id: newDocRef.id, owner_id, title: 'Default Session', created_at: Date.now() });
        return newDocRef.id;
    },

    saveChatHistory: async (messages: any[]) => {
        const owner_id = getOwnerId();
        if (owner_id) {
            try {
                const session_id = await StorageService.getOrCreateChatSession(owner_id);
                if (session_id) {
                    const cleanMessages = JSON.parse(JSON.stringify(messages));
                    const q = query(collection(db, 'live_memory'), where('owner_id', '==', owner_id), where('key', '==', 'chat_history_1'));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        const docId = querySnapshot.docs[0].id;
                        await updateDoc(doc(db, 'live_memory', docId), { value: { messages: cleanMessages } });
                    } else {
                        const newDocRef = doc(collection(db, 'live_memory'));
                        await setDoc(newDocRef, { id: newDocRef.id, owner_id, key: 'chat_history_1', value: { messages: cleanMessages } });
                    }

                    if (cleanMessages.length > 0) {
                        const latest = cleanMessages[cleanMessages.length - 1];
                        const msgQ = query(collection(db, 'chat_history'), where('session_id', '==', session_id), where('owner_id', '==', owner_id));
                        const msgSnapshot = await getDocs(msgQ);
                        let exists = false;
                        msgSnapshot.forEach((d) => {
                            if (d.data().metadata?.client_id === latest.id) exists = true;
                        });
                        
                        if (!exists) {
                            const newDocRef = doc(collection(db, 'chat_history'));
                            await setDoc(newDocRef, {
                                id: newDocRef.id,
                                session_id,
                                owner_id,
                                role: latest.role,
                                content: latest.content,
                                metadata: { client_id: latest.id },
                                created_at: Date.now()
                            });
                        }
                    }
                }
            } catch (e) { console.error("Firebase error:", e); }
        }
        // Fallback
        await set(KEYS.CHAT_HISTORY, messages);
    },

    getChatHistory: async (): Promise<any[]> => {
        const owner_id = getOwnerId();
        if (owner_id) {
            try {
                const q = query(collection(db, 'live_memory'), where('owner_id', '==', owner_id), where('key', '==', 'chat_history_1'));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    return querySnapshot.docs[0].data().value?.messages || [];
                }
            } catch (e) { console.error("Firebase error:", e); }
        }
        // Fallback
        try {
            const data = await get(KEYS.CHAT_HISTORY);
            return data || [];
        } catch (e) { return []; }
    },

    clearChatHistory: async () => {
        const owner_id = getOwnerId();
        if (owner_id) {
            try {
                const q = query(collection(db, 'live_memory'), where('owner_id', '==', owner_id), where('key', '==', 'chat_history_1'));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(async (d) => {
                    await deleteDoc(doc(db, 'live_memory', d.id));
                });
            } catch (e) { console.error("Firebase error:", e); }
        }
        await set(KEYS.CHAT_HISTORY, []);
    },

    saveToLongTermMemory: async (content: string) => {
        const owner_id = getOwnerId();
        if (owner_id) {
            try {
                const embedding = await generateEmbedding(content);
                const newDocRef = doc(collection(db, 'long_term_memory'));
                await setDoc(newDocRef, {
                    id: newDocRef.id,
                    owner_id,
                    content,
                    embedding,
                    created_at: Date.now()
                });
            } catch (e) { console.error("Firebase error:", e); }
        }
        
        // Fallback
        try {
            const current = await get(KEYS.LONG_TERM_MEMORY) || [];
            const embedding = await generateEmbedding(content);
            const newItem = { id: Date.now().toString(), content, embedding, timestamp: new Date().toISOString() };
            await set(KEYS.LONG_TERM_MEMORY, [...current, newItem]);
        } catch (e) { console.error("Failed to save to long term memory", e); }
    },

    queryLongTermMemory: async (queryText: string, topK: number = 3): Promise<string[]> => {
        try {
            const queryEmbedding = await generateEmbedding(queryText);
            
            const owner_id = getOwnerId();
            let memories: any[] = [];
            
            if (owner_id) {
                try {
                    const q = query(collection(db, 'long_term_memory'), where('owner_id', '==', owner_id));
                    const querySnapshot = await getDocs(q);
                    querySnapshot.forEach((doc) => {
                        memories.push(doc.data());
                    });
                } catch (e) { console.error("Firebase error:", e); }
            } else {
                memories = await get(KEYS.LONG_TERM_MEMORY) || [];
            }

            if (memories.length === 0) return [];

            // Cosine similarity
            const dotProduct = (a: number[], b: number[]) => a.reduce((sum, val, i) => sum + val * b[i], 0);
            const magnitude = (a: number[]) => Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
            const cosineSimilarity = (a: number[], b: number[]) => dotProduct(a, b) / (magnitude(a) * magnitude(b));

            const scoredMemories = memories.map((m: any) => ({
                content: m.content,
                score: cosineSimilarity(queryEmbedding, m.embedding)
            }));

            scoredMemories.sort((a, b) => b.score - a.score);
            return scoredMemories.slice(0, topK).map(m => m.content);
        } catch (e) {
            console.error("Failed to query long term memory", e);
            return [];
        }
    },

    getRelevantMemories: async (): Promise<string[]> => {
        const owner_id = getOwnerId();
        if (owner_id) {
            try {
                const q = query(collection(db, 'long_term_memory'), where('owner_id', '==', owner_id), orderBy('created_at', 'desc'), limit(10));
                const querySnapshot = await getDocs(q);
                const memories: string[] = [];
                querySnapshot.forEach((doc) => {
                    memories.push(doc.data().content);
                });
                return memories;
            } catch (e) { console.error("Firebase error:", e); }
        }
        // Fallback
        try {
            const data = await get(KEYS.LONG_TERM_MEMORY);
            return (data || []).map((m: any) => m.content).slice(-10);
        } catch (e) { return []; }
    },

    clearLongTermMemory: async () => {
        const owner_id = getOwnerId();
        if (owner_id) {
            try {
                const q = query(collection(db, 'long_term_memory'), where('owner_id', '==', owner_id));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(async (d) => {
                    await deleteDoc(doc(db, 'long_term_memory', d.id));
                });
            } catch (e) { console.error("Firebase error:", e); }
        }
        await set(KEYS.LONG_TERM_MEMORY, []);
    }
};
