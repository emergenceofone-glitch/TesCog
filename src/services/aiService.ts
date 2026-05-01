import { GoogleGenAI, Type, Schema, ThinkingLevel } from '@google/genai';

// Initialize the Gemini API client
// We use lazy initialization to ensure the environment variable is loaded
let ai: GoogleGenAI | null = null;

function getAI() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export async function analyzeNetwork(nodesData: any[], logic: string) {
  const client = getAI();
  
  const prompt = `
You are a Tesana Systems Engineer analyzing a BRNS State Vector Simulation.
The user has provided a network grid with the following logic rule: ${logic}.
Here is the current state of the nodes (only showing senders and instabilities for brevity):
${JSON.stringify(nodesData.filter(n => n.isSender || n.baseValue < 1.0), null, 2)}

Analyze the network architecture.
1. Identify potential failure points based on the logic rule.
2. Provide a brief architectural feedback.
3. Suggest an optimal placement for a new sender or instability to improve network resilience.

Keep your response concise, technical, and in the tone of a specialist engineer.
  `;

  const response = await client.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
    }
  });

  return response.text;
}

export async function getRealWorldAnalogies(logic: string) {
  const client = getAI();
  
  const prompt = `
Find real-world examples or recent news related to network routing, failure cascades, or load balancing that are analogous to the "${logic}" routing logic in a distributed system.
If logic is "diversion", think of Aetherium Routing or traffic diversion.
If logic is "dam", think of weakest-link failures or bottlenecks.
If logic is "crush", think of multiplicative signal decay or cascading failures.

Provide 2-3 brief, factual examples.
  `;

  const response = await client.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  return response.text;
}
