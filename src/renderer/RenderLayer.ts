import type { DreamSpec } from "../domain/DreamSpec.ts";
import type { Grid } from "./Grid.ts";

/**
 * Interface for all render layers.
 * Each layer writes into the compositing grid using its own strategy.
 *
 * Layers are applied in order; later layers overwrite earlier ones
 * where they choose to write.
 *
 * Implements Interface Segregation & Liskov Substitution:
 * all layers share this contract and are freely interchangeable.
 */
export interface RenderLayer {
	/** Unique identifier for this layer */
	readonly id: string;

	/**
	 * Apply this layer to the grid.
	 * @param grid      – compositing surface
	 * @param spec      – current dream parameters
	 * @param time      – elapsed time in seconds
	 * @param seed      – deterministic seed derived from dream input
	 * @param deltaTime – time since last frame in seconds
	 */
	apply(
		grid: Grid,
		spec: DreamSpec,
		time: number,
		seed: number,
		deltaTime: number,
	): void;
}
