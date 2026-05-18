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
  
  const totalNodes = nodesData.length;
  const activeSenders = nodesData.filter(n => n.isSender).length;
  const unstableNodes = nodesData.filter(n => n.baseValue < 1.0).length;
  const overchargedNodes = nodesData.filter(n => n.currentValue > 1.5).length;
  const unstablePercentage = ((unstableNodes / totalNodes) * 100).toFixed(1);

  const prompt = `
You are a Tesana Systems Engineer analyzing a BRNS State Vector Simulation.
The user has provided a network grid with the following logic rule: ${logic}.

Network Statistics:
- Total Nodes: ${totalNodes}
- Active Senders: ${activeSenders}
- Unstable Nodes: ${unstableNodes} (${unstablePercentage}%)
- Overcharged Nodes: ${overchargedNodes}

Here is the detailed state of relevant nodes (senders and instabilities):
${JSON.stringify(nodesData.filter(n => n.isSender || n.baseValue < 1.0), null, 2)}

Analyze the network architecture.
1. Provide a high-level summary of the "current state" of the network based on the statistics provided.
2. Identify potential failure points based on the logic rule.
3. Provide a brief architectural feedback.
4. Suggest an optimal placement for a new sender or instability to improve network resilience.

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
