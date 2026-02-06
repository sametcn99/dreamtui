import type { DreamSpec } from "../../domain/DreamSpec.ts";
import type { Grid } from "../Grid.ts";
import type { RenderLayer } from "../RenderLayer.ts";

/**
 * Applies Perlin-like noise patterns that evolve over time.
 * Creates an organic, shifting background texture.
 *
 * Uses mood-aware coloring and softer characters to provide
 * atmosphere without overwhelming the scene content.
 */
export class NoiseLayer implements RenderLayer {
	readonly id = "noise";

	/** Gradient noise characters — deliberately sparse and subtle */
	private static readonly NOISE_CHARS = [" ", " ", " ", "·", "·", "∘", "░"];

	/** Mood-based tint colors for noise */
	private static readonly MOOD_TINTS: Record<
		string,
		{ r: number; g: number; b: number }
	> = {
		surreal: { r: 40, g: 20, b: 60 },
		calm: { r: 20, g: 30, b: 50 },
		anxious: { r: 50, g: 15, b: 15 },
		ethereal: { r: 30, g: 35, b: 55 },
		dark: { r: 15, g: 10, b: 25 },
		whimsical: { r: 45, g: 25, b: 40 },
		melancholic: { r: 20, g: 25, b: 45 },
		euphoric: { r: 50, g: 45, b: 15 },
		eerie: { r: 10, g: 40, b: 25 },
		nostalgic: { r: 45, g: 35, b: 20 },
	};

	apply(
		grid: Grid,
		spec: DreamSpec,
		time: number,
		seed: number,
		_deltaTime: number,
	): void {
		const noiseScale = this.getNoiseScale(spec);
		const timeScale = this.getTimeScale(spec);
		const tint = NoiseLayer.MOOD_TINTS[spec.mood] ?? { r: 25, g: 25, b: 35 };

		for (let y = 0; y < grid.height; y++) {
			for (let x = 0; x < grid.width; x++) {
				// Only write to cells that are currently empty (space)
				const current = grid.getCell(x, y);
				if (current.char !== " ") continue;

				const noiseVal = this.fbm(
					x * noiseScale,
					y * noiseScale,
					time * timeScale,
					seed,
					3, // fewer octaves — lighter background
				);

				const charIndex = Math.floor(
					((noiseVal + 1) / 2) * NoiseLayer.NOISE_CHARS.length,
				);
				const clamped = Math.max(
					0,
					Math.min(NoiseLayer.NOISE_CHARS.length - 1, charIndex),
				);
				const char = NoiseLayer.NOISE_CHARS[clamped] ?? " ";

				if (char !== " ") {
					// Mood-tinted subtle color
					const brightness = 0.3 + ((noiseVal + 1) / 2) * 0.5;
					const r = Math.floor(tint.r * brightness);
					const g = Math.floor(tint.g * brightness);
					const b = Math.floor(tint.b * brightness);
					const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
					grid.setCell(x, y, char, hex);
				}
			}
		}
	}

	/**
	 * Fractal Brownian Motion — stacks multiple noise octaves
	 * for richer, more natural-looking patterns.
	 */
	private fbm(
		x: number,
		y: number,
		t: number,
		seed: number,
		octaves: number,
	): number {
		let value = 0;
		let amplitude = 1;
		let frequency = 1;
		let maxAmplitude = 0;

		for (let i = 0; i < octaves; i++) {
			value +=
				amplitude *
				this.noise3d(x * frequency, y * frequency, t + seed + i * 100);
			maxAmplitude += amplitude;
			amplitude *= 0.5;
			frequency *= 2;
		}

		return value / maxAmplitude;
	}

	/**
	 * Simple 3D value noise using sine-based hashing.
	 * Not true Perlin, but smooth enough for ASCII rendering.
	 */
	private noise3d(x: number, y: number, z: number): number {
		const ix = Math.floor(x);
		const iy = Math.floor(y);
		const iz = Math.floor(z);
		const fx = x - ix;
		const fy = y - iy;
		const fz = z - iz;

		// Smoothstep interpolation
		const sx = fx * fx * (3 - 2 * fx);
		const sy = fy * fy * (3 - 2 * fy);
		const sz = fz * fz * (3 - 2 * fz);

		const h = (a: number, b: number, c: number) => {
			const n = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
			return (n - Math.floor(n)) * 2 - 1;
		};

		// Trilinear interpolation
		const n000 = h(ix, iy, iz);
		const n100 = h(ix + 1, iy, iz);
		const n010 = h(ix, iy + 1, iz);
		const n110 = h(ix + 1, iy + 1, iz);
		const n001 = h(ix, iy, iz + 1);
		const n101 = h(ix + 1, iy, iz + 1);
		const n011 = h(ix, iy + 1, iz + 1);
		const n111 = h(ix + 1, iy + 1, iz + 1);

		const nx00 = n000 + sx * (n100 - n000);
		const nx10 = n010 + sx * (n110 - n010);
		const nx01 = n001 + sx * (n101 - n001);
		const nx11 = n011 + sx * (n111 - n011);

		const nxy0 = nx00 + sy * (nx10 - nx00);
		const nxy1 = nx01 + sy * (nx11 - nx01);

		return nxy0 + sz * (nxy1 - nxy0);
	}

	private getNoiseScale(spec: DreamSpec): number {
		// Higher density = finer noise
		return 0.04 + spec.density * 0.08;
	}

	private getTimeScale(spec: DreamSpec): number {
		const tempoMultipliers: Record<string, number> = {
			frozen: 0.0,
			slow: 0.02,
			medium: 0.05,
			fast: 0.1,
			frantic: 0.2,
		};
		return tempoMultipliers[spec.tempo] ?? 0.05;
	}
}
