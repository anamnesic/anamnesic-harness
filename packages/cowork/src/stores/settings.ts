import { createSignal } from "solid-js";
import {
  getSettings as getSettingsApi,
  saveSettings as saveSettingsApi,
  Settings as ApiSettings,
} from "../lib/tauri-api";

export interface Settings {
  apiKey: string;  // Current active API key (for display)
  model: string;
  baseUrl: string;
  maxTokens: number;
  temperature?: number;
  providerKeys: Record<string, string>;  // Provider-specific API keys
  openaiOrganization?: string;  // Optional OpenAI Organization ID
  openaiProject?: string;  // Optional OpenAI Project ID
}

// Provider configuration type
export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiFormat: "anthropic" | "openai" | "openai-compatible" | "openai-responses" | "google" | "minimax";
  authType: "none" | "bearer" | "api-key" | "query-param";
  authHeader?: string;  // Custom auth header name
  description?: string;
}

// Provider presets
export const PROVIDER_PRESETS: Record<string, ProviderConfig> = {
  vscode: {
    id: "vscode",
    name: "VS Code LLM (Copilot)",
    baseUrl: "http://localhost:3456",
    apiFormat: "anthropic",
    authType: "none",
    description: "Models via GitHub Copilot",
  },
};

export const AVAILABLE_MODELS = [
  // ── Auto ──────────────────────────────────────────────────────────────────
  { id: "auto",                name: "Auto",                  description: "Raptor mini mejora el prompt y elige el modelo ideal", provider: "vscode", baseUrl: "http://localhost:3456", group: "auto" },

  // ── Recommended ───────────────────────────────────────────────────────────
  { id: "claude-haiku-4.5",   name: "Claude Haiku 4.5",      description: "Rápido y eficiente · 0.33x",  provider: "vscode", baseUrl: "http://localhost:3456", group: "recommended" },
  { id: "claude-opus-4.7",    name: "Claude Opus 4.7",       description: "Más capaz · 7.5x",            provider: "vscode", baseUrl: "http://localhost:3456", group: "recommended" },
  { id: "claude-sonnet-4.5",  name: "Claude Sonnet 4.5",     description: "Balanceado · 1x",             provider: "vscode", baseUrl: "http://localhost:3456", group: "recommended" },
  { id: "claude-sonnet-4.6",  name: "Claude Sonnet 4.6",     description: "Último Anthropic · High · 1x",provider: "vscode", baseUrl: "http://localhost:3456", group: "recommended" },
  { id: "gpt-5.4",            name: "GPT-5.4",               description: "OpenAI flagship · Medium · 1x",provider: "vscode", baseUrl: "http://localhost:3456", group: "recommended" },

  // ── Other Models ──────────────────────────────────────────────────────────
  { id: "claude-sonnet-4",    name: "Claude Sonnet 4",       description: "Anthropic · 1x",              provider: "vscode", baseUrl: "http://localhost:3456", group: "other" },
  { id: "gemini-2.5-pro",     name: "Gemini 2.5 Pro",        description: "Google · 1x",                 provider: "vscode", baseUrl: "http://localhost:3456", group: "other" },
  { id: "gemini-3-flash",     name: "Gemini 3 Flash (Preview)", description: "Google rápido · 0.33x",   provider: "vscode", baseUrl: "http://localhost:3456", group: "other" },
  { id: "gemini-3.1-pro",     name: "Gemini 3.1 Pro (Preview)", description: "Google avanzado · 1x",    provider: "vscode", baseUrl: "http://localhost:3456", group: "other" },
  { id: "gpt-4.1",            name: "GPT-4.1",               description: "OpenAI · 0x",                 provider: "vscode", baseUrl: "http://localhost:3456", group: "other" },
  { id: "gpt-4o",             name: "GPT-4o",                description: "OpenAI multimodal · 0x",      provider: "vscode", baseUrl: "http://localhost:3456", group: "other" },
  { id: "gpt-5-mini",         name: "GPT-5 mini",            description: "OpenAI rápido · Medium · 0x", provider: "vscode", baseUrl: "http://localhost:3456", group: "other" },
  { id: "gpt-5.2",            name: "GPT-5.2",               description: "OpenAI · Medium · 1x",        provider: "vscode", baseUrl: "http://localhost:3456", group: "other" },
  { id: "gpt-5.2-codex",      name: "GPT-5.2-Codex",         description: "OpenAI código · Medium · 1x", provider: "vscode", baseUrl: "http://localhost:3456", group: "other" },
  { id: "gpt-5.3-codex",      name: "GPT-5.3-Codex",         description: "OpenAI código · Medium · 1x", provider: "vscode", baseUrl: "http://localhost:3456", group: "other" },
  { id: "gpt-5.4-mini",       name: "GPT-5.4 mini",          description: "OpenAI · Medium · 0.33x",     provider: "vscode", baseUrl: "http://localhost:3456", group: "other" },
  { id: "grok-code-fast-1",   name: "Grok Code Fast 1",      description: "xAI código · 0.25x",          provider: "vscode", baseUrl: "http://localhost:3456", group: "other" },
  { id: "raptor-mini-preview",name: "Raptor mini (Preview)",  description: "Router de modelos · 0x",      provider: "vscode", baseUrl: "http://localhost:3456", group: "other" },
];

const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  model: "auto",
  baseUrl: "http://localhost:3456",
  maxTokens: 4096,
  temperature: 0.7,
  providerKeys: {},
};

// Get provider ID from model
export function getProviderFromModel(modelId: string): string {
  const model = AVAILABLE_MODELS.find(m => m.id === modelId);
  return model?.provider || "anthropic";
}

// Check if a model uses the OpenAI Responses API (GPT-5 series)
export function usesResponsesApi(modelId: string): boolean {
  // Check if model is in AVAILABLE_MODELS with apiFormat: "responses"
  const model = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (model && 'apiFormat' in model && model.apiFormat === "responses") {
    return true;
  }
  // Fallback: detect GPT-5 models by name pattern
  const lower = modelId.toLowerCase();
  return lower.startsWith("gpt-5") || lower.match(/^gpt-5[\.-]/) !== null;
}

// Convert between frontend and API formats
function fromApiSettings(api: ApiSettings): Settings {
  const providerKeys = api.provider_keys || {};
  const model = api.model;
  const provider = getProviderFromModel(model);

  // Get the current provider's API key
  const apiKey = providerKeys[provider] || api.api_key || "";

  return {
    apiKey,
    model: api.model,
    baseUrl: api.base_url,
    maxTokens: api.max_tokens,
    temperature: api.temperature ?? 0.7,
    providerKeys,
    openaiOrganization: api.openai_organization,
    openaiProject: api.openai_project,
  };
}

function toApiSettings(settings: Settings): ApiSettings {
  // Update the providerKeys with current apiKey for current provider
  const provider = getProviderFromModel(settings.model);
  const providerKeys = { ...settings.providerKeys };
  if (settings.apiKey) {
    providerKeys[provider] = settings.apiKey;
  }

  return {
    api_key: settings.apiKey,
    model: settings.model,
    base_url: settings.baseUrl,
    max_tokens: settings.maxTokens,
    temperature: settings.temperature ?? 0.7,
    provider_keys: providerKeys,
    openai_organization: settings.openaiOrganization,
    openai_project: settings.openaiProject,
  };
}

const [settings, setSettings] = createSignal<Settings>(DEFAULT_SETTINGS);
const [showSettings, setShowSettings] = createSignal(false);
const [isLoading, setIsLoading] = createSignal(true);

// Load settings on startup
export async function loadSettings() {
  setIsLoading(true);
  try {
    const apiSettings = await getSettingsApi();
    setSettings(fromApiSettings(apiSettings));
  } catch (e) {
    console.error("Failed to load settings:", e);
  } finally {
    setIsLoading(false);
  }
}

// Save settings
async function persistSettings(newSettings: Settings) {
  try {
    await saveSettingsApi(toApiSettings(newSettings));
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
}

// Helper function to get model info
export function getModelInfo(modelId: string) {
  return AVAILABLE_MODELS.find(m => m.id === modelId);
}

// Helper function to get default base URL for a model
export function getDefaultBaseUrl(modelId: string): string {
  const model = getModelInfo(modelId);
  return model?.baseUrl || "https://api.anthropic.com";
}

// Check if a provider requires API key
export function providerRequiresApiKey(providerId: string): boolean {
  const config = PROVIDER_PRESETS[providerId];
  if (!config) return true;  // Unknown provider, assume needs key
  return config.authType !== "none";
}

export function useSettings() {
  return {
    settings,
    setSettings,
    showSettings,
    isLoading,
    toggleSettings: () => setShowSettings((v) => !v),
    updateSetting: async <K extends keyof Settings>(key: K, value: Settings[K]) => {
      let newSettings = { ...settings(), [key]: value };

      // When API key changes, also save it to providerKeys for the current provider
      if (key === 'apiKey' && typeof value === 'string') {
        const currentProvider = getProviderFromModel(settings().model);
        newSettings.providerKeys = {
          ...newSettings.providerKeys,
          [currentProvider]: value,
        };
      }

      // When model changes, switch to that provider's stored API key
      if (key === 'model' && typeof value === 'string') {
        const currentModel = getModelInfo(settings().model);
        const newModel = getModelInfo(value);
        const currentProvider = getProviderFromModel(settings().model);
        const newProvider = getProviderFromModel(value);

        // Save current API key to providerKeys before switching
        if (settings().apiKey) {
          newSettings.providerKeys = {
            ...newSettings.providerKeys,
            [currentProvider]: settings().apiKey,
          };
        }

        // Load the new provider's API key
        newSettings.apiKey = newSettings.providerKeys[newProvider] || "";

        // Auto-update base URL if current URL matches the previous model's default
        if (currentModel && newModel && settings().baseUrl === currentModel.baseUrl) {
          newSettings.baseUrl = newModel.baseUrl;
        }
      }

      setSettings(newSettings);
      await persistSettings(newSettings);
    },
    saveAllSettings: async (newSettings: Settings) => {
      // Save current API key to providerKeys
      const provider = getProviderFromModel(newSettings.model);
      if (newSettings.apiKey) {
        newSettings.providerKeys = {
          ...newSettings.providerKeys,
          [provider]: newSettings.apiKey,
        };
      }
      setSettings(newSettings);
      await persistSettings(newSettings);
    },
    // Always show main UI - API key validation happens at request time
    // This allows users to explore the app and switch to local providers without being blocked
    isConfigured: () => true,
    loadSettings,
    getModelInfo,
    getDefaultBaseUrl,
    getProviderFromModel,
    providerRequiresApiKey,
  };
}
