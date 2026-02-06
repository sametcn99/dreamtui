import type { CliRenderer, KeyEvent } from "@opentui/core";
import { RGBA, TextRenderable } from "@opentui/core";
import type { TUIScreen } from "./TUIScreen.ts";

export type MainScreenEvent =
	| { type: "pause" }
	| { type: "resume" }
	| { type: "restart" }
	| { type: "exit" };

type MainScreenHandler = (event: MainScreenEvent) => void;

/**
 * Main Screen (Dream Animation View)
 *
 * Displays a minimal HUD overlay on top of the running dream animation.
 * Shows status information and handles runtime keyboard controls.
 */
export class MainScreen implements TUIScreen {
	private statusText: TextRenderable | null = null;
	private controlsText: TextRenderable | null = null;
	private keyHandler: ((key: KeyEvent) => void) | null = null;
	private handlers: MainScreenHandler[] = [];

	onEvent(handler: MainScreenHandler): void {
		this.handlers.push(handler);
	}

	private emit(event: MainScreenEvent): void {
		for (const handler of this.handlers) {
			handler(event);
		}
	}

	attach(renderer: CliRenderer): void {
		const w = renderer.terminalWidth;
		const h = renderer.terminalHeight;

		// Status bar (top-right)
		this.statusText = new TextRenderable(renderer, {
			id: "main-status",
			content: "▶ DREAMING",
			fg: RGBA.fromHex("#44ff88"),
			position: "absolute",
			left: w - 16,
			top: 0,
			zIndex: 200,
		});
		renderer.root.add(this.statusText);

		// Controls hint (bottom)
		this.controlsText = new TextRenderable(renderer, {
			id: "main-controls",
			content: "[Space] Pause  ·  [R] Restart  ·  [Esc] Exit",
			fg: RGBA.fromHex("#333355"),
			position: "absolute",
			left: Math.max(0, Math.floor(w / 2 - 23)),
			top: h - 1,
			zIndex: 200,
		});
		renderer.root.add(this.controlsText);

		// Keyboard controls
		this.keyHandler = (key: KeyEvent) => {
			switch (key.name) {
				case "space":
					this.emit({ type: "pause" });
					break;
				case "r":
					this.emit({ type: "restart" });
					break;
				case "escape":
					this.emit({ type: "exit" });
					break;
			}
		};
		renderer.keyInput.on("keypress", this.keyHandler);
	}

	onResize(width: number, height: number): void {
		if (this.statusText) {
			this.statusText.left = width - 16;
		}
		if (this.controlsText) {
			this.controlsText.left = Math.max(0, Math.floor(width / 2 - 23));
			this.controlsText.top = height - 1;
		}
	}

	setStatus(state: string): void {
		if (!this.statusText) return;

		switch (state) {
			case "running":
				this.statusText.content = "▶ DREAMING";
				this.statusText.fg = RGBA.fromHex("#44ff88");
				break;
			case "paused":
				this.statusText.content = "❚❚ PAUSED";
				this.statusText.fg = RGBA.fromHex("#ffaa44");
				break;
			case "stopped":
				this.statusText.content = "■ STOPPED";
				this.statusText.fg = RGBA.fromHex("#ff4444");
				break;
		}
	}

	detach(renderer: CliRenderer): void {
		if (this.keyHandler) {
			renderer.keyInput.off("keypress", this.keyHandler);
			this.keyHandler = null;
		}
		if (this.statusText) {
			this.statusText.destroy();
			this.statusText = null;
		}
		if (this.controlsText) {
			this.controlsText.destroy();
			this.controlsText = null;
		}
	}
}
