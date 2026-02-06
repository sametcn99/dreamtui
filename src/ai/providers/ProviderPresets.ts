/**
 * Pre-configured provider presets for popular AI services.
 * Each preset knows its API format, default base URL, and default model.
 */

export type ProviderType = "openai-compatible" | "anthropic" | "google";

export interface ProviderPreset {
	/** Unique identifier */
	readonly id: string;
	/** Human-readable display name */
	readonly name: string;
	/** Default API base URL */
	readonly baseUrl: string;
	/** Default model identifier */
	readonly defaultModel: string;
	/** Which API format this provider uses */
	readonly type: ProviderType;
	/** Whether an API key is required (false for local providers) */
	readonly requiresApiKey: boolean;
	/** Whether the provider supports response_format JSON mode */
	readonly supportsJsonMode: boolean;
	/** Short description shown in the UI */
	readonly description: string;
}

export const PROVIDER_PRESETS: readonly ProviderPreset[] = [
	{
		id: "openai",
		name: "OpenAI",
		baseUrl: "https://api.openai.com/v1",
		defaultModel: "gpt-4o-mini",
		type: "openai-compatible",
		requiresApiKey: true,
		supportsJsonMode: true,
		description: "GPT-4o, GPT-4o-mini, o1, o3-mini",
	},
	{
		id: "anthropic",
		name: "Anthropic",
		baseUrl: "https://api.anthropic.com",
		defaultModel: "claude-sonnet-4-20250514",
		type: "anthropic",
		requiresApiKey: true,
		supportsJsonMode: false,
		description: "Claude Sonnet, Opus, Haiku",
	},
	{
		id: "google",
		name: "Google Gemini",
		baseUrl: "https://generativelanguage.googleapis.com",
		defaultModel: "gemini-2.0-flash",
		type: "google",
		requiresApiKey: true,
		supportsJsonMode: true,
		description: "Gemini 2.0 Flash, Pro, etc.",
	},
	{
		id: "groq",
		name: "Groq",
		baseUrl: "https://api.groq.com/openai/v1",
		defaultModel: "llama-3.3-70b-versatile",
		type: "openai-compatible",
		requiresApiKey: true,
		supportsJsonMode: true,
		description: "Ultra-fast inference, Llama, Mixtral",
	},
	{
		id: "openrouter",
		name: "OpenRouter",
		baseUrl: "https://openrouter.ai/api/v1",
		defaultModel: "anthropic/claude-sonnet-4",
		type: "openai-compatible",
		requiresApiKey: true,
		supportsJsonMode: true,
		description: "Multi-provider gateway, 100+ models",
	},
	{
		id: "together",
		name: "Together AI",
		baseUrl: "https://api.together.xyz/v1",
		defaultModel: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
		type: "openai-compatible",
		requiresApiKey: true,
		supportsJsonMode: true,
		description: "Open-source models, fast inference",
	},
	{
		id: "deepseek",
		name: "DeepSeek",
		baseUrl: "https://api.deepseek.com/v1",
		defaultModel: "deepseek-chat",
		type: "openai-compatible",
		requiresApiKey: true,
		supportsJsonMode: true,
		description: "DeepSeek V3, R1",
	},
	{
		id: "ollama",
		name: "Ollama (Local)",
		baseUrl: "http://localhost:11434/v1",
		defaultModel: "llama3.2",
		type: "openai-compatible",
		requiresApiKey: false,
		supportsJsonMode: false,
		description: "Local models, no API key needed",
	},
	{
		id: "lmstudio",
		name: "LM Studio (Local)",
		baseUrl: "http://localhost:1234/v1",
		defaultModel: "local-model",
		type: "openai-compatible",
		requiresApiKey: false,
		supportsJsonMode: false,
		description: "Local models via LM Studio",
	},
	{
		id: "custom",
		name: "Custom (OpenAI-compatible)",
		baseUrl: "",
		defaultModel: "",
		type: "openai-compatible",
		requiresApiKey: true,
		supportsJsonMode: false,
		description: "Any OpenAI-compatible endpoint",
	},
] as const;

/**
 * Get a provider preset by its ID.
 */
export function getPreset(id: string): ProviderPreset | undefined {
	return PROVIDER_PRESETS.find((p) => p.id === id);
}

/**
 * Get preset IDs as a list for select menus.
 */
export function getPresetIds(): string[] {
	return PROVIDER_PRESETS.map((p) => p.id);
}
