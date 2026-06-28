import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const providers = [
  { id: "anthropic", name: "Anthropic", status: "active", models: 12, type: "llm" },
  { id: "openai", name: "OpenAI", status: "active", models: 18, type: "llm" },
  { id: "google", name: "Google AI", status: "active", models: 9, type: "llm" },
  { id: "groq", name: "Groq", status: "active", models: 6, type: "llm" },
  { id: "aws-bedrock", name: "Amazon Bedrock", status: "active", models: 24, type: "llm" },
  { id: "deepseek", name: "DeepSeek", status: "active", models: 4, type: "llm" },
  { id: "mistral", name: "Mistral AI", status: "active", models: 7, type: "llm" },
  { id: "openrouter", name: "OpenRouter", status: "active", models: 200, type: "gateway" },
  { id: "ollama", name: "Ollama", status: "active", models: 0, type: "local" },
  { id: "lm-studio", name: "LM Studio", status: "active", models: 0, type: "local" },
  { id: "together", name: "Together AI", status: "active", models: 30, type: "llm" },
  { id: "fireworks", name: "Fireworks AI", status: "active", models: 15, type: "llm" },
  { id: "perplexity", name: "Perplexity", status: "active", models: 5, type: "llm" },
  { id: "xai", name: "xAI", status: "active", models: 3, type: "llm" },
  { id: "cerebras", name: "Cerebras", status: "active", models: 4, type: "llm" },
  { id: "deepinfra", name: "DeepInfra", status: "active", models: 20, type: "llm" },
  { id: "huggingface", name: "Hugging Face", status: "active", models: 100, type: "gateway" },
  { id: "elevenlabs", name: "ElevenLabs", status: "active", models: 8, type: "speech" },
  { id: "deepgram", name: "Deepgram", status: "active", models: 4, type: "media" },
  { id: "voyage", name: "Voyage AI", status: "active", models: 5, type: "embedding" },
]

export async function GET() {
  return NextResponse.json({
    total: providers.length,
    providers,
  })
}
