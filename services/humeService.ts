/**
 * Hume AI Integration Service
 * Handles facial emotion recognition for the Scouter.
 * 
 * NOTE: For production, API Keys should be proxied via backend.
 * This version includes a simulation mode for instant demo use.
 */

import { DBZStats } from "../types";

const HUME_API_KEY = process.env.HUME_API_KEY || ""; // If available

export const HumeService = {
    
    /**
     * Simulates a Hume analysis if no API key is present, 
     * or if we want to save credits during dev.
     */
    simulateScan: async (): Promise<DBZStats> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    anger: Math.random() * 10,
                    determination: Math.random() * 10,
                    excitement: Math.random() * 10,
                    concentration: Math.random() * 10,
                    fear: Math.random() * 5, // Heroes have less fear
                    sadness: Math.random() * 5,
                    confusion: Math.random() * 3,
                    anxiety: Math.random() * 5,
                    calmness: Math.random() * 10,
                    pride: Math.random() * 10
                });
            }, 1500); // Fake processing delay
        });
    },

    /**
     * Calculates the "Power Level" based on emotional intensity.
     * Formula: (Anger * 5) + (Determination * 3) + (Pride * 4) - (Fear * 2)
     */
    calculatePowerLevel: (stats: DBZStats): number => {
        const base = 5000;
        const multiplier = 
            (stats.anger * 5000) + 
            (stats.determination * 3000) + 
            (stats.pride * 4000) + 
            (stats.excitement * 2000) +
            (stats.concentration * 1000);
        
        const penalty = (stats.fear * 1000) + (stats.confusion * 500);
        
        // Add random fluctuation for "Hidden Potential"
        const fluctuation = Math.random() * 10000;

        let total = base + multiplier - penalty + fluctuation;
        return Math.floor(Math.max(5, total)); // Minimum power level 5 (Farmer with shotgun)
    },

    /**
     * Determines the dominant emotion tag for the UI
     */
    getDominantEmotion: (stats: DBZStats): string => {
        const entries = Object.entries(stats);
        entries.sort((a, b) => b[1] - a[1]);
        return entries[0][0].toUpperCase();
    }
};
