import type { AIProvider } from "../AIClient.ts";

interface GeminiCandidate {
	content: {
		parts: Array<{ text: string }>;
	};
}

interface GeminiResponse {
	candidates: GeminiCandidate[];
}

/**
 * Google Gemini (Generative Language API) provider.
 * Uses the generateContent REST endpoint.
 */
export class GoogleProvider implements AIProvider {
	readonly name = "Google Gemini";

	private readonly apiKey: string;
	private readonly baseUrl: string;
	private readonly model: string;

	constructor(apiKey: string, baseUrl: string, model: string) {
		this.apiKey = apiKey;
		this.baseUrl = baseUrl.replace(/\/+$/, "");
		this.model = model;
	}

	async chat(systemPrompt: string, userMessage: string): Promise<string> {
		const url = `${this.baseUrl}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

		let retries = 0;
		const maxRetries = 5;
		let backoff = 1000;

		while (true) {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					system_instruction: {
						parts: [{ text: systemPrompt }],
					},
					contents: [
						{
							parts: [{ text: userMessage }],
						},
					],
					generationConfig: {
						temperature: 0.7,
						maxOutputTokens: 4000,
					},
				}),
			});

			if (response.status === 429) {
				if (retries >= maxRetries) {
					const errorText = await response.text();
					throw new Error(
						`Gemini request failed (429 Too Many Requests) after ${maxRetries} retries: ${errorText}`,
					);
				}
				retries++;
				const delay = backoff + Math.random() * 500;
				await new Promise((resolve) => setTimeout(resolve, delay));
				backoff *= 2;
				continue;
			}

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`Gemini request failed (${response.status}): ${errorText}`,
				);
			}

			const data = (await response.json()) as GeminiResponse;

			const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
			if (!content) {
				throw new Error("Gemini returned empty response");
			}

			return content;
		}
	}
}
