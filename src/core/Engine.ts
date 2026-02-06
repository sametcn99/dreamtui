import type { CliRenderer } from "@opentui/core";
import { FrameBufferRenderable, RGBA } from "@opentui/core";

import type { DreamSpec } from "../domain/DreamSpec.ts";
import type { Grid } from "../renderer/Grid.ts";
import { Renderer } from "../renderer/Renderer.ts";
import { AnimationLoop } from "./AnimationLoop.ts";
import { seedFromText } from "./SeedManager.ts";

export type EngineEvent =
	| { type: "state-change"; state: string }
	| { type: "frame"; fps: number; elapsed: number };

type EngineEventHandler = (event: EngineEvent) => void;

/**
 * The Engine ties together the AnimationLoop, Renderer, and OpenTUI FrameBuffer.
 *
 * It owns the dream lifecycle: start a dream, render frames, handle
 * pause/resume/restart, and tear down.
 */
export class Engine {
	private readonly cliRenderer: CliRenderer;
	private readonly animationLoop: AnimationLoop;
	private renderer: Renderer;
	private framebufferRenderable: FrameBufferRenderable | null = null;

	private currentSpec: DreamSpec | null = null;
	private dreamText = "";
	private seed = 0;
	private frameCallback: ((dt: number) => Promise<void>) | null = null;
	private eventHandlers: EngineEventHandler[] = [];

	constructor(cliRenderer: CliRenderer, fps = 13) {
		this.cliRenderer = cliRenderer;
		this.animationLoop = new AnimationLoop(fps);
		this.renderer = new Renderer(
			cliRenderer.terminalWidth,
			cliRenderer.terminalHeight,
		);
	}

	/**
	 * Start rendering a dream.
	 */
	startDream(spec: DreamSpec, dreamText: string): void {
		this.teardown();

		this.currentSpec = spec;
		this.dreamText = dreamText;
		this.seed = seedFromText(dreamText);

		const width = this.cliRenderer.terminalWidth;
		const height = this.cliRenderer.terminalHeight;

		this.renderer = new Renderer(width, height);

		// Create the full-screen frame buffer
		this.framebufferRenderable = new FrameBufferRenderable(this.cliRenderer, {
			id: "dream-canvas",
			width,
			height,
			zIndex: 0,
		});
		this.cliRenderer.root.add(this.framebufferRenderable);

		// Adjust FPS based on dream tempo
		const effectiveFps = AnimationLoop.fpsFromTempo(
			spec.tempo,
			this.animationLoop.getFps(),
		);
		this.animationLoop.setFps(effectiveFps);
		this.animationLoop.reset();
		this.animationLoop.start();

		// Register the per-frame callback
		this.frameCallback = async (deltaTime: number) => {
			this.onFrame(deltaTime);
		};
		this.cliRenderer.setFrameCallback(this.frameCallback);

		// Handle terminal resize
		this.cliRenderer.on("resize", this.onResize);

		this.emit({ type: "state-change", state: "running" });
	}

	/**
	 * Render one frame of the dream animation.
	 */
	private onFrame(deltaTimeMs: number): void {
		if (!this.currentSpec || !this.framebufferRenderable) return;

		const elapsed = this.animationLoop.tick(deltaTimeMs);
		if (elapsed === null) return; // paused or stopped

		// Render the procedural grid
		const grid = this.renderer.renderFrame(
			this.currentSpec,
			elapsed,
			this.seed,
			deltaTimeMs / 1000,
		);

		// Flush grid to the OpenTUI FrameBuffer
		this.flushToBuffer(grid);

		this.emit({
			type: "frame",
			fps: this.animationLoop.getFps(),
			elapsed,
		});
	}

	/**
	 * Transfer the composed Grid cells to the OpenTUI FrameBuffer.
	 */
	private flushToBuffer(grid: Grid): void {
		const fb = this.framebufferRenderable?.frameBuffer;
		if (!fb) return;
		const bgColor = RGBA.fromHex("#000000");
		fb.fillRect(0, 0, grid.width, grid.height, bgColor);

		for (let y = 0; y < grid.height; y++) {
			for (let x = 0; x < grid.width; x++) {
				const cell = grid.getCell(x, y);
				if (cell.char !== " ") {
					fb.setCell(
						x,
						y,
						cell.char,
						RGBA.fromHex(cell.fg),
						RGBA.fromHex(cell.bg),
					);
				}
			}
		}
	}

	private onResize = (width: number, height: number): void => {
		this.renderer.resize(width, height);
		if (this.framebufferRenderable) {
			this.framebufferRenderable.frameBuffer.resize(width, height);
		}
	};

	// --- Controls ---

	pause(): void {
		this.animationLoop.pause();
		this.emit({ type: "state-change", state: "paused" });
	}

	resume(): void {
		this.animationLoop.resume();
		this.emit({ type: "state-change", state: "running" });
	}

	togglePause(): void {
		this.animationLoop.togglePause();
		this.emit({
			type: "state-change",
			state: this.animationLoop.getState(),
		});
	}

	restart(): void {
		if (this.currentSpec && this.dreamText) {
			this.startDream(this.currentSpec, this.dreamText);
		}
	}

	stop(): void {
		this.animationLoop.stop();
		this.teardown();
		this.emit({ type: "state-change", state: "stopped" });
	}

	isRunning(): boolean {
		return this.animationLoop.getState() === "running";
	}

	isPaused(): boolean {
		return this.animationLoop.getState() === "paused";
	}

	getState(): string {
		return this.animationLoop.getState();
	}

	// --- Events ---

	onEvent(handler: EngineEventHandler): void {
		this.eventHandlers.push(handler);
	}

	private emit(event: EngineEvent): void {
		for (const handler of this.eventHandlers) {
			handler(event);
		}
	}

	// --- Cleanup ---

	private teardown(): void {
		if (this.frameCallback) {
			this.cliRenderer.removeFrameCallback(this.frameCallback);
			this.frameCallback = null;
		}

		this.cliRenderer.off("resize", this.onResize);

		if (this.framebufferRenderable) {
			this.framebufferRenderable.destroyRecursively();
			this.framebufferRenderable = null;
		}
	}

	destroy(): void {
		this.stop();
		this.teardown();
		this.eventHandlers = [];
	}
}
