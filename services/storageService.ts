
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
    SETTINGS: 'brzi_settings'
};

export const StorageService = {
    // --- Knowledge Base ---
    saveKnowledgeItem: (item: KnowledgeItem) => {
        const current = StorageService.getKnowledgeItems();
        const updated = [item, ...current];
        localStorage.setItem(KEYS.KNOWLEDGE_BASE, JSON.stringify(updated));
    },

    getKnowledgeItems: (): KnowledgeItem[] => {
        const data = localStorage.getItem(KEYS.KNOWLEDGE_BASE);
        return data ? JSON.parse(data) : [];
    },

    deleteKnowledgeItem: (id: string) => {
        const current = StorageService.getKnowledgeItems();
        const updated = current.filter(i => i.id !== id);
        localStorage.setItem(KEYS.KNOWLEDGE_BASE, JSON.stringify(updated));
    },

    // --- DBZ History ---
    saveScan: (scan: DBZScanResult) => {
        const current = StorageService.getScans();
        // Keep last 10 scans only to save space
        const updated = [scan, ...current].slice(0, 10);
        localStorage.setItem(KEYS.DBZ_HISTORY, JSON.stringify(updated));
    },

    getScans: (): DBZScanResult[] => {
        const data = localStorage.getItem(KEYS.DBZ_HISTORY);
        return data ? JSON.parse(data) : [];
    },

    // --- Image History ---
    saveGeneratedImage: (item: GeneratedImage) => {
        const current = StorageService.getGeneratedImages();
        // Keep last 10 images to avoid localStorage quotas (Base64 is heavy)
        const updated = [item, ...current].slice(0, 10);
        try {
            localStorage.setItem(KEYS.IMAGE_HISTORY, JSON.stringify(updated));
        } catch (e) {
            console.error("Storage Quota Exceeded. Could not save image history.");
        }
    },

    getGeneratedImages: (): GeneratedImage[] => {
        const data = localStorage.getItem(KEYS.IMAGE_HISTORY);
        return data ? JSON.parse(data) : [];
    },

    // --- Analytics History ---
    saveAnalyticsReport: (report: AnalyticsReport) => {
        const current = StorageService.getAnalyticsReports();
        const updated = [report, ...current];
        localStorage.setItem(KEYS.ANALYTICS_HISTORY, JSON.stringify(updated));
    },

    getAnalyticsReports: (): AnalyticsReport[] => {
        const data = localStorage.getItem(KEYS.ANALYTICS_HISTORY);
        return data ? JSON.parse(data) : [];
    },
    
    deleteAnalyticsReport: (id: string) => {
        const current = StorageService.getAnalyticsReports();
        const updated = current.filter(r => r.id !== id);
        localStorage.setItem(KEYS.ANALYTICS_HISTORY, JSON.stringify(updated));
    },

    // --- Settings ---
    saveSetting: (key: string, value: any) => {
        const settings = StorageService.getSettings();
        settings[key] = value;
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    },

    getSettings: () => {
        const data = localStorage.getItem(KEYS.SETTINGS);
        return data ? JSON.parse(data) : {};
    }
};
