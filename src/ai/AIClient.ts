/**
 * Abstraction over any AI provider that can perform chat completions.
 * High-level modules depend on this interface, not concrete implementations.
 */
export interface AIProvider {
	/** Send a system prompt + user message and get the raw text response */
	chat(systemPrompt: string, userMessage: string): Promise<string>;

	/** Human-readable name of the provider */
	readonly name: string;
}
