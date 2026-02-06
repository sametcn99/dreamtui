import type { Distortion, Mood, Motion, Tempo } from "./enums/index.ts";

/**
 * Structured data extracted from the AI's dream visualization response.
 *
 * The AI generates ASCII art and animation parameters.
 * The renderer uses both to create animated terminal art.
 */
export interface DreamSpec {
	/** AI-generated ASCII art lines representing the dream scene */
	readonly asciiArt: readonly string[];

	/** Color palette for rendering the ASCII art (hex colors) */
	readonly colorPalette: readonly string[];

	/** Key visual/conceptual elements present in the dream */
	readonly dominantElements: readonly string[];

	/** The dominant motion pattern */
	readonly motion: Motion;

	/** Level of visual warping/instability */
	readonly distortion: Distortion;

	/** Animation speed feel */
	readonly tempo: Tempo;

	/** Symbol fill density, 0.0 (sparse) to 1.0 (packed) */
	readonly density: number;

	/** Emotional tone of the scene */
	readonly mood: Mood;
}

/**
 * Validates and clamps a DreamSpec's fields.
 */
export function normalizeDreamSpec(spec: DreamSpec): DreamSpec {
	return {
		...spec,
		density: Math.max(0, Math.min(1, spec.density)),
		dominantElements:
			spec.dominantElements.length > 0
				? spec.dominantElements.slice(0, 8)
				: ["void"],
		asciiArt:
			spec.asciiArt.length > 0
				? spec.asciiArt
				: ["   ·  ·  ·  ", "  ·  ◎  ·  ", "   ·  ·  ·  "],
		colorPalette:
			spec.colorPalette.length > 0
				? spec.colorPalette
				: ["#8888cc", "#aa88cc", "#88aacc", "#cc88aa", "#88ccaa"],
	};
}
