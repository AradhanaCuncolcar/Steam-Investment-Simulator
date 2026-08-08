import { GoogleGenAI } from '@google/genai';
import path from 'path';

// Securely pulling the key from environment variables (hidden in .env.local)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req) {
  try {
    const { pitch } = await req.json();

    if (!pitch) {
      return Response.json({ error: "Game pitch is required" }, { status: 400 });
    }

    const rulesFilePath = path.join(process.cwd(), 'data', 'rules.json');

    console.log("Uploading rules.json to Gemini...");
    const uploadedFile = await ai.files.upload({
      file: rulesFilePath,
      mimeType: 'application/json',
    });

    console.log(`File uploaded successfully as: ${uploadedFile.name}`);

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

    console.log("Evaluating pitch...");
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: [
        { text: `Here is the USER PITCH: "${pitch}"` },
        { fileData: { fileUri: uploadedFile.uri, mimeType: uploadedFile.mimeType } }
      ],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
      }
    });

    const evaluationResult = JSON.parse(response.text);
    return Response.json(evaluationResult);

  } catch (error) {
    console.error("Error evaluating pitch:", error);
    return Response.json({ error: "Failed to evaluate pitch." }, { status: 500 });
  }
}