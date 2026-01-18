
// The Soul of the Machine
// Define configuration for Personas (IDs, Names, Voices).
// Actual Prompt Text is now in config/promptTemplates.ts

export const PERSONALITIES = {
  SOVEREIGN_ARCHITECT: {
    id: "system_core",
    name: "The Sovereign Architect",
    role: "Strategic Ecosystem Advisor",
  },
  
  AI_COMPANION: {
    id: "ai_companion",
    name: "Brzi Companion",
    role: "Universal Strategic Partner",
    voice: "Zephyr",
    styles: {
      DEFAULT: { id: 'default', name: 'Standard Protocol' },
      CREATIVE: { id: 'creative', name: 'Muse Mode' },
      TECHNICAL: { id: 'technical', name: 'System Architect' },
      STRATEGIC: { id: 'strategic', name: 'Empire Builder' }
    }
  },

  // DBZ SCANNER PERSONAS (Spec V1.0)
  DBZ_SCANNER: {
    id: "power_scanner",
    tiers: {
      LOW: {
        id: "TYRANT",
        name: "Galactic Tyrant", // Frieza Archetype
        threshold: 500000,
        voice: "Puck" // High-pitched, mocking (Closest to Leda)
      },
      MID: {
        id: "PRINCE",
        name: "Prideful Prince", // Vegeta Archetype
        threshold: 1000000,
        voice: "Charon" // Deep, assertive (Closest to Rasalgethi)
      },
      HIGH: {
        id: "ANGEL",
        name: "Divine Attendant", // Whis Archetype
        threshold: 5000000,
        voice: "Fenrir" // Soft, male
      }
    }
  },

  ARZI_ASSISTANT: {
    id: "arzi_music",
    name: "Arzi Assistant",
    role: "Music Industry Strategist",
  }
};
