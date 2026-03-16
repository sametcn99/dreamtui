import type { CliRenderer, KeyEvent } from "@opentui/core";
import {
	ASCIIFontRenderable,
	BoxRenderable,
	RGBA,
	type KeyBinding as TextareaKeyBinding,
	TextareaRenderable,
	TextRenderable,
} from "@opentui/core";
import type { TUIScreen } from "./TUIScreen.ts";

interface InputScreenState {
	readonly initialText?: string;
	readonly initialStatus?: {
		readonly message: string;
		readonly isError?: boolean;
	};
}

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
	private static readonly TITLE_WIDTH = 28;
	private static readonly MIN_INPUT_LINES = 3;
	private static readonly MAX_INPUT_LINES = 8;
	private static readonly INPUT_BOX_TOP = 8;
	private static readonly INPUT_TOP_PADDING = 2;
	private static readonly INPUT_SIDE_PADDING = 2;
	private static readonly BOX_CHROME_HEIGHT = 3;
	private static readonly DREAM_TEXTAREA_KEYBINDINGS: TextareaKeyBinding[] = [
		{ name: "return", action: "submit" },
		{ name: "linefeed", action: "submit" },
		{ name: "return", shift: true, action: "newline" },
		{ name: "linefeed", shift: true, action: "newline" },
	];

	private container: BoxRenderable | null = null;
	private input: TextareaRenderable | null = null;
	private statusText: TextRenderable | null = null;
	private keyHandler: ((key: KeyEvent) => void) | null = null;
	private handlers: InputScreenHandler[] = [];
	private dreamText = "";
	private isLoading = false;
	private viewportWidth = 0;

	// UI Elements tracked for resize updates
	private title: ASCIIFontRenderable | null = null;
	private subtitle: TextRenderable | null = null;
	private inputBox: BoxRenderable | null = null;
	private hintText: TextRenderable | null = null;
	private instructions: TextRenderable | null = null;
	private readonly initialText: string;
	private readonly initialStatus?: {
		readonly message: string;
		readonly isError?: boolean;
	};

	constructor(state?: InputScreenState) {
		this.initialText = state?.initialText ?? "";
		this.initialStatus = state?.initialStatus;
		this.dreamText = this.initialText;
	}

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
		this.viewportWidth = w;

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
			color: RGBA.fromHex("#ff315c"),
			position: "absolute",
			left: this.getCenteredTitleLeft(w),
			top: 2,
		});
		this.container.add(this.title);

		// Subtitle
		this.subtitle = new TextRenderable(renderer, {
			id: "input-subtitle",
			content: "signal rot engine // feed it a scene worth breaking",
			fg: RGBA.fromHex("#9e8f7a"),
			position: "absolute",
			left: Math.max(2, Math.floor(w / 2 - 28)),
			top: 6,
		});
		this.container.add(this.subtitle);

		// Input box frame
		this.inputBox = new BoxRenderable(renderer, {
			id: "input-frame",
			width: Math.min(60, w - 6),
			height: InputScreen.MIN_INPUT_LINES + InputScreen.BOX_CHROME_HEIGHT,
			position: "absolute",
			left: 2,
			top: InputScreen.INPUT_BOX_TOP,
			border: true,
			borderColor: "#7a1212",
			title: " INJECT A NIGHTMARE ",
			titleAlignment: "center",
			backgroundColor: "#12070a",
		});
		this.container.add(this.inputBox);

		// Text input field
		this.input = new TextareaRenderable(renderer, {
			id: "dream-input",
			width: Math.min(60, w - 6) - InputScreen.INPUT_SIDE_PADDING * 2,
			height: InputScreen.MIN_INPUT_LINES,
			wrapMode: "word",
			backgroundColor: "#12070a",
			textColor: "#f3e6d3",
			focusedBackgroundColor: "#12070a",
			focusedTextColor: "#fff2d6",
			placeholder:
				"Describe the scene. Enter ruptures the signal. Shift+Enter digs deeper.",
			placeholderColor: "#5d5146",
			keyBindings: InputScreen.DREAM_TEXTAREA_KEYBINDINGS,
			position: "absolute",
			left: 4,
			top: InputScreen.INPUT_BOX_TOP + InputScreen.INPUT_TOP_PADDING,
			onSubmit: () => {
				this.submitDream();
			},
		});
		this.container.add(this.input);
		if (this.initialText) {
			this.input.setText(this.initialText);
			this.input.cursorOffset = this.initialText.length;
		}
		this.input.onContentChange = () => {
			this.dreamText = this.input?.plainText ?? "";
			this.syncInputLayout();
		};

		// Hint text (moved from placeholder)
		this.hintText = new TextRenderable(renderer, {
			id: "input-hint",
			content: "Enter submits  ·  Shift+Enter opens another wound in the text",
			fg: RGBA.fromHex("#74655a"),
			position: "absolute",
			left: 4,
			top: 14,
		});
		this.container.add(this.hintText);

		// Status text
		this.statusText = new TextRenderable(renderer, {
			id: "input-status",
			content: "",
			fg: RGBA.fromHex("#ff315c"),
			position: "absolute",
			left: 4,
			top: 16,
		});
		this.container.add(this.statusText);

		// Instructions
		this.instructions = new TextRenderable(renderer, {
			id: "input-instructions",
			content:
				"[Enter] rupture  ·  [Ctrl+S] ritual config  ·  [Ctrl+C] cut power",
			fg: RGBA.fromHex("#4f463d"),
			position: "absolute",
			left: Math.max(2, Math.floor(w / 2 - 34)),
			top: h - 3,
		});
		this.container.add(this.instructions);
		this.syncInputLayout();
		if (this.initialStatus) {
			this.setStatus(
				this.initialStatus.message,
				this.initialStatus.isError ?? false,
			);
		}

		// Focus the input
		this.input.focus();

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
		this.viewportWidth = width;

		// Update Title
		if (this.title) {
			this.title.left = this.getCenteredTitleLeft(width);
		}

		// Update Subtitle
		if (this.subtitle) {
			this.subtitle.left = Math.max(2, Math.floor(width / 2 - 28));
		}
		this.syncInputLayout();

		// Update Instructions
		if (this.instructions) {
			this.instructions.left = Math.max(2, Math.floor(width / 2 - 34));
			this.instructions.top = height - 3;
		}
	}

	setStatus(message: string, isError = false): void {
		if (this.statusText) {
			this.statusText.content = message;
			this.statusText.fg = isError
				? RGBA.fromHex("#ff315c")
				: RGBA.fromHex("#8cff4f");
		}
	}

	setLoading(loading: boolean, message?: string): void {
		this.isLoading = loading;
		if (loading) {
			this.setStatus(message ?? "⟳ destabilizing dream signal...");
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

	private getCenteredTitleLeft(width: number): number {
		return Math.max(2, Math.floor((width - InputScreen.TITLE_WIDTH) / 2));
	}

	private submitDream(): void {
		const text = this.input?.plainText.trim() ?? this.dreamText.trim();
		this.dreamText = this.input?.plainText ?? this.dreamText;

		if (this.isLoading) return;
		if (!text) {
			this.setStatus("inject something first", true);
			return;
		}

		this.emit({ type: "submit", text });
	}

	private syncInputLayout(): void {
		const inputBoxWidth = Math.min(60, this.viewportWidth - 6);
		const boxLeft = Math.max(
			2,
			Math.floor(this.viewportWidth / 2 - inputBoxWidth / 2),
		);
		const inputLeft = boxLeft + InputScreen.INPUT_SIDE_PADDING;
		const inputWidth = Math.max(
			12,
			inputBoxWidth - InputScreen.INPUT_SIDE_PADDING * 2,
		);
		const inputHeight = this.getDesiredInputHeight(inputWidth);
		const boxHeight = inputHeight + InputScreen.BOX_CHROME_HEIGHT;
		const hintTop = InputScreen.INPUT_BOX_TOP + boxHeight + 1;
		const statusTop = hintTop + 2;

		if (this.inputBox) {
			this.inputBox.width = inputBoxWidth;
			this.inputBox.height = boxHeight;
			this.inputBox.left = boxLeft;
		}

		if (this.input) {
			this.input.width = inputWidth;
			this.input.height = inputHeight;
			this.input.left = inputLeft;
			this.input.top =
				InputScreen.INPUT_BOX_TOP + InputScreen.INPUT_TOP_PADDING;
		}

		if (this.hintText) {
			this.hintText.left = inputLeft;
			this.hintText.top = hintTop;
		}

		if (this.statusText) {
			this.statusText.left = inputLeft;
			this.statusText.top = statusTop;
		}
	}

	private getDesiredInputHeight(inputWidth: number): number {
		const visualLines = this.countWrappedLines(this.dreamText, inputWidth);
		return Math.max(
			InputScreen.MIN_INPUT_LINES,
			Math.min(InputScreen.MAX_INPUT_LINES, visualLines),
		);
	}

	private countWrappedLines(text: string, width: number): number {
		if (width <= 1) {
			return InputScreen.MIN_INPUT_LINES;
		}

		if (!text) {
			return 1;
		}

		const paragraphs = text.replace(/\r/g, "").split("\n");
		let lines = 0;

		for (const paragraph of paragraphs) {
			if (paragraph.length === 0) {
				lines += 1;
				continue;
			}

			let remaining = paragraph;
			while (remaining.length > 0) {
				if (remaining.length <= width) {
					lines += 1;
					break;
				}

				const slice = remaining.slice(0, width + 1);
				let breakIndex = slice.lastIndexOf(" ");
				if (breakIndex <= 0) {
					breakIndex = width;
				}

				remaining = remaining.slice(breakIndex).trimStart();
				lines += 1;
			}
		}

		return lines;
	}
}
