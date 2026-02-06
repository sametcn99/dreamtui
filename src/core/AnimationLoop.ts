import { Tempo } from "../domain/enums/Tempo.ts";

export type AnimationState = "running" | "paused" | "stopped";

/**
 * Controls the frame-based animation loop timing.
 *
 * Single Responsibility: manages only timing, pause/resume,
 * and elapsed time tracking. Does not render or compose.
 */
export class AnimationLoop {
	private elapsedTime = 0;
	private state: AnimationState = "stopped";
	private fps: number;

	constructor(fps = 13) {
		this.fps = fps;
	}

	/**
	 * Process a tick. Returns the elapsed time if running, or null if paused/stopped.
	 */
	tick(deltaTimeMs: number): number | null {
		if (this.state !== "running") return null;

		const deltaSeconds = deltaTimeMs / 1000;
		this.elapsedTime += deltaSeconds;
		return this.elapsedTime;
	}

	start(): void {
		this.state = "running";
	}

	pause(): void {
		if (this.state === "running") {
			this.state = "paused";
		}
	}

	resume(): void {
		if (this.state === "paused") {
			this.state = "running";
		}
	}

	togglePause(): void {
		if (this.state === "running") {
			this.pause();
		} else if (this.state === "paused") {
			this.resume();
		}
	}

	stop(): void {
		this.state = "stopped";
		this.elapsedTime = 0;
	}

	reset(): void {
		this.elapsedTime = 0;
	}

	getState(): AnimationState {
		return this.state;
	}

	getElapsedTime(): number {
		return this.elapsedTime;
	}

	getFps(): number {
		return this.fps;
	}

	setFps(fps: number): void {
		this.fps = Math.max(1, Math.min(60, fps));
	}

	/**
	 * Derive FPS from a DreamSpec's tempo field.
	 */
	static fpsFromTempo(tempo: Tempo | string, baseFps: number): number {
		const multipliers: Record<string, number> = {
			[Tempo.Frozen]: 0.3,
			[Tempo.Slow]: 0.6,
			[Tempo.Medium]: 1.0,
			[Tempo.Fast]: 1.5,
			[Tempo.Frantic]: 2.2,
		};
		const mult = multipliers[tempo] ?? 1.0;
		return Math.round(baseFps * mult);
	}
}
