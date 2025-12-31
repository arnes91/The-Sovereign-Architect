export enum View {
  DASHBOARD = 'DASHBOARD',
  DBZ_SCANNER = 'DBZ_SCANNER',
  CONCEPT_STUDIO = 'CONCEPT_STUDIO',
  DEEP_ARCHITECT = 'DEEP_ARCHITECT',
  LIVE_UPLINK = 'LIVE_UPLINK',
  AI_COMPANION = 'AI_COMPANION',
  AI_COMPOSER = 'AI_COMPOSER',
  ANALYTICS_LAB = 'ANALYTICS_LAB',
  KNOWLEDGE_BASE = 'KNOWLEDGE_BASE',
  LEADERBOARD = 'LEADERBOARD'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
  groundingMetadata?: GroundingMetadata;
}

export interface GroundingMetadata {
  groundingChunks: {
    web?: {
      uri: string;
      title: string;
    };
  }[];
}

// --- EMOTION & SCANNER TYPES ---

export interface HumeEmotion {
  name: string;
  score: number;
}

export interface DBZStats {
  anger: number;
  determination: number;
  excitement: number;
  concentration: number;
  fear: number;
  sadness: number;
  confusion: number;
  anxiety: number;
  calmness: number;
  pride: number; // Added for Vegeta-style logic
}

export interface DBZScanResult {
  id: string;
  timestamp: number;
  power: number;
  taunt: string;
  character: string; // The persona responding
  stats: DBZStats;
  imageUrl?: string;
  shareUrl?: string;
}

// --- GAMIFICATION TYPES ---

export interface UserProfile {
  id: string;
  username: string;
  level: number;
  xp: number;
  energy: number; // Free scans remaining
  maxEnergy: number;
  isPremium: boolean;
  unlockedPersonas: string[];
  joinedAt: number;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
}

export interface KnowledgeItem {
  id: string;
  type: 'PROMPT' | 'NOTE' | 'STRATEGY' | 'SCAN';
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
}
