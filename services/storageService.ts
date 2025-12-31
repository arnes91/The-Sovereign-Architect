/**
 * Storage Service
 * Handles local persistence for the Sovereign Architect.
 * 
 * Data is stored in localStorage to ensure privacy and sovereignty.
 */

import { KnowledgeItem, DBZScanResult } from "../types";

const KEYS = {
    KNOWLEDGE_BASE: 'brzi_knowledge_base',
    DBZ_HISTORY: 'brzi_dbz_history',
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

    // --- Settings (Placeholder for future API keys/preferences) ---
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
