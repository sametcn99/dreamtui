import type { DreamSpec } from "../domain/DreamSpec.ts";
import { Grid } from "./Grid.ts";
import { AsciiArtLayer } from "./layers/AsciiArtLayer.ts";
import { DistortionLayer } from "./layers/DistortionLayer.ts";
import { NoiseLayer } from "./layers/NoiseLayer.ts";
import type { RenderLayer } from "./RenderLayer.ts";

/**
 * Orchestrates the full render pipeline.
 *
 * Each frame:
 *   1. Clear the compositing grid
 *   2. Apply layers in order:
 *      AsciiArt  → AI-generated ASCII art centered on screen
 *      Noise     → subtle background atmosphere
 *      Distortion → post-process warping
 *   3. Return the composed grid for terminal output
 *
 * Open/Closed: new layers can be added without modifying this class.
 */
export class Renderer {
	private readonly layers: RenderLayer[];
	private grid: Grid;

	constructor(width: number, height: number, layers?: RenderLayer[]) {
		this.grid = new Grid(width, height);
		this.layers = layers ?? [
			new AsciiArtLayer(),
			new NoiseLayer(),
			new DistortionLayer(),
		];
	}

	/**
	 * Render a single frame.
	 */
	renderFrame(
		spec: DreamSpec,
		time: number,
		seed: number,
		deltaTime: number,
	): Grid {
		this.grid.clear();

		for (const layer of this.layers) {
			layer.apply(this.grid, spec, time, seed, deltaTime);
		}

		return this.grid;
	}

	/**
	 * Handle terminal resize.
	 */
	resize(width: number, height: number): void {
		this.grid = new Grid(width, height);
	}

	get width(): number {
		return this.grid.width;
	}

	get height(): number {
		return this.grid.height;
	}
}
