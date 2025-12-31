export enum View {
  DASHBOARD = 'DASHBOARD',
  DBZ_SCANNER = 'DBZ_SCANNER',
  CONCEPT_STUDIO = 'CONCEPT_STUDIO',
  DEEP_ARCHITECT = 'DEEP_ARCHITECT',
  LIVE_UPLINK = 'LIVE_UPLINK',
  AI_COMPANION = 'AI_COMPANION',
  AI_COMPOSER = 'AI_COMPOSER'
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
  serenity: number;
  contemplation: number;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
}
