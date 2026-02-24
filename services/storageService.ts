
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

export const StorageService = {
    // --- Knowledge Base ---
    saveKnowledgeItem: async (item: KnowledgeItem) => {
        if (isSupabaseConfigured()) {
            try {
                const { error } = await supabase.from('knowledge_base').insert([item]);
                if (!error) return;
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
                const { data, error } = await supabase.from('knowledge_base').select('*').order('createdAt', { ascending: false });
                if (!error && data) return data;
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
                const { error } = await supabase.from('knowledge_base').delete().eq('id', id);
                if (!error) return;
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
                const { error } = await supabase.from('dbz_history').insert([scan]);
                if (!error) return;
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
                const { data, error } = await supabase.from('dbz_history').select('*').order('timestamp', { ascending: false }).limit(50);
                if (!error && data) return data;
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
                const { error } = await supabase.from('image_history').insert([item]);
                if (!error) return;
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
                const { data, error } = await supabase.from('image_history').select('*').order('timestamp', { ascending: false }).limit(20);
                if (!error && data) return data;
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
                const { error } = await supabase.from('analytics_history').insert([report]);
                if (!error) return;
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
                const { data, error } = await supabase.from('analytics_history').select('*').order('date', { ascending: false });
                if (!error && data) return data;
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
                const { error } = await supabase.from('analytics_history').delete().eq('id', id);
                if (!error) return;
            } catch (e) { console.error("Supabase error:", e); }
        }
        // Fallback
        const current = await StorageService.getAnalyticsReports();
        const updated = current.filter(r => r.id !== id);
        localStorage.setItem(KEYS.ANALYTICS_HISTORY, JSON.stringify(updated));
    },

    // --- LIVE UPLINK MEMORY ---
    saveLiveMemory: async (summary: string) => {
        const current = await StorageService.getLiveMemory();
        const updated = (current + "\n" + summary).slice(-2000);
        
        if (isSupabaseConfigured()) {
            try {
                const { error } = await supabase.from('live_memory').upsert([{ id: 'live_memory_1', content: updated }]);
                if (!error) return;
            } catch (e) { console.error("Supabase error:", e); }
        }
        // Fallback
        localStorage.setItem(KEYS.LIVE_MEMORY, updated);
    },

    getLiveMemory: async (): Promise<string> => {
        if (isSupabaseConfigured()) {
            try {
                const { data, error } = await supabase.from('live_memory').select('content').eq('id', 'live_memory_1').single();
                if (!error && data) return data.content;
            } catch (e) { console.error("Supabase error:", e); }
        }
        // Fallback
        return localStorage.getItem(KEYS.LIVE_MEMORY) || "";
    },
    
    clearLiveMemory: async () => {
        if (isSupabaseConfigured()) {
            try {
                await supabase.from('live_memory').delete().eq('id', 'live_memory_1');
            } catch (e) { console.error("Supabase error:", e); }
        }
        localStorage.removeItem(KEYS.LIVE_MEMORY);
    },

    // --- CHAT COMPANION & LONG TERM MEMORY ---
    saveChatHistory: async (messages: any[]) => {
        if (isSupabaseConfigured()) {
            try {
                await supabase.from('chat_history').upsert([{ id: 'chat_history_1', messages }]);
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
                const { data, error } = await supabase.from('chat_history').select('messages').eq('id', 'chat_history_1').single();
                if (!error && data) return data.messages;
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
                const embedding = await generateEmbedding(summary);
                await supabase.from('long_term_memory').insert([{
                    content: summary,
                    embedding: embedding,
                    created_at: new Date().toISOString()
                }]);
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
                if (queryEmbedding) {
                    const { data } = await supabase.rpc('match_memories', {
                        query_embedding: queryEmbedding,
                        match_threshold: 0.7,
                        match_count: 5
                    });
                    if (data && data.length > 0) return data.map((d: any) => d.content);
                }
                const { data } = await supabase.from('long_term_memory').select('content').order('created_at', { ascending: false }).limit(5);
                if (data) return data.map((d: any) => d.content);
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
                await supabase.from('long_term_memory').delete().neq('id', 0);
                await supabase.from('chat_history').delete().eq('id', 'chat_history_1');
            } catch (e) { console.error("Supabase error:", e); }
        }
        localStorage.removeItem(KEYS.LONG_TERM_MEMORY);
        localStorage.removeItem(KEYS.CHAT_HISTORY);
    }
};
