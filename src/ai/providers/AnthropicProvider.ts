import type { AIProvider } from "../AIClient.ts";

interface AnthropicMessage {
	role: "user" | "assistant";
	content: string;
}

interface AnthropicResponse {
	content: Array<{
		type: string;
		text: string;
	}>;
}

/**
 * Anthropic Claude API provider.
 * Uses the Anthropic Messages API format.
 */
export class AnthropicProvider implements AIProvider {
	readonly name = "Anthropic Claude";

	private readonly apiKey: string;
	private readonly baseUrl: string;
	private readonly model: string;

	constructor(apiKey: string, baseUrl: string, model: string) {
		this.apiKey = apiKey;
		this.baseUrl = baseUrl.replace(/\/+$/, "");
		this.model = model;
	}

	async chat(systemPrompt: string, userMessage: string): Promise<string> {
		const messages: AnthropicMessage[] = [
			{ role: "user", content: userMessage },
			{ role: "assistant", content: "{" },
		];

		const response = await fetch(`${this.baseUrl}/v1/messages`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": this.apiKey,
				"anthropic-version": "2023-06-01",
			},
			body: JSON.stringify({
				model: this.model,
				max_tokens: 4000,
				system: systemPrompt,
				messages,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`Anthropic request failed (${response.status}): ${errorText}`,
			);
		}

		const data = (await response.json()) as AnthropicResponse;

		const textBlock = data.content?.find((b) => b.type === "text");
		if (!textBlock?.text) {
			throw new Error("Anthropic returned empty response");
		}

		// Prepend "{" since we used assistant prefill starting with "{"
		return `{${textBlock.text}`;
	}
}
