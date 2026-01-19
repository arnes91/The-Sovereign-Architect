
/**
 * Storage Service
 * Handles local persistence for the Sovereign Architect.
 * 
 * Data is stored in localStorage to ensure privacy and sovereignty.
 */

import { KnowledgeItem, DBZScanResult, GeneratedImage, AnalyticsReport } from "../types";

const KEYS = {
    KNOWLEDGE_BASE: 'brzi_knowledge_base',
    DBZ_HISTORY: 'brzi_dbz_history',
    IMAGE_HISTORY: 'brzi_image_history',
    ANALYTICS_HISTORY: 'brzi_analytics_history',
    SETTINGS: 'brzi_settings',
    LIVE_MEMORY: 'brzi_live_uplink_memory', // New: Miku's Memory
    CHAT_HISTORY: 'brzi_ai_companion_chat'
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
        const updated = [scan, ...current].slice(0, 50); // Increased limit
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
        // Limit to 20 images to manage localstorage quota
        const updated = [item, ...current].slice(0, 20); 
        try {
            localStorage.setItem(KEYS.IMAGE_HISTORY, JSON.stringify(updated));
        } catch (e) {
            console.error("Storage Quota Exceeded. Could not save image history.");
            // Try to make space by removing oldest
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

    // --- Analytics History ---
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

    // --- LIVE UPLINK MEMORY (NEW) ---
    saveLiveMemory: (summary: string) => {
        // Append new summary to existing memory
        const current = StorageService.getLiveMemory();
        // Keep a rolling context of last ~2000 chars to avoid token limits
        const updated = (current + "\n" + summary).slice(-2000);
        localStorage.setItem(KEYS.LIVE_MEMORY, updated);
    },

    getLiveMemory: (): string => {
        return localStorage.getItem(KEYS.LIVE_MEMORY) || "";
    },
    
    clearLiveMemory: () => {
        localStorage.removeItem(KEYS.LIVE_MEMORY);
    },

    // --- CHAT COMPANION HISTORY ---
    saveChatHistory: (messages: any[]) => {
        localStorage.setItem(KEYS.CHAT_HISTORY, JSON.stringify(messages));
    },

    getChatHistory: (): any[] => {
        try {
            const data = localStorage.getItem(KEYS.CHAT_HISTORY);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    }
};
