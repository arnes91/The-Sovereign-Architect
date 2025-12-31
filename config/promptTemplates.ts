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

  DBZ_VISION_ANALYSIS: `
    You are a Saiyan Scouter. Analyze the facial expression, posture, and "aura" of the subject in the image.
    
    Determine their "Power Level" based on:
    1. Intensity of gaze (Determination/Concentration)
    2. Posture (Calmness/Readiness)
    3. Emotional state (Anger = Multiplier, Fear = Reducer)

    Return a valid JSON object ONLY:
    {
      "power": number (between 500 and 10,000,000),
      "stats": {
        "anger": number (1-10),
        "determination": number (1-10),
        "excitement": number (1-10),
        "concentration": number (1-10),
        "fear": number (1-10),
        "sadness": number (1-10),
        "confusion": number (1-10),
        "anxiety": number (1-10),
        "calmness": number (1-10),
        "serenity": number (1-10),
        "contemplation": number (1-10)
      }
    }
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
  `,

  ANALYTICS_INTERPRETER: (fileName: string) => `
    You are a Data Strategist for the Brzi Ecosystem.
    I have provided a data file named "${fileName}" (CSV/JSON content).
    
    Analyze this data to find:
    1. Key Growth Trends
    2. Anomalies or Outliers
    3. Actionable Strategic Opportunities for a music/tech creator.
    
    Format the response in Markdown with clear headers.
  `
};
