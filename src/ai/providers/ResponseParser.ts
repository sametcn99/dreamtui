import type { DreamSpec } from "../../domain/DreamSpec.ts";
import { Distortion } from "../../domain/enums/Distortion.ts";
import { Mood } from "../../domain/enums/Mood.ts";
import { Motion } from "../../domain/enums/Motion.ts";
import { Tempo } from "../../domain/enums/Tempo.ts";

/**
 * Attempt to extract a JSON object string from a messy AI response.
 * Handles markdown code fences, leading/trailing text, etc.
 */
function extractJsonString(raw: string): string {
	let cleaned = raw.trim();

	// 1. Try stripping markdown code fences (```json ... ``` or ``` ... ```)
	const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
	if (fenceMatch?.[1]) {
		cleaned = fenceMatch[1].trim();
	}

	// 2. If that didn't yield something starting with {, try to find the JSON object
	if (!cleaned.startsWith("{")) {
		const braceStart = cleaned.indexOf("{");
		if (braceStart !== -1) {
			cleaned = cleaned.slice(braceStart);
		}
	}

	// 3. Find the matching closing brace (handle nested braces)
	if (cleaned.startsWith("{")) {
		let depth = 0;
		let inString = false;
		let escaped = false;
		for (let i = 0; i < cleaned.length; i++) {
			const ch = cleaned[i];
			if (escaped) {
				escaped = false;
				continue;
			}
			if (ch === "\\") {
				escaped = true;
				continue;
			}
			if (ch === '"') {
				inString = !inString;
				continue;
			}
			if (inString) continue;
			if (ch === "{") depth++;
			else if (ch === "}") {
				depth--;
				if (depth === 0) {
					cleaned = cleaned.slice(0, i + 1);
					break;
				}
			}
		}
	}

	return cleaned;
}

/**
 * Normalize JSON keys: replace spaces with underscores so
 * "ascii art" → "ascii_art", "color palette" → "color_palette", etc.
 */
function normalizeKeys(obj: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj)) {
		const normalizedKey = key.replace(/\s+/g, "_").toLowerCase();
		result[normalizedKey] = value;
	}
	return result;
}

/**
 * Parse the AI visualization response containing ASCII art + animation parameters.
 */
export function parseVisualizationResponse(raw: string): DreamSpec {
	const cleaned = extractJsonString(raw);

	let parsed: Record<string, unknown>;
	try {
		parsed = JSON.parse(cleaned);
	} catch {
		throw new Error(
			`Failed to parse AI response as JSON: ${cleaned.slice(0, 200)}...`,
		);
	}

	// Normalize keys to handle variations like "ascii art" vs "ascii_art"
	parsed = normalizeKeys(parsed);

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
