import type { DreamSpec } from "../../domain/DreamSpec.ts";
import type { Grid } from "../Grid.ts";
import type { RenderLayer } from "../RenderLayer.ts";

/**
 * Mood-based color palettes for fallback coloring.
 */
const MOOD_PALETTES: Record<string, string[]> = {
	surreal: ["#cc44ff", "#ff44cc", "#44ccff", "#ffcc44", "#8844ff"],
	calm: ["#4488cc", "#66aadd", "#88bbee", "#aaccee", "#88ccaa"],
	anxious: ["#ff4444", "#ff6644", "#ffaa33", "#ff2222", "#cc2222"],
	ethereal: ["#aabbff", "#ccddff", "#eeeeff", "#bbccff", "#99aaee"],
	dark: ["#443355", "#332244", "#554466", "#221133", "#665577"],
	whimsical: ["#ff88cc", "#88ffcc", "#ccff88", "#ffcc88", "#88ccff"],
	melancholic: ["#4455aa", "#5566bb", "#334499", "#6677cc", "#223388"],
	euphoric: ["#ffdd44", "#ffee66", "#ffcc22", "#ffaa00", "#ffff88"],
	eerie: ["#22ff88", "#44cc66", "#11aa55", "#33dd77", "#00ff66"],
	nostalgic: ["#cc9966", "#ddaa77", "#bb8855", "#eebb88", "#aa7744"],
};

const DEFAULT_PALETTE = ["#8888cc", "#aa88cc", "#88aacc", "#cc88aa", "#88ccaa"];

/**
 * AsciiArtLayer — Renders AI-generated ASCII art centered on the terminal.
 *
 * This layer:
 * 1. Centers the AI-generated ASCII art on the grid
 * 2. Applies mood-based color gradients to bring the art to life
 * 3. Adds subtle animation effects (breathing, shimmer) to make it dynamic
 * 4. Uses the dream's color palette for chromatic variety
 */
export class AsciiArtLayer implements RenderLayer {
	readonly id = "ascii-art";

	apply(
		grid: Grid,
		spec: DreamSpec,
		time: number,
		seed: number,
		_deltaTime: number,
	): void {
		const art = spec.asciiArt;
		if (!art || art.length === 0) return;

		const palette = this.getPalette(spec);

		// Calculate the art dimensions
		const artWidth = Math.max(...art.map((line) => [...line].length));
		const artHeight = art.length;

		// Center the art on the grid with motion-based offset
		const offsetX = Math.floor((grid.width - artWidth) / 2);
		const offsetY = Math.floor((grid.height - artHeight) / 2);

		// Apply subtle motion offset for "breathing" effect
		const motionOffset = this.getMotionOffset(spec.motion, time, seed);

		// Draw each character of the ASCII art
		for (let row = 0; row < artHeight; row++) {
			const line = art[row];
			if (!line) continue;

			const chars = [...line]; // handle multi-byte unicode properly
			for (let col = 0; col < chars.length; col++) {
				const ch = chars[col];
				if (!ch || ch === " ") continue;

				const gx = Math.floor(offsetX + col + motionOffset.dx);
				const gy = Math.floor(offsetY + row + motionOffset.dy);

				if (gx < 0 || gx >= grid.width || gy < 0 || gy >= grid.height) continue;

				// Color based on position, mood palette, and time for shimmer
				const color = this.getCharColor(
					col,
					row,
					artWidth,
					artHeight,
					palette,
					time,
					seed,
				);

				grid.setCell(gx, gy, ch, color);
			}
		}

		// Draw ambient scattered elements from the art around the edges
		this.drawAmbientEchoes(
			grid,
			spec,
			art,
			time,
			seed,
			palette,
			offsetX,
			offsetY,
			artWidth,
			artHeight,
		);
	}

	/**
	 * Get a color for a character based on its position within the art,
	 * creating a gradient/shimmer effect using the palette.
	 */
	private getCharColor(
		x: number,
		y: number,
		artWidth: number,
		artHeight: number,
		palette: string[],
		time: number,
		seed: number,
	): string {
		// Create a flowing gradient across the art
		const nx = x / Math.max(1, artWidth);
		const ny = y / Math.max(1, artHeight);

		// Combine position with time for shimmer
		const wave =
			Math.sin(nx * Math.PI * 2 + time * 0.3 + seed * 0.01) * 0.5 + 0.5;
		const vertWave = Math.cos(ny * Math.PI * 1.5 + time * 0.2) * 0.5 + 0.5;

		// Select palette color based on combined wave
		const colorIndex = Math.floor((wave + vertWave) * 0.5 * palette.length);
		const baseColor =
			palette[Math.abs(colorIndex) % palette.length] ?? palette[0] ?? "#8888cc";

		// Add subtle brightness pulsing
		const pulse = Math.sin(time * 1.2 + x * 0.1 + y * 0.15) * 0.15 + 0.85;
		return this.dimColor(baseColor, pulse);
	}

	/**
	 * Scatter faded echoes of characters from the art
	 * around the periphery for atmospheric depth.
	 */
	private drawAmbientEchoes(
		grid: Grid,
		spec: DreamSpec,
		art: readonly string[],
		time: number,
		seed: number,
		palette: string[],
		artOffsetX: number,
		artOffsetY: number,
		artWidth: number,
		artHeight: number,
	): void {
		// Collect non-space characters from the art
		const artChars: string[] = [];
		for (const line of art) {
			for (const ch of [...line]) {
				if (ch !== " " && !artChars.includes(ch)) {
					artChars.push(ch);
				}
			}
		}
		if (artChars.length === 0) return;

		const echoCount = Math.floor(8 + spec.density * 20);

		for (let i = 0; i < echoCount; i++) {
			// Generate echo positions outside the main art area
			const angle = this.seededFloat(seed + i * 73, 0, Math.PI * 2);
			const distance =
				this.seededFloat(seed + i * 137 + 500, 0.3, 1.0) *
				Math.min(grid.width, grid.height) *
				0.45;

			const centerX = grid.width / 2;
			const centerY = grid.height / 2;
			let ex = Math.floor(centerX + Math.cos(angle + time * 0.1) * distance);
			let ey = Math.floor(
				centerY + Math.sin(angle + time * 0.08) * distance * 0.6,
			);

			// Apply motion
			const motionOff = this.getMotionOffset(spec.motion, time * 0.5, seed + i);
			ex += Math.floor(motionOff.dx * 0.5);
			ey += Math.floor(motionOff.dy * 0.5);

			if (ex < 0 || ex >= grid.width || ey < 0 || ey >= grid.height) continue;

			// Skip if inside the main art area
			if (
				ex >= artOffsetX &&
				ex < artOffsetX + artWidth &&
				ey >= artOffsetY &&
				ey < artOffsetY + artHeight
			)
				continue;

			// Skip if cell already occupied
			const existing = grid.getCell(ex, ey);
			if (existing.char !== " ") continue;

			const charIdx =
				Math.abs(this.hashInt(seed + i * 31, i)) % artChars.length;
			const ch = artChars[charIdx] ?? "·";
			const colorIdx = i % palette.length;
			const color = this.dimColor(palette[colorIdx] ?? "#555555", 0.35);

			grid.setCell(ex, ey, ch, color);
		}
	}

	/**
	 * Get motion-based offset for the entire art piece.
	 */
	private getMotionOffset(
		motion: string,
		time: number,
		seed: number,
	): { dx: number; dy: number } {
		const amp = 2.0;
		switch (motion) {
			case "falling":
				return {
					dx: Math.sin(time * 0.3 + seed) * amp * 0.3,
					dy: Math.sin(time * 0.5) * amp,
				};
			case "rising":
				return {
					dx: Math.sin(time * 0.3 + seed) * amp * 0.3,
					dy: -Math.sin(time * 0.5) * amp,
				};
			case "drifting":
				return {
					dx: Math.sin(time * 0.2 + seed * 0.1) * amp * 1.5,
					dy: Math.cos(time * 0.15) * amp * 0.4,
				};
			case "spinning": {
				const angle = time * 0.3 + seed;
				return {
					dx: Math.cos(angle) * amp,
					dy: Math.sin(angle) * amp * 0.5,
				};
			}
			case "pulsing": {
				const pulse = Math.sin(time * 1.5 + seed) * 0.5 + 0.5;
				return {
					dx: 0,
					dy: pulse * amp * 0.5,
				};
			}
			case "expanding":
				return {
					dx: Math.sin(time * 0.4) * amp * 0.5,
					dy: Math.cos(time * 0.3) * amp * 0.5,
				};
			case "flowing":
				return {
					dx: Math.sin(time * 0.25 + seed * 0.1) * amp * 2,
					dy: Math.cos(time * 0.15) * amp * 0.3,
				};
			case "chaotic":
				return {
					dx: Math.sin(time * 2 + seed) * amp * 1.5,
					dy: Math.cos(time * 1.7 + seed * 1.3) * amp,
				};
			default:
				return { dx: 0, dy: 0 };
		}
	}

	private getPalette(spec: DreamSpec): string[] {
		// Prefer the AI-provided color palette, fall back to mood-based
		if (spec.colorPalette && spec.colorPalette.length > 0) {
			return [...spec.colorPalette];
		}
		return MOOD_PALETTES[spec.mood] ?? DEFAULT_PALETTE;
	}

	private dimColor(hex: string, factor: number): string {
		const r = Number.parseInt(hex.slice(1, 3), 16);
		const g = Number.parseInt(hex.slice(3, 5), 16);
		const b = Number.parseInt(hex.slice(5, 7), 16);
		const dr = Math.floor(r * factor);
		const dg = Math.floor(g * factor);
		const db = Math.floor(b * factor);
		return `#${dr.toString(16).padStart(2, "0")}${dg.toString(16).padStart(2, "0")}${db.toString(16).padStart(2, "0")}`;
	}

	private seededFloat(seed: number, min: number, max: number): number {
		const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
		const frac = n - Math.floor(n);
		return min + frac * (max - min);
	}

	private hashInt(a: number, b: number): number {
		const n = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
		return Math.floor((n - Math.floor(n)) * 2147483647);
	}
}
