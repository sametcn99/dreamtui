import type { AIProvider } from "../AIClient.ts";

interface OpenAIMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

interface OpenAIResponse {
	choices: Array<{
		message: {
			content: string;
		};
	}>;
}

/**
 * OpenAI-compatible API provider.
 * Works with any API that follows the OpenAI chat completions format
 * (OpenAI, Azure OpenAI, Ollama, LM Studio, etc.)
 */
export class OpenAIProvider implements AIProvider {
	readonly name = "OpenAI Compatible";

	private readonly apiKey: string;
	private readonly baseUrl: string;
	private readonly model: string;

	constructor(apiKey: string, baseUrl: string, model: string) {
		this.apiKey = apiKey;
		this.baseUrl = baseUrl.replace(/\/+$/, ""); // strip trailing slashes
		this.model = model;
	}

	async chat(systemPrompt: string, userMessage: string): Promise<string> {
		const messages: OpenAIMessage[] = [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: userMessage },
		];

		const response = await fetch(`${this.baseUrl}/chat/completions`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.apiKey}`,
			},
			body: JSON.stringify({
				model: this.model,
				messages,
				temperature: 0.7,
				max_tokens: 4000,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`AI request failed (${response.status}): ${errorText}`);
		}

		const data = (await response.json()) as OpenAIResponse;

		const content = data.choices?.[0]?.message?.content;
		if (!content) {
			throw new Error("AI returned empty response");
		}

		return content;
	}
}
