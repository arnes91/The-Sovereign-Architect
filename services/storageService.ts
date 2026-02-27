
/**
 * Storage Service
 * Handles Local Persistence and Simulated Vector Memory
 */

import { KnowledgeItem, DBZScanResult, GeneratedImage, AnalyticsReport } from "../types";
import { supabase } from "./supabaseClient";
import { generateEmbedding } from "./geminiService";

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

const isSupabaseConfigured = () => {
    return import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co';
};

const getOwnerId = async () => {
    if (!isSupabaseConfigured()) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
};

export const StorageService = {
    // --- Knowledge Base ---
    saveKnowledgeItem: async (item: KnowledgeItem) => {
        if (isSupabaseConfigured()) {
            try {
                const owner_id = await getOwnerId();
                if (owner_id) {
                    const { error } = await supabase.from('knowledge_base').insert([{
                        id: item.id,
                        owner_id,
                        title: item.title,
                        description: item.content,
                        source_url: item.source,
                        metadata: { tags: item.tags },
                        created_at: item.createdAt
                    }]);
                    if (!error) return;
                }
            } catch (e) { console.error("Supabase error:", e); }
        }
        // Fallback
        const current = await StorageService.getKnowledgeItems();
        const updated = [item, ...current];
        localStorage.setItem(KEYS.KNOWLEDGE_BASE, JSON.stringify(updated));
    },

    getKnowledgeItems: async (): Promise<KnowledgeItem[]> => {
        if (isSupabaseConfigured()) {
            try {
                const owner_id = await getOwnerId();
                if (owner_id) {
                    const { data, error } = await supabase.from('knowledge_base').select('*').eq('owner_id', owner_id).order('created_at', { ascending: false });
                    if (!error && data) {
                        return data.map(d => ({
                            id: d.id,
                            title: d.title,
                            content: d.description,
                            source: d.source_url,
                            tags: d.metadata?.tags || [],
                            createdAt: d.created_at
                        }));
                    }
                }
            } catch (e) { console.error("Supabase error:", e); }
        }
        // Fallback
        try {
            const data = localStorage.getItem(KEYS.KNOWLEDGE_BASE);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    },

    deleteKnowledgeItem: async (id: string) => {
        if (isSupabaseConfigured()) {
            try {
                const owner_id = await getOwnerId();
                if (owner_id) {
                    const { error } = await supabase.from('knowledge_base').delete().eq('id', id).eq('owner_id', owner_id);
                    if (!error) return;
                }
            } catch (e) { console.error("Supabase error:", e); }
        }
        // Fallback
        const current = await StorageService.getKnowledgeItems();
        const updated = current.filter(i => i.id !== id);
        localStorage.setItem(KEYS.KNOWLEDGE_BASE, JSON.stringify(updated));
    },

    // --- DBZ History ---
    saveScan: async (scan: DBZScanResult) => {
        if (isSupabaseConfigured()) {
            try {
                const owner_id = await getOwnerId();
                if (owner_id) {
                    const { error } = await supabase.from('dbz_history').insert([{
                        owner_id,
                        operation: 'scan',
                        payload: scan,
                        status: 'completed',
                        created_at: scan.timestamp
                    }]);
                    if (!error) return;
                }
            } catch (e) { console.error("Supabase error:", e); }
        }
        // Fallback
        const current = await StorageService.getScans();
        const updated = [scan, ...current].slice(0, 50); 
        localStorage.setItem(KEYS.DBZ_HISTORY, JSON.stringify(updated));
    },

    getScans: async (): Promise<DBZScanResult[]> => {
        if (isSupabaseConfigured()) {
            try {
                const owner_id = await getOwnerId();
                if (owner_id) {
                    const { data, error } = await supabase.from('dbz_history').select('*').eq('owner_id', owner_id).order('created_at', { ascending: false }).limit(50);
                    if (!error && data) {
                        return data.map(d => d.payload as DBZScanResult);
                    }
                }
            } catch (e) { console.error("Supabase error:", e); }
        }
        // Fallback
        try {
            const data = localStorage.getItem(KEYS.DBZ_HISTORY);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    },

    // --- Image History ---
    saveGeneratedImage: async (item: GeneratedImage) => {
        if (isSupabaseConfigured()) {
            try {
                const owner_id = await getOwnerId();
                if (owner_id) {
                    if (item.url.startsWith('data:image')) {
                        const res = await fetch(item.url);
                        const blob = await res.blob();
                        const fileName = `image_${item.id}.jpg`;
                        const { data: uploadData, error: uploadError } = await supabase.storage.from('images').upload(fileName, blob);
                        
                        if (!uploadError && uploadData) {
                            const { data: publicUrlData } = supabase.storage.from('images').getPublicUrl(fileName);
                            item.url = publicUrlData.publicUrl;
                        }
                    }
                    const { error } = await supabase.from('image_history').insert([{
                        owner_id,
                        prompt: item.prompt,
                        model: item.model,
                        storage_path: item.url,
                        created_at: item.timestamp
                    }]);
                    if (!error) return;
                }
            } catch (e) { console.error("Supabase error:", e); }
        }
        // Fallback
        const current = await StorageService.getGeneratedImages();
        const updated = [item, ...current].slice(0, 20); 
        try {
            localStorage.setItem(KEYS.IMAGE_HISTORY, JSON.stringify(updated));
        } catch (e) {
            if (current.length > 5) {
                 const smaller = [item, ...current.slice(0, 5)];
                 localStorage.setItem(KEYS.IMAGE_HISTORY, JSON.stringify(smaller));
            }
        }
    },

    getGeneratedImages: async (): Promise<GeneratedImage[]> => {
        if (isSupabaseConfigured()) {
            try {
                const owner_id = await getOwnerId();
                if (owner_id) {
                    const { data, error } = await supabase.from('image_history').select('*').eq('owner_id', owner_id).order('created_at', { ascending: false }).limit(20);
                    if (!error && data) {
                        return data.map(d => ({
                            id: d.id,
                            prompt: d.prompt,
                            url: d.storage_path,
                            model: d.model,
                            timestamp: d.created_at
                        }));
                    }
                }
            } catch (e) { console.error("Supabase error:", e); }
        }
        // Fallback
        try {
            const data = localStorage.getItem(KEYS.IMAGE_HISTORY);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    },

    // --- Analytics ---
    saveAnalyticsReport: async (report: AnalyticsReport) => {
        if (isSupabaseConfigured()) {
            try {
                const owner_id = await getOwnerId();
                if (owner_id) {
                    const { error } = await supabase.from('analytics_history').insert([{
                        owner_id,
                        event_name: 'report_generated',
                        properties: report,
                        created_at: report.date
                    }]);
                    if (!error) return;
                }
            } catch (e) { console.error("Supabase error:", e); }
        }
        // Fallback
        const current = await StorageService.getAnalyticsReports();
        const updated = [report, ...current];
        localStorage.setItem(KEYS.ANALYTICS_HISTORY, JSON.stringify(updated));
    },

    getAnalyticsReports: async (): Promise<AnalyticsReport[]> => {
        if (isSupabaseConfigured()) {
            try {
                const owner_id = await getOwnerId();
                if (owner_id) {
                    const { data, error } = await supabase.from('analytics_history').select('*').eq('owner_id', owner_id).order('created_at', { ascending: false });
                    if (!error && data) {
                        return data.map(d => d.properties as AnalyticsReport);
                    }
                }
            } catch (e) { console.error("Supabase error:", e); }
        }
        // Fallback
        try {
            const data = localStorage.getItem(KEYS.ANALYTICS_HISTORY);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    },
    
    deleteAnalyticsReport: async (id: string) => {
        if (isSupabaseConfigured()) {
            try {
                const owner_id = await getOwnerId();
                if (owner_id) {
                    // Since we stored the report in properties, we need to match properties->>id
                    const { error } = await supabase.from('analytics_history').delete().eq('owner_id', owner_id).eq('properties->>id', id);
                    if (!error) return;
                }
            } catch (e) { console.error("Supabase error:", e); }
        }
        // Fallback
        const current = await StorageService.getAnalyticsReports();
        const updated = current.filter(r => r.id !== id);
        localStorage.setItem(KEYS.ANALYTICS_HISTORY, JSON.stringify(updated));
    },

    // --- RELEASES (DISTROKID PIPELINE) ---
    saveReleaseData: async (release: any) => {
        if (isSupabaseConfigured()) {
            try {
                const owner_id = await getOwnerId();
                if (owner_id) {
                    const { error } = await supabase.from('analytics_history').insert([{
                        owner_id,
                        event_name: 'song_release_prepared',
                        properties: release,
                        created_at: new Date().toISOString()
                    }]);
                    if (!error) return;
                }
            } catch (e) { console.error("Supabase error:", e); }
        }
        // Fallback
        const current = await StorageService.getReleaseData();
        const updated = [release, ...current];
        localStorage.setItem('brzi_releases', JSON.stringify(updated));
    },

    getReleaseData: async (): Promise<any[]> => {
        if (isSupabaseConfigured()) {
            try {
                const owner_id = await getOwnerId();
                if (owner_id) {
                    const { data, error } = await supabase.from('analytics_history').select('*').eq('owner_id', owner_id).eq('event_name', 'song_release_prepared').order('created_at', { ascending: false });
                    if (!error && data) {
                        return data.map(d => d.properties);
                    }
                }
            } catch (e) { console.error("Supabase error:", e); }
        }
        // Fallback
        try {
            const data = localStorage.getItem('brzi_releases');
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    },

    // --- LIVE UPLINK MEMORY ---
    saveLiveMemory: async (summary: string) => {
        const current = await StorageService.getLiveMemory();
        const updated = (current + "\n" + summary).slice(-2000);
        
        if (isSupabaseConfigured()) {
            try {
                const owner_id = await getOwnerId();
                if (owner_id) {
                    const { data: existing } = await supabase.from('live_memory').select('id').eq('owner_id', owner_id).eq('key', 'live_memory_1').single();
                    if (existing) {
                        await supabase.from('live_memory').update({ value: { content: updated } }).eq('id', existing.id);
                    } else {
                        await supabase.from('live_memory').insert([{ owner_id, key: 'live_memory_1', value: { content: updated } }]);
                    }
                    return;
                }
            } catch (e) { console.error("Supabase error:", e); }
        }
        // Fallback
        localStorage.setItem(KEYS.LIVE_MEMORY, updated);
    },

    getLiveMemory: async (): Promise<string> => {
        if (isSupabaseConfigured()) {
            try {
                const owner_id = await getOwnerId();
                if (owner_id) {
                    const { data, error } = await supabase.from('live_memory').select('value').eq('owner_id', owner_id).eq('key', 'live_memory_1').single();
                    if (!error && data && data.value) return (data.value as any).content || "";
                }
            } catch (e) { console.error("Supabase error:", e); }
        }
        // Fallback
        return localStorage.getItem(KEYS.LIVE_MEMORY) || "";
    },
    
    clearLiveMemory: async () => {
        if (isSupabaseConfigured()) {
            try {
                const owner_id = await getOwnerId();
                if (owner_id) {
                    await supabase.from('live_memory').delete().eq('owner_id', owner_id).eq('key', 'live_memory_1');
                }
            } catch (e) { console.error("Supabase error:", e); }
        }
        localStorage.removeItem(KEYS.LIVE_MEMORY);
    },

    // --- CHAT COMPANION & LONG TERM MEMORY ---
    getOrCreateChatSession: async (owner_id: string) => {
        const { data } = await supabase.from('chat_sessions').select('id').eq('owner_id', owner_id).order('created_at', { ascending: false }).limit(1).single();
        if (data) return data.id;
        const { data: newSession } = await supabase.from('chat_sessions').insert([{ owner_id, title: 'Default Session' }]).select('id').single();
        return newSession?.id;
    },

    saveChatHistory: async (messages: any[]) => {
        if (isSupabaseConfigured()) {
            try {
                const owner_id = await getOwnerId();
                if (owner_id) {
                    const session_id = await StorageService.getOrCreateChatSession(owner_id);
                    if (session_id) {
                        // For simplicity, we store the full array in a single live_memory key 
                        // AND we append the latest message to chat_history for the DB schema
                        const { data: existing } = await supabase.from('live_memory').select('id').eq('owner_id', owner_id).eq('key', 'chat_history_1').single();
                        if (existing) {
                            await supabase.from('live_memory').update({ value: { messages } }).eq('id', existing.id);
                        } else {
                            await supabase.from('live_memory').insert([{ owner_id, key: 'chat_history_1', value: { messages } }]);
                        }

                        // Also insert the latest message into chat_history if it's new
                        if (messages.length > 0) {
                            const latest = messages[messages.length - 1];
                            // Check if it exists by checking metadata
                            const { data: existingMsg } = await supabase.from('chat_history').select('id').eq('session_id', session_id).eq('metadata->>client_id', latest.id).single();
                            if (!existingMsg) {
                                await supabase.from('chat_history').insert([{
                                    session_id,
                                    owner_id,
                                    role: latest.role,
                                    content: latest.content,
                                    metadata: { client_id: latest.id },
                                    created_at: new Date().toISOString()
                                }]);
                            }
                        }
                    }
                }
            } catch (e) { console.error("Supabase error:", e); }
        }
        // Fallback
        localStorage.setItem(KEYS.CHAT_HISTORY, JSON.stringify(messages));
        
        // Trigger consolidation if history gets too long
        if (messages.length > 10 && messages.length % 5 === 0) {
            await StorageService.consolidateMemory(messages);
        }
    },

    getChatHistory: async (): Promise<any[]> => {
        if (isSupabaseConfigured()) {
            try {
                const owner_id = await getOwnerId();
                if (owner_id) {
                    const { data, error } = await supabase.from('live_memory').select('value').eq('owner_id', owner_id).eq('key', 'chat_history_1').single();
                    if (!error && data && data.value) return (data.value as any).messages || [];
                }
            } catch (e) { console.error("Supabase error:", e); }
        }
        // Fallback
        try {
            const data = localStorage.getItem(KEYS.CHAT_HISTORY);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    },

    consolidateMemory: async (messages: any[]) => {
        try {
            const recentUserMsgs = messages.filter(m => m.role === 'user').slice(-3).map(m => m.content).join(" | ");
            if (!recentUserMsgs) return;

            const summary = `[${new Date().toLocaleDateString()}] User discussed: ${recentUserMsgs.substring(0, 100)}...`;
            
            if (isSupabaseConfigured()) {
                const owner_id = await getOwnerId();
                if (owner_id) {
                    const embedding = await generateEmbedding(summary);
                    await supabase.from('long_term_memory').insert([{
                        owner_id,
                        content: summary,
                        embedding: embedding,
                        created_at: new Date().toISOString()
                    }]);
                }
            }
            
            // Fallback
            const currentLTM = await StorageService.getRelevantMemories();
            const updatedLTM = [summary, ...currentLTM].slice(0, 10);
            localStorage.setItem(KEYS.LONG_TERM_MEMORY, JSON.stringify(updatedLTM));
        } catch (e) {
            console.error("LTM Consolidation Failed", e);
        }
    },

    getRelevantMemories: async (queryEmbedding?: number[]): Promise<string[]> => {
        if (isSupabaseConfigured()) {
            try {
                const owner_id = await getOwnerId();
                if (owner_id) {
                    if (queryEmbedding) {
                        try {
                            const { data, error } = await supabase.rpc('match_memories', {
                                query_embedding: queryEmbedding,
                                match_threshold: 0.7,
                                match_count: 5
                            });
                            if (!error && data && data.length > 0) return data.map((d: any) => d.content);
                        } catch (rpcError) {
                            console.log("RPC match_memories failed or not found, falling back to latest memories");
                        }
                    }
                    const { data } = await supabase.from('long_term_memory').select('content').eq('owner_id', owner_id).order('created_at', { ascending: false }).limit(5);
                    if (data) return data.map((d: any) => d.content);
                }
            } catch (e) { console.error("Supabase error:", e); }
        }
        // Fallback
        try {
            const data = localStorage.getItem(KEYS.LONG_TERM_MEMORY);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    },

    clearLongTermMemory: async () => {
        if (isSupabaseConfigured()) {
            try {
                const owner_id = await getOwnerId();
                if (owner_id) {
                    await supabase.from('long_term_memory').delete().eq('owner_id', owner_id);
                    await supabase.from('live_memory').delete().eq('owner_id', owner_id).eq('key', 'chat_history_1');
                    await supabase.from('chat_history').delete().eq('owner_id', owner_id);
                }
            } catch (e) { console.error("Supabase error:", e); }
        }
        localStorage.removeItem(KEYS.LONG_TERM_MEMORY);
        localStorage.removeItem(KEYS.CHAT_HISTORY);
    }
};
