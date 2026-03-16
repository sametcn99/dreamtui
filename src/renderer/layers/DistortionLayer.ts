import type { DreamSpec } from "../../domain/DreamSpec.ts";
import { Distortion } from "../../domain/enums/Distortion.ts";
import { Motion } from "../../domain/enums/Motion.ts";
import type { Grid } from "../Grid.ts";
import type { RenderLayer } from "../RenderLayer.ts";

/**
 * Applies spatial warping and character displacement
 * to create dreamlike visual instability.
 *
 * Distortion is applied as a post-process — it reads from the grid,
 * transforms coordinates, and rewrites cells to shifted positions.
 */
export class DistortionLayer implements RenderLayer {
	readonly id = "distortion";

	apply(
		grid: Grid,
		spec: DreamSpec,
		time: number,
		seed: number,
		_deltaTime: number,
	): void {
		const strength = this.getStrength(spec.distortion);
		if (strength <= 0) return;

		// Snapshot current grid state before warping
		const snapshot: Array<{ char: string; fg: string; bg: string }> = [];
		for (let y = 0; y < grid.height; y++) {
			for (let x = 0; x < grid.width; x++) {
				snapshot.push(grid.getCell(x, y));
			}
		}

		// Apply motion-based displacement
		for (let y = 0; y < grid.height; y++) {
			for (let x = 0; x < grid.width; x++) {
				const offset = this.computeOffset(
					x,
					y,
					grid.width,
					grid.height,
					spec.motion,
					time,
					seed,
					strength,
				);

				const srcX = Math.round(x + offset.dx);
				const srcY = Math.round(y + offset.dy);

				if (srcX >= 0 && srcX < grid.width && srcY >= 0 && srcY < grid.height) {
					const srcIdx = srcY * grid.width + srcX;
					const src = snapshot[srcIdx];
					if (src) {
						grid.setCell(x, y, src.char, src.fg, src.bg);
					}
				}
			}
		}

		if (strength >= 0.35) {
			this.applyHorizontalTearing(grid, time, seed, strength);
		}

		this.applyScanlineFlicker(grid, time, seed, strength);

		// Apply character mutation at high distortion
		if (strength >= 0.7) {
			this.applyCharacterGlitch(grid, time, seed, strength);
		}

		if (strength >= 0.85) {
			this.applySignalDropouts(grid, time, seed, strength);
		}
	}

	private applyHorizontalTearing(
		grid: Grid,
		time: number,
		seed: number,
		strength: number,
	): void {
		const snapshot: Array<{ char: string; fg: string; bg: string }> = [];
		for (let y = 0; y < grid.height; y++) {
			for (let x = 0; x < grid.width; x++) {
				snapshot.push(grid.getCell(x, y));
			}
		}

		const bandCount = Math.max(1, Math.floor(2 + strength * 4));
		for (let band = 0; band < bandCount; band++) {
			const baseY = Math.floor(
				(Math.sin(seed * 0.37 + band * 1.91 + time * (2 + band)) * 0.5 + 0.5) *
					(grid.height - 1),
			);
			const bandHeight = Math.max(1, Math.floor(1 + strength * 3));
			const shift = Math.round(
				Math.sin(time * (8 + band * 2) + seed * 0.11 + band) * strength * 8,
			);

			for (let y = baseY; y < Math.min(grid.height, baseY + bandHeight); y++) {
				for (let x = 0; x < grid.width; x++) {
					const srcX = x - shift;
					if (srcX < 0 || srcX >= grid.width) {
						grid.setCell(x, y, x % 2 === 0 ? "#" : " ", "#ff335a");
						continue;
					}

					const src = snapshot[y * grid.width + srcX];
					if (src) {
						grid.setCell(x, y, src.char, src.fg, src.bg);
					}
				}
			}
		}
	}

	private applyScanlineFlicker(
		grid: Grid,
		time: number,
		seed: number,
		strength: number,
	): void {
		const activeBand = Math.floor(
			(Math.sin(time * 6 + seed * 0.3) * 0.5 + 0.5) *
				Math.max(1, grid.height - 1),
		);

		for (let y = 0; y < grid.height; y++) {
			const isScanline = y % 2 === 0;
			const isHotBand = Math.abs(y - activeBand) <= 1;
			const dimFactor = Math.max(0.55, 0.9 - strength * 0.18);

			for (let x = 0; x < grid.width; x++) {
				const cell = grid.getCell(x, y);
				if (cell.char === " ") {
					if (isHotBand && Math.sin(x * 0.9 + time * 12 + seed) > 0.8) {
						grid.setCell(x, y, "_", "#8cff4f");
					}
					continue;
				}

				if (isScanline) {
					grid.setCell(x, y, cell.char, this.tint(cell.fg, dimFactor));
				}

				if (
					isHotBand &&
					Math.sin(x * 1.7 + time * 15 + seed) > 0.8 - strength * 0.08
				) {
					grid.setCell(x, y, cell.char, this.tint(cell.fg, 1.35));
				}
			}
		}
	}

	private computeOffset(
		x: number,
		y: number,
		width: number,
		height: number,
		motion: Motion | string,
		time: number,
		seed: number,
		strength: number,
	): { dx: number; dy: number } {
		const cx = width / 2;
		const cy = height / 2;
		const nx = (x - cx) / cx; // normalized -1..1
		const ny = (y - cy) / cy;

		let dx = 0;
		let dy = 0;

		switch (motion) {
			case Motion.Falling:
				dy = Math.sin(x * 0.3 + time * 1.5 + seed) * strength * 3;
				dx = Math.cos(y * 0.2 + time * 0.5) * strength * 0.5;
				break;

			case Motion.Rising:
				dy = -Math.sin(x * 0.3 + time * 1.5 + seed) * strength * 3;
				dx = Math.cos(y * 0.2 + time * 0.5) * strength * 0.5;
				break;

			case Motion.Spinning: {
				const angle = time * 0.8 + seed;
				const dist = Math.sqrt(nx * nx + ny * ny);
				dx = Math.cos(angle + dist * 3) * strength * 4 * dist;
				dy = Math.sin(angle + dist * 3) * strength * 4 * dist;
				break;
			}

			case Motion.Pulsing: {
				const pulse = Math.sin(time * 2 + seed) * 0.5 + 0.5;
				dx = nx * pulse * strength * 5;
				dy = ny * pulse * strength * 5;
				break;
			}

			case Motion.Drifting:
				dx =
					Math.sin(y * 0.15 + time * 0.4 + seed) * strength * 3 +
					Math.sin(time * 0.2) * strength;
				dy = Math.cos(x * 0.1 + time * 0.3) * strength * 0.5;
				break;

			case Motion.Expanding: {
				const expPulse = (Math.sin(time * 1.2 + seed) + 1) * 0.5;
				dx = nx * expPulse * strength * 6;
				dy = ny * expPulse * strength * 6;
				break;
			}

			case Motion.Contracting: {
				const conPulse = (Math.cos(time * 1.2 + seed) + 1) * 0.5;
				dx = -nx * conPulse * strength * 6;
				dy = -ny * conPulse * strength * 6;
				break;
			}

			case Motion.Flowing:
				dx =
					Math.sin(y * 0.1 + time * 0.6 + seed) * strength * 4 +
					Math.sin(y * 0.05 + time * 0.3) * strength * 2;
				dy = Math.cos(x * 0.08 + time * 0.2) * strength;
				break;

			case Motion.Chaotic:
				dx =
					Math.sin(x * 0.5 + time * 2 + seed) * strength * 4 +
					Math.cos(y * 0.7 + time * 3) * strength * 2;
				dy =
					Math.cos(y * 0.5 + time * 2.5 + seed) * strength * 4 +
					Math.sin(x * 0.3 + time * 1.5) * strength * 2;
				break;
			default:
				dx = Math.sin(x * 0.2 + seed) * strength * 0.5;
				dy = Math.cos(y * 0.2 + seed) * strength * 0.5;
				break;
		}

		return { dx, dy };
	}

	/**
	 * At high distortion levels, randomly mutate some characters
	 * for a "glitchy" effect.
	 */
	private applyCharacterGlitch(
		grid: Grid,
		time: number,
		seed: number,
		strength: number,
	): void {
		const glitchChars = [
			"█",
			"▓",
			"▒",
			"░",
			"╳",
			"╬",
			"┼",
			"≡",
			"≋",
			"#",
			"%",
			"&",
		];
		const glitchPalette = ["#ff335a", "#ff8a00", "#8cff4f", "#f6f1d1"];
		const glitchRate = (strength - 0.7) * 0.22;

		for (let y = 0; y < grid.height; y++) {
			for (let x = 0; x < grid.width; x++) {
				const hash =
					Math.sin(x * 92.1 + y * 301.7 + time * 50 + seed * 7.3) * 43758.5;
				const prob = hash - Math.floor(hash);

				if (prob < glitchRate) {
					const ci = Math.floor(prob * 100) % glitchChars.length;
					const glitchChar = glitchChars[ci] ?? glitchChars[0];
					if (glitchChar) {
						const color =
							glitchPalette[Math.floor((prob * 1000) % glitchPalette.length)] ??
							"#ff335a";
						grid.setCell(x, y, glitchChar, color);
					}
				}
			}
		}
	}

	private applySignalDropouts(
		grid: Grid,
		time: number,
		seed: number,
		strength: number,
	): void {
		const dropoutBand = Math.floor(
			(Math.cos(time * 5 + seed) * 0.5 + 0.5) * Math.max(1, grid.width - 1),
		);

		for (let y = 0; y < grid.height; y++) {
			for (let x = 0; x < grid.width; x++) {
				const distance = Math.abs(x - dropoutBand);
				if (distance > 1) continue;

				const phase = Math.sin(y * 1.4 + time * 16 + seed * 0.5);
				if (phase > 0.45 + (1 - strength) * 0.2) {
					grid.setCell(x, y, " ", "#000000", "#000000");
				} else if (phase < -0.75) {
					grid.setCell(x, y, "|", "#ff244c");
				}
			}
		}
	}

	private getStrength(distortion: string): number {
		const map: Record<string, number> = {
			[Distortion.None]: 0,
			[Distortion.Low]: 0.25,
			[Distortion.Medium]: 0.5,
			[Distortion.High]: 0.75,
			[Distortion.Extreme]: 1.0,
		};
		return map[distortion] ?? 0.5;
	}

	private tint(hex: string, factor: number): string {
		const r = Number.parseInt(hex.slice(1, 3), 16);
		const g = Number.parseInt(hex.slice(3, 5), 16);
		const b = Number.parseInt(hex.slice(5, 7), 16);
		const tr = Math.max(0, Math.min(255, Math.floor(r * factor)));
		const tg = Math.max(0, Math.min(255, Math.floor(g * factor)));
		const tb = Math.max(0, Math.min(255, Math.floor(b * factor)));
		return `#${tr.toString(16).padStart(2, "0")}${tg.toString(16).padStart(2, "0")}${tb.toString(16).padStart(2, "0")}`;
	}
}
