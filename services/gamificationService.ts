/**
 * Gamification Service
 * Handles User Profile, Energy (Scans), and XP.
 */

import { UserProfile } from "../types";
import { StorageService } from "./storageService";

const STORAGE_KEY = 'brzi_user_profile';

const DEFAULT_PROFILE: UserProfile = {
    id: 'user_' + Date.now(),
    username: 'Rookie Warrior',
    level: 1,
    xp: 0,
    energy: 5, // Free daily scans
    maxEnergy: 5,
    isPremium: false,
    unlockedPersonas: ['TYRANT'], // Start with Low Tier only
    joinedAt: Date.now()
};

export const GamificationService = {
    
    getProfile: (): UserProfile => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PROFILE));
            return DEFAULT_PROFILE;
        }
        return JSON.parse(stored);
    },

    saveProfile: (profile: UserProfile) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    },

    consumeEnergy: (): boolean => {
        const profile = GamificationService.getProfile();
        if (profile.energy > 0) {
            profile.energy -= 1;
            GamificationService.saveProfile(profile);
            return true;
        }
        return false;
    },

    addXp: (amount: number) => {
        const profile = GamificationService.getProfile();
        profile.xp += amount;
        
        // Level Up Logic (Simple: Level * 1000 XP needed)
        const xpNeeded = profile.level * 1000;
        if (profile.xp >= xpNeeded) {
            profile.level += 1;
            profile.xp = profile.xp - xpNeeded;
            profile.energy = profile.maxEnergy; // Refill on level up
            // Unlock personas based on level
            if (profile.level >= 5 && !profile.unlockedPersonas.includes('PRINCE')) {
                profile.unlockedPersonas.push('PRINCE');
            }
            if (profile.level >= 10 && !profile.unlockedPersonas.includes('ANGEL')) {
                profile.unlockedPersonas.push('ANGEL');
            }
        }
        GamificationService.saveProfile(profile);
        return profile;
    },

    // Mock Ad Watch
    watchAdForEnergy: async (): Promise<number> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const profile = GamificationService.getProfile();
                profile.energy = Math.min(profile.energy + 3, profile.maxEnergy + 5); // Can overflow slightly
                GamificationService.saveProfile(profile);
                resolve(profile.energy);
            }, 3000); // 3 second "ad"
        });
    },

    // Mock Premium Subscription
    upgradeToPremium: async (): Promise<boolean> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const profile = GamificationService.getProfile();
                profile.isPremium = true;
                profile.maxEnergy = 9999;
                profile.energy = 9999;
                profile.unlockedPersonas = ['TYRANT', 'PRINCE', 'ANGEL'];
                GamificationService.saveProfile(profile);
                resolve(true);
            }, 1000);
        });
    }
};
