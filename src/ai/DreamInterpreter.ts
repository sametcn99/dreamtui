import type { DreamSpec } from "../domain/DreamSpec.ts";
import { normalizeDreamSpec } from "../domain/DreamSpec.ts";
import type { AIProvider } from "./AIClient.ts";
import { parseVisualizationResponse } from "./providers/ResponseParser.ts";

/**
 * System prompt that instructs the AI to generate ASCII art AND animation parameters.
 * The AI creates the visual representation of the dream as ASCII art,
 * and specifies how it should be animated.
 */
const VISUALIZE_SYSTEM_PROMPT = `You are a dream-to-ASCII-art artist. Given a vivid dream description, you must create TWO things:

1. A beautiful ASCII art scene that visually represents the dream (using Unicode box-drawing, symbols, and special characters)
2. Animation parameters that describe how the scene should move and feel

RESPOND WITH ONLY a valid JSON object with this exact structure:
{
  "ascii_art": [
    "line 1 of ascii art",
    "line 2 of ascii art",
    "..."
  ],
  "color_palette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "dominant_elements": ["element1", "element2", "element3"],
  "motion": "drifting",
  "distortion": "medium",
  "tempo": "slow",
  "density": 0.6,
  "mood": "surreal"
}

ASCII ART RULES:
- Create a scene that is 40-70 characters wide and 15-30 lines tall
- Use rich Unicode characters: ║ ═ ╔ ╗ ╚ ╝ ╠ ╣ ╬ ┃ ━ ┏ ┓ ┗ ┛ ═ ░ ▒ ▓ █ ▲ ▼ ◆ ◇ ● ○ ◎ ★ ☆ ✦ ✧ ⊙ ∞ ≈ ~ ∿ ⌒ ╱ ╲ ∘ · ◐ ◑ ◒ ◓ ◕ ✿ ❀ ❁ ⋆ ▁ ▂ ▃ ▄ ▅ ▆ ▇ △ ▽ ◁ ▷ ♦ ♠ ♥ ♣ ☽ ☾ ☀ ⊕ ⊖ ⊗ ╳ ≋ ∽ ⌇
- Make the art detailed, artistic, and recognizable — NOT just scattered random symbols
- Create coherent visual scenes: landscapes, objects, abstract compositions
- Use spaces strategically for negative space and composition
- Each line should be padded to the same width
- The art should capture the key visual elements of the dream

COLOR PALETTE RULES:
- Provide exactly 5 hex colors that match the mood
- Colors should be visible on a dark terminal background (avoid very dark colors)
- The palette sets the overall chromatic tone of the animation

PARAMETER VALUES:
- motion: "falling" | "rising" | "drifting" | "spinning" | "pulsing" | "expanding" | "contracting" | "flowing" | "static" | "chaotic"
- distortion: "none" | "low" | "medium" | "high" | "extreme"
- tempo: "frozen" | "slow" | "medium" | "fast" | "frantic"
- density: 0.0 to 1.0 (how packed the visual field feels)
- mood: "surreal" | "calm" | "anxious" | "ethereal" | "dark" | "whimsical" | "melancholic" | "euphoric" | "eerie" | "nostalgic"

CRITICAL RULES:
- Do NOT include any explanation, preamble, or markdown formatting
- Respond with ONLY the raw JSON object
- Make the ASCII art beautiful and evocative — this is the centerpiece
- Choose animation parameters that enhance the dream's emotional essence`;

/**
 * DreamInterpreter — Two-stage dream visualization pipeline.
 *
 * Stage 1 (handled by DreamBooster): raw text → vivid description
 * Stage 2 (this class): vivid description → ASCII art + animation params
 */
export class DreamInterpreter {
	private readonly provider: AIProvider;

	constructor(provider: AIProvider) {
		this.provider = provider;
	}

	/**
	 * Interpret a (boosted) dream description into ASCII art + animation parameters.
	 */
	async interpret(boostedDreamText: string): Promise<DreamSpec> {
		const response = await this.provider.chat(
			VISUALIZE_SYSTEM_PROMPT,
			boostedDreamText,
		);
		const spec = parseVisualizationResponse(response);
		return normalizeDreamSpec(spec);
	}

	getProviderName(): string {
		return this.provider.name;
	}

	/**
	 * Returns the system prompt used for dream visualization.
	 */
	static getSystemPrompt(): string {
		return VISUALIZE_SYSTEM_PROMPT;
	}
}
