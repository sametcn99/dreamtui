import type { AIProvider } from "./AIClient.ts";

/**
 * System prompt for the dream booster.
 * Takes the user's raw dream text and enriches it into a vivid,
 * visually detailed description suitable for ASCII art generation.
 */
const BOOST_SYSTEM_PROMPT = `You are a dream amplifier. Your job is to take a brief, raw dream description and transform it into a vivid, richly detailed visual narrative.

Rules:
- Expand the dream into 3-5 sentences of lush visual imagery
- Focus on VISUAL elements: shapes, objects, textures, spatial relationships, lighting, atmosphere  
- Add sensory details: colors, movement patterns, scale, depth
- Preserve the original emotional tone but amplify it
- Mention specific objects/elements that could be drawn as ASCII art (e.g. "towering spiral staircase", "shattered mirror fragments floating", "endless ocean waves")
- Do NOT explain or interpret the dream — just DESCRIBE it more vividly
- Keep the dreamy, surreal quality
- Write in descriptive present tense
- Respond with ONLY the enhanced description text, no preamble or labels`;

/**
 * DreamBooster — Enhances raw user dream text into a rich visual prompt.
 *
 * This is the first step in the two-stage AI pipeline:
 *   1. Boost: raw text → vivid description
 *   2. Visualize: vivid description → ASCII art + animation params
 */
export class DreamBooster {
	private readonly provider: AIProvider;

	constructor(provider: AIProvider) {
		this.provider = provider;
	}

	/**
	 * Enhance a raw dream description into a vivid visual prompt.
	 */
	async boost(rawDreamText: string): Promise<string> {
		const response = await this.provider.chat(
			BOOST_SYSTEM_PROMPT,
			rawDreamText,
		);
		return response.trim();
	}

	/**
	 * Returns the system prompt used for dream boosting.
	 */
	static getSystemPrompt(): string {
		return BOOST_SYSTEM_PROMPT;
	}
}
