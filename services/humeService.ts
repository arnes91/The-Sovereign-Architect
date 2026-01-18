
/**
 * Hume AI Integration Service (Module A & B)
 * Handles biometric ingestion and the V7 Power Core Logic.
 */

import { DBZStats } from "../types";
import { PERSONALITIES } from "../config/personalities";

export const HumeService = {
    
    /**
     * Module A: Biometric Ingestion (Simulated)
     */
    simulateScan: async (): Promise<DBZStats> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Generate more varied, spiky data to create interesting results
                const rand = (min: number, max: number) => Math.random() * (max - min) + min;
                
                resolve({
                    anger: rand(0, 10),
                    determination: rand(0, 10),
                    excitement: rand(0, 10),
                    concentration: rand(0, 10),
                    fear: rand(0, 5), // Fear usually lower for warriors
                    sadness: rand(0, 4),
                    confusion: rand(0, 3),
                    anxiety: rand(0, 4),
                    calmness: rand(0, 10),
                    pride: rand(0, 10),
                    joy: rand(0, 10)
                });
            }, 1800);
        });
    },

    /**
     * Module B: The Power Core (Logic Engine V8 - Ultimate)
     * Uses non-linear scaling and conditional multipliers.
     */
    calculatePowerLevel: (stats: DBZStats): { power: number, battleClass: string, multiplier: number } => {
        // 1. Base Core Stats
        const rage = stats.anger;
        const focus = stats.concentration + stats.determination; // Max 20
        const spirit = stats.excitement + stats.joy + stats.pride; // Max 30
        const control = stats.calmness;
        
        // 2. Base Calculation (Non-linear)
        // Spirit is the raw fuel. Focus directs it. Rage explodes it.
        let rawPower = 1000; 

        // Exponential Spirit Base
        rawPower += Math.pow(spirit, 3.5); 
        
        // Focus Multiplier (Technique)
        rawPower *= (1 + (focus / 15));

        // 3. Archetype Multipliers
        let multiplier = 1.0;
        let battleClass = "Human Martial Artist";

        // ZENKAI BOOST: If high Anger AND high Determination (fighting through pain)
        if (rage > 7 && stats.determination > 8) {
            multiplier += 1.5; // Massive boost
            battleClass = "Saiyan Warrior";
        }

        // ULTRA INSTINCT: Extreme Calm + Extreme Concentration + Low Fear
        if (control > 8 && stats.concentration > 8 && stats.fear < 2) {
            multiplier += 3.0; // Godly boost
            battleClass = "Angel Attendant";
        }

        // LEGENDARY: High Rage + High Pride + Low Control
        if (rage > 8 && stats.pride > 8 && control < 4) {
            multiplier += 2.5;
            battleClass = "Legendary Super Saiyan";
        }

        // MAJIN: High Joy + High Confusion (Chaotic)
        if (stats.joy > 8 && stats.confusion > 5) {
            multiplier += 1.2;
            battleClass = "Majin Construct";
        }

        // DESTRUCTION: High Anger + High Pride + High Calm (Cold fury)
        if (rage > 6 && stats.pride > 7 && control > 7) {
            multiplier += 4.0;
            battleClass = "God of Destruction";
        }

        // 4. Random Fluctuation (Hidden Potential)
        const hiddenPotential = Math.random() * 0.4 + 0.8; // 0.8x to 1.2x variance
        rawPower *= hiddenPotential;

        // 5. Final Calculation
        const finalPower = Math.floor(rawPower * multiplier);
        
        // Clamp min/max for game balance
        const clampedPower = Math.max(5, Math.min(finalPower, 900000000));

        return {
            power: clampedPower,
            battleClass,
            multiplier: parseFloat(multiplier.toFixed(2))
        };
    },

    /**
     * Selects the most appropriate persona based on Power Level AND Emotion stats.
     */
    determinePersona: (power: number, stats: DBZStats): { name: string, voice: string, id: string } => {
        const tiers = PERSONALITIES.DBZ_SCANNER.tiers;
        
        // 1. GOD TIER (> 10M)
        if (power > 10000000) {
            if (stats.calmness > stats.anger) return tiers.WHIS;
            if (stats.anger > stats.calmness) return tiers.BEERUS;
            return tiers.WHIS; // Default God
        }

        // 2. ELITE TIER (> 1M)
        if (power > 1000000) {
            if (stats.pride > 7) return tiers.VEGETA;
            if (stats.determination > 7) return tiers.GOKU;
            if (stats.calmness > 7) return tiers.CELL; // Perfectionist
            if (stats.joy > 7) return tiers.BUU; // Chaotic
            return tiers.FRIEZA; // Default Elite
        }

        // 3. WARRIOR TIER (> 100k)
        if (power > 100000) {
            if (stats.anger > 7) return tiers.BROLY;
            return tiers.FRIEZA; // Frieza likes to mock mid-tiers
        }

        // 4. TRASH TIER
        return tiers.HERCULE;
    }
};
