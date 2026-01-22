
/**
 * Storage Service
 * Handles Local Persistence and Simulated Vector Memory
 */

import { KnowledgeItem, DBZScanResult, GeneratedImage, AnalyticsReport } from "../types";

const KEYS = {
    KNOWLEDGE_BASE: 'brzi_knowledge_base',
    DBZ_HISTORY: 'brzi_dbz_history',
    IMAGE_HISTORY: 'brzi_image_history',
    ANALYTICS_HISTORY: 'brzi_analytics_history',
    SETTINGS: 'brzi_settings',
    LIVE_MEMORY: 'brzi_live_uplink_memory', 
    CHAT_HISTORY: 'brzi_ai_companion_chat',
    LONG_TERM_MEMORY: 'brzi_long_term_vector_sim' // NEW: Vector Sim
};

export const StorageService = {
    // --- Knowledge Base ---
    saveKnowledgeItem: (item: KnowledgeItem) => {
        const current = StorageService.getKnowledgeItems();
        const updated = [item, ...current];
        localStorage.setItem(KEYS.KNOWLEDGE_BASE, JSON.stringify(updated));
    },

    getKnowledgeItems: (): KnowledgeItem[] => {
        try {
            const data = localStorage.getItem(KEYS.KNOWLEDGE_BASE);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    },

    deleteKnowledgeItem: (id: string) => {
        const current = StorageService.getKnowledgeItems();
        const updated = current.filter(i => i.id !== id);
        localStorage.setItem(KEYS.KNOWLEDGE_BASE, JSON.stringify(updated));
    },

    // --- DBZ History ---
    saveScan: (scan: DBZScanResult) => {
        const current = StorageService.getScans();
        const updated = [scan, ...current].slice(0, 50); 
        localStorage.setItem(KEYS.DBZ_HISTORY, JSON.stringify(updated));
    },

    getScans: (): DBZScanResult[] => {
        try {
            const data = localStorage.getItem(KEYS.DBZ_HISTORY);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    },

    // --- Image History ---
    saveGeneratedImage: (item: GeneratedImage) => {
        const current = StorageService.getGeneratedImages();
        const updated = [item, ...current].slice(0, 20); 
        try {
            localStorage.setItem(KEYS.IMAGE_HISTORY, JSON.stringify(updated));
        } catch (e) {
            console.error("Storage Quota Exceeded");
            if (current.length > 5) {
                 const smaller = [item, ...current.slice(0, 5)];
                 localStorage.setItem(KEYS.IMAGE_HISTORY, JSON.stringify(smaller));
            }
        }
    },

    getGeneratedImages: (): GeneratedImage[] => {
        try {
            const data = localStorage.getItem(KEYS.IMAGE_HISTORY);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    },

    // --- Analytics ---
    saveAnalyticsReport: (report: AnalyticsReport) => {
        const current = StorageService.getAnalyticsReports();
        const updated = [report, ...current];
        localStorage.setItem(KEYS.ANALYTICS_HISTORY, JSON.stringify(updated));
    },

    getAnalyticsReports: (): AnalyticsReport[] => {
        try {
            const data = localStorage.getItem(KEYS.ANALYTICS_HISTORY);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    },
    
    deleteAnalyticsReport: (id: string) => {
        const current = StorageService.getAnalyticsReports();
        const updated = current.filter(r => r.id !== id);
        localStorage.setItem(KEYS.ANALYTICS_HISTORY, JSON.stringify(updated));
    },

    // --- LIVE UPLINK MEMORY ---
    saveLiveMemory: (summary: string) => {
        const current = StorageService.getLiveMemory();
        const updated = (current + "\n" + summary).slice(-2000);
        localStorage.setItem(KEYS.LIVE_MEMORY, updated);
    },

    getLiveMemory: (): string => {
        return localStorage.getItem(KEYS.LIVE_MEMORY) || "";
    },
    
    clearLiveMemory: () => {
        localStorage.removeItem(KEYS.LIVE_MEMORY);
    },

    // --- CHAT COMPANION & LONG TERM MEMORY ---
    saveChatHistory: (messages: any[]) => {
        localStorage.setItem(KEYS.CHAT_HISTORY, JSON.stringify(messages));
        // Trigger consolidation if history gets too long (Simulating Background Agent)
        if (messages.length > 10 && messages.length % 5 === 0) {
            StorageService.consolidateMemory(messages);
        }
    },

    getChatHistory: (): any[] => {
        try {
            const data = localStorage.getItem(KEYS.CHAT_HISTORY);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    },

    /**
     * SIMULATED VECTOR MEMORY (The "Singularity" Step)
     * Takes recent chats, extracts keywords/topics, and stores them in a separate "LTM" buffer.
     * This mimics how a Vector DB would retrieve "Relevant Context" on a new session.
     */
    consolidateMemory: (messages: any[]) => {
        try {
            // Get last few user messages
            const recentUserMsgs = messages.filter(m => m.role === 'user').slice(-3).map(m => m.content).join(" | ");
            if (!recentUserMsgs) return;

            // Simple heuristic summary (In real app, this would be an AI call)
            const summary = `[${new Date().toLocaleDateString()}] User discussed: ${recentUserMsgs.substring(0, 100)}...`;
            
            const currentLTM = StorageService.getLongTermMemory();
            const updatedLTM = [summary, ...currentLTM].slice(0, 10); // Keep last 10 'core memories'
            
            localStorage.setItem(KEYS.LONG_TERM_MEMORY, JSON.stringify(updatedLTM));
        } catch (e) {
            console.error("LTM Consolidation Failed", e);
        }
    },

    getLongTermMemory: (): string[] => {
        try {
            const data = localStorage.getItem(KEYS.LONG_TERM_MEMORY);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    },

    clearLongTermMemory: () => {
        localStorage.removeItem(KEYS.LONG_TERM_MEMORY);
        localStorage.removeItem(KEYS.CHAT_HISTORY);
    }
};
