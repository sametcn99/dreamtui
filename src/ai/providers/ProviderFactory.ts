import type { AppConfig } from "../../infrastructure/ConfigStore.ts";
import type { AIProvider } from "../AIClient.ts";
import { AnthropicProvider } from "./AnthropicProvider.ts";
import { GoogleProvider } from "./GoogleProvider.ts";
import { OpenAIProvider } from "./OpenAIProvider.ts";
import { getPreset } from "./ProviderPresets.ts";

/**
 * Create an AIProvider from the current app configuration.
 * Resolves the provider type from the preset and instantiates
 * the correct class.
 */
export function createProvider(config: Readonly<AppConfig>): AIProvider {
	const preset = getPreset(config.provider);

	// Determine effective values (user overrides > preset defaults)
	const baseUrl = config.apiBaseUrl || preset?.baseUrl || "";
	const model = config.model || preset?.defaultModel || "";
	const apiKey = config.apiKey;
	const providerType = preset?.type ?? "openai-compatible";

	if (!baseUrl) {
		throw new Error(
			`No API base URL configured for provider "${config.provider}"`,
		);
	}

	const useJsonMode = preset?.supportsJsonMode ?? false;

	switch (providerType) {
		case "anthropic":
			return new AnthropicProvider(apiKey, baseUrl, model);
		case "google":
			return new GoogleProvider(apiKey, baseUrl, model);
		default:
			return new OpenAIProvider(apiKey, baseUrl, model, useJsonMode);
	}
}

/**
 * Validate that the required fields are present for a given provider.
 */
export function validateProvider(config: Readonly<AppConfig>): {
	valid: boolean;
	error?: string;
} {
	const preset = getPreset(config.provider);

	if (preset?.requiresApiKey && !config.apiKey) {
		return {
			valid: false,
			error: `API key required for ${preset.name}. Press Ctrl+S to configure.`,
		};
	}

	const baseUrl = config.apiBaseUrl || preset?.baseUrl;
	if (!baseUrl) {
		return {
			valid: false,
			error: "No API base URL configured.",
		};
	}

	return { valid: true };
}
