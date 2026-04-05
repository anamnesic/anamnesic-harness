// Export all provider classes and interfaces
export * from './AIProvider';
export * from './CopilotProvider';
export * from './OllamaProvider';

// Re-export the global registry
export { aiProviderRegistry } from './AIProvider';

// Provider setup utilities
import { CopilotProvider } from './CopilotProvider';
import { OllamaProvider } from './OllamaProvider';
import { aiProviderRegistry } from './AIProvider';

/**
 * Initialize and register all available providers
 * Note: Groq (paid) has been removed. Only free providers: Copilot and Ollama.
 */
export async function initializeProviders(options: {
  ollamaBaseUrl?: string;
} = {}): Promise<void> {
  // Always register Copilot (built into VS Code, free)
  aiProviderRegistry.register(new CopilotProvider());
  
  // Register Ollama if available (local, free)
  const ollama = new OllamaProvider(options.ollamaBaseUrl);
  aiProviderRegistry.register(ollama);
  
  // Set Copilot as default (best free option for cloud-based inference)
  aiProviderRegistry.setDefault('copilot');
}

/**
 * Get the best available free provider
 */
export async function getBestFreeProvider() {
  const providers = await aiProviderRegistry.getAvailableProviders();
  
  // Prefer Ollama (local, private, completely free)
  const ollama = providers.find(p => p.vendor === 'ollama');
  if (ollama) return ollama;
  
  // Fallback to Copilot free models (cloud-based, fast)
  const copilot = providers.find(p => p.vendor === 'copilot');
  return copilot;
}
