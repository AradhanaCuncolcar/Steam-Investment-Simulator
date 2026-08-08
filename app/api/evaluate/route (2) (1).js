import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';

// Securely pulling the key from environment variables (hidden in .env.local)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Cache the uploaded rules file in memory across warm invocations so we
// don't re-upload the same file to the Files API on every single request.
let cachedRulesFile = null;

async function getRulesFile() {
  if (cachedRulesFile) return cachedRulesFile;

  const rulesFilePath = path.join(process.cwd(), 'data', 'rules.json');

  if (!fs.existsSync(rulesFilePath)) {
    throw new Error(
      `rules.json not found at ${rulesFilePath}. Make sure the file exists at /data/rules.json in the project root and is included in your deploy.`
    );
  }

  console.log('Uploading rules.json to Gemini...');
  const uploaded = await ai.files.upload({
    file: rulesFilePath,
    config: { mimeType: 'application/json' },
  });
  console.log(`File uploaded successfully as: ${uploaded.name} (state: ${uploaded.state})`);

  // The Files API processes uploads asynchronously — wait for ACTIVE
  // before referencing the file in a generateContent call.
  let file = uploaded;
  let attempts = 0;
  while (file.state === 'PROCESSING' && attempts < 20) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    file = await ai.files.get({ name: file.name });
    attempts += 1;
  }
  if (file.state !== 'ACTIVE') {
    throw new Error(`rules.json upload ended in state "${file.state}", expected "ACTIVE".`);
  }

  cachedRulesFile = file;
  return file;
}

export async function POST(req) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in the environment.');
    }

    const { pitch, pivots } = await req.json();

    if (!pitch) {
      return Response.json({ error: 'Game pitch is required' }, { status: 400 });
    }

    const rulesFile = await getRulesFile();

    const systemInstruction = `
You are the "Greenlight Evaluator," an elite, data-driven AI Product Manager for a video game publisher. Your job is to analyze video game pitches and provide strategic investment verdicts based strictly on the provided market data.

You will receive two things:
1. MARKET DATA: A JSON file containing association rules and lift multipliers for game genres and mechanics (from our Steam dataset).
2. USER PITCH: A short, natural-language pitch for a new video game.

Your Instructions:
1. Extract the core genres and mechanics from the USER PITCH.
2. Cross-reference those genres/mechanics with the MARKET DATA to evaluate the pitch's commercial viability. Look for high-lift combinations or identify missing high-value synergies.
3. Determine a Verdict: "GO" (if the pitch hits high-value synergies or has an easy pivot) or "NO-GO" (if the combination is historically poor).
4. Assign a Market Confidence Score (0-100).
5. Provide a one-sentence justification.
6. Provide 1 or 2 specific "Strategic Pivots" based *only* on the rules in the MARKET DATA.

Output Format:
You MUST return your analysis as a valid JSON object matching this exact schema. Do not include markdown formatting or conversational text outside the JSON.

{
  "verdict": "GO" | "NO-GO",
  "confidence_score": 85,
  "justification": "A one-sentence summary of why this decision was made.",
  "strategic_pivots": [
    "First prescriptive tweak based on the data.",
    "Second prescriptive tweak based on the data."
  ]
}`;

    // If the founder has checked pivots and asked to re-evaluate, fold
    // them into the prompt so the model scores the pitch as-if applied.
    const pivotContext =
      Array.isArray(pivots) && pivots.length
        ? `\n\nThe founder has agreed to apply the following strategic pivots. Re-evaluate the pitch AS IF these changes have already been made, and reflect their impact on the confidence score:\n${pivots
            .map((p) => `- ${p}`)
            .join('\n')}`
        : '';

    console.log('Evaluating pitch...');
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: [
        { text: `Here is the USER PITCH: "${pitch}"${pivotContext}` },
        { fileData: { fileUri: rulesFile.uri, mimeType: rulesFile.mimeType } },
      ],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const evaluationResult = JSON.parse(response.text);
    return Response.json(evaluationResult);
  } catch (error) {
    console.error('Error evaluating pitch:', error);
    // Surface the real message to the client too — the generic message
    // alone made this impossible to debug from the browser/network tab.
    return Response.json(
      { error: 'Failed to evaluate pitch.', detail: error.message },
      { status: 500 }
    );
  }
}
