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
	private warningText: TextRenderable | null = null;
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
			content: "LIVE SIGNAL",
			fg: RGBA.fromHex("#8cff4f"),
			position: "absolute",
			left: w - 14,
			top: 0,
			zIndex: 200,
		});
		renderer.root.add(this.statusText);

		this.warningText = new TextRenderable(renderer, {
			id: "main-warning",
			content: "UNSTABLE FEED // ASCII HALLUCINATION ACTIVE",
			fg: RGBA.fromHex("#ff315c"),
			position: "absolute",
			left: 1,
			top: 0,
			zIndex: 200,
		});
		renderer.root.add(this.warningText);

		// Controls hint (bottom)
		this.controlsText = new TextRenderable(renderer, {
			id: "main-controls",
			content: "[Space] freeze  ·  [R] relapse  ·  [Esc] sever feed",
			fg: RGBA.fromHex("#5d5146"),
			position: "absolute",
			left: Math.max(0, Math.floor(w / 2 - 29)),
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
			this.statusText.left = width - 14;
		}
		if (this.controlsText) {
			this.controlsText.left = Math.max(0, Math.floor(width / 2 - 29));
			this.controlsText.top = height - 1;
		}
	}

	setStatus(state: string): void {
		if (!this.statusText) return;

		switch (state) {
			case "running":
				this.statusText.content = "LIVE SIGNAL";
				this.statusText.fg = RGBA.fromHex("#8cff4f");
				break;
			case "paused":
				this.statusText.content = "FEED FROZEN";
				this.statusText.fg = RGBA.fromHex("#ffb347");
				break;
			case "stopped":
				this.statusText.content = "BLACKOUT";
				this.statusText.fg = RGBA.fromHex("#ff315c");
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
		if (this.warningText) {
			this.warningText.destroy();
			this.warningText = null;
		}
	}
}
