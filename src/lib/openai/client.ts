import OpenAI from "openai";

// Singleton OpenAI client
let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
    if (!openaiClient) {
        openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openaiClient;
}
