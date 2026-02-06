/**
 * Generates a deterministic numeric seed from a dream text string.
 *
 * The same dream text will always produce the same seed,
 * ensuring: same dream -> similar animation.
 */
export function seedFromText(text: string): number {
	let hash = 0x811c9dc5; // FNV offset basis
	for (let i = 0; i < text.length; i++) {
		hash ^= text.charCodeAt(i);
		hash = (hash * 0x01000193) | 0; // FNV prime, keep 32-bit
	}
	// Return positive integer
	return Math.abs(hash);
}

/**
 * Generate a secondary seed by combining a base seed with an index,
 * useful for layer-specific variation.
 */
export function deriveSeed(baseSeed: number, index: number): number {
	return Math.abs(Math.imul(baseSeed ^ (index * 2654435761), 0x01000193));
}
