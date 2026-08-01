/**
 * Logger Service
 * Core Observability and System Logging Engine (Persistent)
 */

import { get, set } from 'idb-keyval';

export interface LogEntry {
    id: string;
    timestamp: number;
    category: 'SYSTEM' | 'AGENT' | 'WORKSPACE' | 'ERROR' | 'ANALYTICS';
    message: string;
    metadata?: any;
}

const STORAGE_KEY = 'brzi_system_logs';
let memoryLogs: LogEntry[] = [];
const subscribers = new Set<(logs: LogEntry[]) => void>();

// Load logs initially
if (typeof window !== 'undefined') {
    get(STORAGE_KEY).then((loaded) => {
        if (Array.isArray(loaded)) {
            memoryLogs = loaded;
            notify();
        } else {
            // Seed initial log
            log('SYSTEM', 'Sovereign R&D Lab Logging Core Initialized.', { environment: 'production' });
        }
    });

    // Capture global errors automatically
    window.addEventListener('error', (event) => {
        log('ERROR', `Uncaught exception: ${event.message}`, {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error?.stack || event.error?.message
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        log('ERROR', `Unhandled promise rejection: ${event.reason?.message || event.reason}`, {
            reason: event.reason?.stack || event.reason
        });
    });
}

function notify() {
    subscribers.forEach(sub => sub([...memoryLogs]));
}

export function log(
    category: LogEntry['category'], 
    message: string, 
    metadata?: any
) {
    const entry: LogEntry = {
        id: Math.random().toString(36).substring(2, 11),
        timestamp: Date.now(),
        category,
        message,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined
    };
    
    memoryLogs.push(entry);
    
    // Cap logs at 300 entries to prevent performance issues
    if (memoryLogs.length > 300) {
        memoryLogs.shift();
    }
    
    notify();
    
    // Persist asynchronously
    if (typeof window !== 'undefined') {
        set(STORAGE_KEY, memoryLogs).catch(err => console.error('Failed to save logs to storage', err));
    }
}

export const LoggerService = {
    getLogs: async (): Promise<LogEntry[]> => {
        if (memoryLogs.length === 0 && typeof window !== 'undefined') {
            const loaded = await get(STORAGE_KEY);
            if (Array.isArray(loaded)) {
                memoryLogs = loaded;
            }
        }
        return [...memoryLogs];
    },

    clearLogs: async () => {
        memoryLogs = [];
        notify();
        if (typeof window !== 'undefined') {
            await set(STORAGE_KEY, []);
        }
        log('SYSTEM', 'System log cache purged.');
    },

    subscribe: (callback: (logs: LogEntry[]) => void) => {
        subscribers.add(callback);
        // Call immediately with current logs
        callback([...memoryLogs]);
        return () => {
            subscribers.delete(callback);
        };
    },

    logSystem: (message: string, metadata?: any) => log('SYSTEM', message, metadata),
    logAgent: (message: string, metadata?: any) => log('AGENT', message, metadata),
    logWorkspace: (message: string, metadata?: any) => log('WORKSPACE', message, metadata),
    logError: (message: string, metadata?: any) => log('ERROR', message, metadata),
    logAnalytics: (message: string, metadata?: any) => log('ANALYTICS', message, metadata),
};
