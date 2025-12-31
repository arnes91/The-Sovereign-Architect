export const PROMPT_TEMPLATES = {
  DBZ_TAUNT: (instruction: string, power: string, stats: string) => `
    Role: ${instruction}
    Context: A fighter has just been scanned.
    Power Level: ${power}
    Top Emotions: ${stats}
    
    Task: Deliver a "Persona Taunt" (commentary). 
    Constraints: 
    - Exactly two sentences.
    - Use the emotions to explain the power level.
  `,
  AI_COMPOSER: (genre: string, mood: string, elements: string) => `
    You are an expert AI Music Composer & Producer.
    Generate a comprehensive musical concept based on:
    Genre: ${genre}
    Mood: ${mood}
    Additional Elements: ${elements}
    
    Provide the output in raw JSON format (no markdown blocks) with the following structure:
    {
      "title": "Creative Title",
      "bpm": "Number",
      "key": "Musical Key",
      "chordProgression": "progression string",
      "instruments": ["list", "of", "instruments"],
      "lyrics": "verse/chorus snippet if applicable (or N/A)",
      "productionNotes": "Brief advice on sound design and mixing"
    }
  `
};
