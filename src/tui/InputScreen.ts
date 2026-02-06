import type { CliRenderer, KeyEvent } from "@opentui/core";
import {
	ASCIIFontRenderable,
	BoxRenderable,
	InputRenderable,
	InputRenderableEvents,
	RGBA,
	TextRenderable,
} from "@opentui/core";
import type { TUIScreen } from "./TUIScreen.ts";

export type InputScreenEvent =
	| { type: "submit"; text: string }
	| { type: "open-settings" };

type InputScreenHandler = (event: InputScreenEvent) => void;

/**
 * Dream Input Screen
 *
 * Displays the DreamTUI title, a multiline dream description input,
 * and instructions. Emits events when the user submits a dream
 * or wants to open settings.
 */
export class InputScreen implements TUIScreen {
	private container: BoxRenderable | null = null;
	private input: InputRenderable | null = null;
	private statusText: TextRenderable | null = null;
	private keyHandler: ((key: KeyEvent) => void) | null = null;
	private handlers: InputScreenHandler[] = [];
	private dreamText = "";
	private isLoading = false;

	// UI Elements tracked for resize updates
	private title: ASCIIFontRenderable | null = null;
	private subtitle: TextRenderable | null = null;
	private inputBox: BoxRenderable | null = null;
	private hintText: TextRenderable | null = null;
	private instructions: TextRenderable | null = null;

	onEvent(handler: InputScreenHandler): void {
		this.handlers.push(handler);
	}

	private emit(event: InputScreenEvent): void {
		for (const handler of this.handlers) {
			handler(event);
		}
	}

	attach(renderer: CliRenderer): void {
		const w = renderer.terminalWidth;
		const h = renderer.terminalHeight;

		// Main container
		this.container = new BoxRenderable(renderer, {
			id: "input-screen",
			width: "100%",
			height: "100%",
			flexDirection: "column",
			alignItems: "center",
			justifyContent: "center",
			zIndex: 100,
		});
		renderer.root.add(this.container);

		// Title
		this.title = new ASCIIFontRenderable(renderer, {
			id: "input-title",
			text: "DREAMTUI",
			font: "tiny",
			color: RGBA.fromHex("#9966ff"),
			position: "absolute",
			left: Math.max(2, Math.floor(w / 2 - 20)),
			top: 2,
		});
		this.container.add(this.title);

		// Subtitle
		this.subtitle = new TextRenderable(renderer, {
			id: "input-subtitle",
			content: "✦ Terminal Dream Engine ✦",
			fg: RGBA.fromHex("#666699"),
			position: "absolute",
			left: Math.max(2, Math.floor(w / 2 - 12)),
			top: 6,
		});
		this.container.add(this.subtitle);

		// Input box frame
		const inputBoxWidth = Math.min(60, w - 6);
		this.inputBox = new BoxRenderable(renderer, {
			id: "input-frame",
			width: inputBoxWidth,
			height: 5,
			position: "absolute",
			left: Math.max(2, Math.floor(w / 2 - inputBoxWidth / 2)),
			top: 8,
			border: true,
			borderColor: "#7744aa",
			title: " Describe your dream ",
			titleAlignment: "center",
			backgroundColor: "#0a0a14",
		});
		this.container.add(this.inputBox);

		// Text input field
		this.input = new InputRenderable(renderer, {
			id: "dream-input",
			width: inputBoxWidth - 4,
			focusedBackgroundColor: "#0a0a14",
			position: "absolute",
			left: Math.max(4, Math.floor(w / 2 - inputBoxWidth / 2) + 2),
			top: 10,
		});
		this.container.add(this.input);

		// Hint text (moved from placeholder)
		this.hintText = new TextRenderable(renderer, {
			id: "input-hint",
			content: "e.g. I was falling through infinite mirrors...",
			fg: RGBA.fromHex("#555577"),
			position: "absolute",
			left: Math.max(4, Math.floor(w / 2 - inputBoxWidth / 2) + 2),
			top: 13,
		});
		this.container.add(this.hintText);

		// Status text
		this.statusText = new TextRenderable(renderer, {
			id: "input-status",
			content: "",
			fg: RGBA.fromHex("#ff6699"),
			position: "absolute",
			left: Math.max(4, Math.floor(w / 2 - inputBoxWidth / 2) + 2),
			top: 15,
		});
		this.container.add(this.statusText);

		// Instructions
		this.instructions = new TextRenderable(renderer, {
			id: "input-instructions",
			content: "[Enter] Dream  ·  [Ctrl+S] Settings  ·  [Ctrl+C] Quit",
			fg: RGBA.fromHex("#444466"),
			position: "absolute",
			left: Math.max(2, Math.floor(w / 2 - 27)),
			top: h - 3,
		});
		this.container.add(this.instructions);

		// Focus the input
		this.input.focus();

		// Handle input submission
		this.input.on(InputRenderableEvents.CHANGE, (value: string) => {
			this.dreamText = value;
			if (this.dreamText.trim().length > 0 && !this.isLoading) {
				this.emit({ type: "submit", text: this.dreamText.trim() });
			}
		});

		// Handle keyboard shortcuts
		this.keyHandler = (key: KeyEvent) => {
			if (key.ctrl && key.name === "s") {
				this.emit({ type: "open-settings" });
			}
		};
		renderer.keyInput.on("keypress", this.keyHandler);
	}

	onResize(width: number, height: number): void {
		if (!this.container) return;

		// Update Title
		if (this.title) {
			this.title.left = Math.max(2, Math.floor(width / 2 - 20));
		}

		// Update Subtitle
		if (this.subtitle) {
			this.subtitle.left = Math.max(2, Math.floor(width / 2 - 12));
		}

		const inputBoxWidth = Math.min(60, width - 6);

		// Update Input Frame
		if (this.inputBox) {
			this.inputBox.width = inputBoxWidth;
			this.inputBox.left = Math.max(
				2,
				Math.floor(width / 2 - inputBoxWidth / 2),
			);
		}

		// Update Input Field
		if (this.input) {
			this.input.width = inputBoxWidth - 4;
			this.input.left = Math.max(
				4,
				Math.floor(width / 2 - inputBoxWidth / 2) + 2,
			);
		}

		// Update Hint Text
		if (this.hintText) {
			this.hintText.left = Math.max(
				4,
				Math.floor(width / 2 - inputBoxWidth / 2) + 2,
			);
		}

		// Update Status Text
		if (this.statusText) {
			this.statusText.left = Math.max(
				4,
				Math.floor(width / 2 - inputBoxWidth / 2) + 2,
			);
		}

		// Update Instructions
		if (this.instructions) {
			this.instructions.left = Math.max(2, Math.floor(width / 2 - 27));
			this.instructions.top = height - 3;
		}
	}

	setStatus(message: string, isError = false): void {
		if (this.statusText) {
			this.statusText.content = message;
			this.statusText.fg = isError
				? RGBA.fromHex("#ff4444")
				: RGBA.fromHex("#44ff88");
		}
	}

	setLoading(loading: boolean, message?: string): void {
		this.isLoading = loading;
		if (loading) {
			this.setStatus(message ?? "⟳ Processing your dream...");
		}
	}

	detach(renderer: CliRenderer): void {
		if (this.keyHandler) {
			renderer.keyInput.off("keypress", this.keyHandler);
			this.keyHandler = null;
		}
		if (this.container) {
			this.container.destroyRecursively();
			this.container = null;
		}
		this.input = null;
		this.statusText = null;
		this.title = null;
		this.subtitle = null;
		this.inputBox = null;
		this.hintText = null;
		this.instructions = null;
		this.dreamText = "";
		this.isLoading = false;
	}
}
