import type { DreamSpec } from "../../domain/DreamSpec.ts";
import { Distortion } from "../../domain/enums/Distortion.ts";
import { Mood } from "../../domain/enums/Mood.ts";
import { Motion } from "../../domain/enums/Motion.ts";
import { Tempo } from "../../domain/enums/Tempo.ts";

/**
 * Parse the AI visualization response containing ASCII art + animation parameters.
 */
export function parseVisualizationResponse(raw: string): DreamSpec {
	let cleaned = raw.trim();

	// Strip markdown code fences if present
	if (cleaned.startsWith("```")) {
		cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
	}

	let parsed: Record<string, unknown>;
	try {
		parsed = JSON.parse(cleaned);
	} catch {
		throw new Error(
			`Failed to parse AI response as JSON: ${cleaned.slice(0, 200)}...`,
		);
	}

	return {
		asciiArt: parseStringArray(parsed.ascii_art, [
			"   ·  ·  ·  ",
			"  ·  ◎  ·  ",
			"   ·  ·  ·  ",
		]),
		colorPalette: parseStringArray(parsed.color_palette, [
			"#8888cc",
			"#aa88cc",
			"#88aacc",
			"#cc88aa",
			"#88ccaa",
		]),
		dominantElements: parseStringArray(parsed.dominant_elements, ["void"]),
		motion: parseEnum(parsed.motion, Motion, Motion.Drifting),
		distortion: parseEnum(parsed.distortion, Distortion, Distortion.Medium),
		tempo: parseEnum(parsed.tempo, Tempo, Tempo.Medium),
		density: parseNumber(parsed.density, 0.5),
		mood: parseEnum(parsed.mood, Mood, Mood.Surreal),
	};
}

/**
 * @deprecated Use parseVisualizationResponse instead.
 * Kept for backward compatibility.
 */
export function parseResponse(raw: string): DreamSpec {
	return parseVisualizationResponse(raw);
}

function parseStringArray(
	value: unknown,
	fallback: string[],
): readonly string[] {
	if (Array.isArray(value)) {
		return value.filter((v): v is string => typeof v === "string");
	}
	return fallback;
}

function parseEnum<T extends Record<string, string>>(
	value: unknown,
	enumObj: T,
	fallback: T[keyof T],
): T[keyof T] {
	if (typeof value !== "string") return fallback;
	const values = Object.values(enumObj) as string[];
	if (values.includes(value)) return value as T[keyof T];
	return fallback;
}

function parseNumber(value: unknown, fallback: number): number {
	if (typeof value === "number" && !Number.isNaN(value)) return value;
	return fallback;
}
