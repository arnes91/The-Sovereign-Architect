
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
      STRATEGIC: { id: 'strategic', name: 'Empire Builder' },
      ARZI: { id: 'arzi', name: 'Arzi Assistant' }
    }
  },

  // DBZ SCANNER PERSONAS (Spec V2.0 - Extended Roster)
  DBZ_SCANNER: {
    id: "power_scanner",
    tiers: {
      HERCULE: {
        id: "CHAMP",
        name: "Hercule Satan",
        voice: "Charon" // Deep, boisterous
      },
      FRIEZA: {
        id: "TYRANT",
        name: "Lord Frieza",
        voice: "Puck" // Mischievous, higher pitch. Fits the "Ohohoho" better.
      },
      CELL: {
        id: "PERFECT",
        name: "Perfect Cell",
        voice: "Fenrir" // Smooth, intelligent, slightly deep.
      },
      VEGETA: {
        id: "PRINCE",
        name: "Prince Vegeta",
        voice: "Rasalgethi" // If available, otherwise Charon. Assertive.
      },
      GOKU: {
        id: "SAIYAN",
        name: "Son Goku",
        voice: "Zephyr" // Energetic, friendly.
      },
      BROLY: {
        id: "LEGEND",
        name: "Broly",
        voice: "Aoede" // Intense.
      },
      BUU: {
        id: "MAJIN",
        name: "Majin Buu",
        voice: "Leda" // High pitched, chaotic.
      },
      BEERUS: {
        id: "DESTROYER",
        name: "Lord Beerus",
        voice: "Charon" // Deep, lazy authority.
      },
      WHIS: {
        id: "ANGEL",
        name: "Whis",
        voice: "Fenrir" // Soft, polite, male.
      }
    }
  },

  ARZI_ASSISTANT: {
    id: "arzi_music",
    name: "Arzi Assistant",
    role: "Music Industry Strategist",
  },

  MIKU_GLITCH: {
    id: "miku_glitch",
    name: "Miku Vajfuša",
    role: "System Decay Avatar",
    voice: "Aoede" // High pitched, fits the anime aesthetic best
  }
};
