import type { CliRenderer } from "@opentui/core";
import {
	ASCIIFontRenderable,
	BoxRenderable,
	RGBA,
	TextRenderable,
} from "@opentui/core";
import type { TUIScreen } from "./TUIScreen.ts";

type LoadingTitleMode = {
	readonly font: "huge" | "block" | "slick" | "tiny";
};

const GLITCH_CHARS = [
	"█",
	"▓",
	"▒",
	"░",
	"╳",
	"┼",
	"#",
	"%",
	"&",
	"@",
	"/",
	"\\",
	"=",
	"+",
	"*",
	":",
	";",
	"~",
];
const GLITCH_COLORS = ["#ff315c", "#ff8a00", "#8cff4f", "#f6f1d1", "#7d6bff"];
const RING_GLYPHS = ["◣", "◢", "◥", "◤", "█", "▓", "╳", "#", "@", "%"];

export class LoadingScreen implements TUIScreen {
	private static readonly LOADING_TITLE_MODES: readonly LoadingTitleMode[] = [
		{ font: "huge" },
		{ font: "block" },
		{ font: "slick" },
		{ font: "tiny" },
	];

	private renderer: CliRenderer | null = null;
	private container: BoxRenderable | null = null;
	private backgroundRows: TextRenderable[] = [];
	private loadingTitle: ASCIIFontRenderable | null = null;
	private loadingTitleFallback: TextRenderable | null = null;
	private footerText: TextRenderable | null = null;
	private ringGlyphs: TextRenderable[] = [];
	private sideRunes: TextRenderable[] = [];
	private timer: Timer | null = null;
	private animationToken = 0;
	private tick = 0;
	private width = 0;
	private height = 0;

	attach(renderer: CliRenderer): void {
		this.renderer = renderer;
		this.width = renderer.terminalWidth;
		this.height = renderer.terminalHeight;

		this.container = new BoxRenderable(renderer, {
			id: "loading-screen",
			width: "100%",
			height: "100%",
			zIndex: 150,
			backgroundColor: "#050102",
		});
		renderer.root.add(this.container);

		this.loadingTitle = new ASCIIFontRenderable(renderer, {
			id: "loading-title",
			text: "LOADING",
			font: "tiny",
			color: RGBA.fromHex("#f6f1d1"),
			position: "absolute",
			left: 0,
			top: 0,
			zIndex: 153,
		});
		this.container.add(this.loadingTitle);

		this.loadingTitleFallback = new TextRenderable(renderer, {
			id: "loading-title-fallback",
			content: "LOADING",
			fg: RGBA.fromHex("#f6f1d1"),
			attributes: 1,
			position: "absolute",
			left: 0,
			top: 0,
			zIndex: 153,
		});
		this.container.add(this.loadingTitleFallback);

		this.footerText = new TextRenderable(renderer, {
			id: "loading-footer",
			content: "input locked until the feed answers or collapses",
			fg: RGBA.fromHex("#5d5146"),
			position: "absolute",
			left: 1,
			top: 0,
			zIndex: 151,
		});
		this.container.add(this.footerText);

		this.syncBackgroundRows();

		for (let i = 0; i < 24; i++) {
			const glyph = new TextRenderable(renderer, {
				id: `loading-ring-${i}`,
				content: RING_GLYPHS[i % RING_GLYPHS.length] ?? "#",
				fg: RGBA.fromHex(GLITCH_COLORS[i % GLITCH_COLORS.length] ?? "#ff315c"),
				position: "absolute",
				left: 0,
				top: 0,
				zIndex: 152,
			});
			this.ringGlyphs.push(glyph);
			this.container.add(glyph);
		}

		for (let i = 0; i < 10; i++) {
			const rune = new TextRenderable(renderer, {
				id: `loading-rune-${i}`,
				content: "",
				fg: RGBA.fromHex("#7d6bff"),
				position: "absolute",
				left: 0,
				top: 0,
				zIndex: 152,
			});
			this.sideRunes.push(rune);
			this.container.add(rune);
		}

		this.layout();
		this.startAnimation();
	}

	onResize(width: number, height: number): void {
		this.width = width;
		this.height = height;
		this.syncBackgroundRows();
		this.layout();
	}

	detach(_renderer: CliRenderer): void {
		this.stopAnimation();
		if (this.container) {
			this.container.destroyRecursively();
			this.container = null;
		}
		this.backgroundRows = [];
		this.loadingTitle = null;
		this.loadingTitleFallback = null;
		this.footerText = null;
		this.ringGlyphs = [];
		this.sideRunes = [];
		this.renderer = null;
	}

	setPhase(_phase: string): void {}

	setError(message: string): void {
		if (this.footerText) {
			this.footerText.content = `feed collapsed // ${message}`;
			this.footerText.fg = RGBA.fromHex("#ff8a00");
		}
	}

	private startAnimation(): void {
		this.stopAnimation();
		const token = ++this.animationToken;
		this.timer = setInterval(() => {
			if (
				token !== this.animationToken ||
				!this.container ||
				this.container.isDestroyed
			) {
				return;
			}

			this.tick += 1;
			this.updateBackgroundRows();
			this.updateRingField();
			this.updateSideRunes();
		}, 90);
	}

	private stopAnimation(): void {
		this.animationToken += 1;
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}

	private syncBackgroundRows(): void {
		if (!this.renderer || !this.container || this.container.isDestroyed) {
			return;
		}

		while (this.backgroundRows.length > this.height) {
			const row = this.backgroundRows.pop();
			if (row && !row.isDestroyed) {
				row.destroy();
			}
		}

		for (let y = this.backgroundRows.length; y < this.height; y++) {
			const row = new TextRenderable(this.renderer, {
				id: `loading-row-${y}`,
				content: "",
				fg: RGBA.fromHex("#2b1116"),
				position: "absolute",
				left: 0,
				top: y,
				zIndex: 150,
			});
			this.backgroundRows.push(row);
			this.container.add(row);
		}
	}

	private layout(): void {
		const centerY = Math.floor(this.height / 2);
		const titleMode = this.getLoadingTitleMode();
		const useFallback = titleMode === null;

		if (this.loadingTitle) {
			this.loadingTitle.text = useFallback ? "" : "LOADING";
			if (titleMode) {
				this.loadingTitle.font = titleMode.font;
				const titleWidth = this.loadingTitle.frameBuffer.width;
				const titleHeight = this.loadingTitle.frameBuffer.height;
				this.loadingTitle.left = this.getCenteredTitleLeft(titleWidth);
				this.loadingTitle.top = this.getCenteredTitleTop(titleHeight);
			}
		}

		if (this.loadingTitleFallback) {
			this.loadingTitleFallback.content = useFallback ? "LOADING" : "";
			this.loadingTitleFallback.left = this.getCenteredTitleLeft(
				useFallback ? 7 : 0,
			);
			this.loadingTitleFallback.top = this.getCenteredTitleTop(1);
		}

		if (this.footerText) {
			this.footerText.left = Math.max(2, Math.floor((this.width - 46) / 2));
			this.footerText.top = Math.max(centerY + 7, this.height - 4);
		}
		for (let y = 0; y < this.backgroundRows.length; y++) {
			const row = this.backgroundRows[y];
			if (!row || row.isDestroyed) continue;
			row.top = y;
			row.left = 0;
		}

		this.updateBackgroundRows();
		this.updateRingField();
		this.updateSideRunes();
	}

	private updateBackgroundRows(): void {
		for (let y = 0; y < this.backgroundRows.length; y++) {
			const row = this.backgroundRows[y];
			if (!row || row.isDestroyed) continue;

			let line = "";
			for (let x = 0; x < this.width; x++) {
				const scan = Math.sin(y * 0.65 + this.tick * 0.12) * 0.5 + 0.5;
				const tear = Math.sin(x * 0.18 + this.tick * 0.35 + y * 0.04);
				const phase = Math.sin(x * 0.09 + y * 0.23 + this.tick * 0.16 + 17);
				const noise =
					Math.sin(x * 12.13 + y * 3.17 + this.tick * 1.9) * 43758.5453;
				const frac = noise - Math.floor(noise);

				let char = " ";
				if (Math.abs(y - Math.floor(this.height / 2)) < 3 && frac > 0.74) {
					char = GLITCH_CHARS[(x + y + this.tick) % GLITCH_CHARS.length] ?? "#";
				} else if (scan > 0.82 && frac > 0.55) {
					char = x % 2 === 0 ? "█" : "▓";
				} else if (tear > 0.9) {
					char = x % 3 === 0 ? "/" : "\\";
				} else if (phase > 0.72 && frac > 0.46) {
					char =
						GLITCH_CHARS[(Math.floor(frac * 100) + x) % GLITCH_CHARS.length] ??
						"░";
				} else if (frac > 0.92) {
					char = ".";
				}
				line += char;
			}

			row.content = line;
			const band = Math.sin(y * 0.7 + this.tick * 0.2) * 0.5 + 0.5;
			const color =
				band > 0.8 ? "#5c1a28" : band > 0.58 ? "#2b1116" : "#17080b";
			row.fg = RGBA.fromHex(color);
		}
	}

	private getCenteredTitleLeft(titleWidth: number): number {
		return Math.max(2, Math.floor((this.width - titleWidth) / 2));
	}

	private getCenteredTitleTop(titleHeight: number): number {
		return Math.max(2, Math.floor((this.height - titleHeight) / 2));
	}

	private getLoadingTitleMode(): LoadingTitleMode | null {
		if (!this.loadingTitle) {
			return null;
		}

		for (const mode of LoadingScreen.LOADING_TITLE_MODES) {
			this.loadingTitle.font = mode.font;
			this.loadingTitle.text = "LOADING";

			if (
				this.loadingTitle.frameBuffer.width <= Math.max(1, this.width - 4) &&
				this.loadingTitle.frameBuffer.height <= Math.max(1, this.height - 6)
			) {
				return mode;
			}
		}

		return null;
	}

	private updateRingField(): void {
		const centerX = Math.floor(this.width / 2);
		const centerY = Math.floor(this.height / 2);
		const baseRadiusX = Math.max(16, Math.floor(this.width * 0.28));
		const baseRadiusY = Math.max(7, Math.floor(this.height * 0.22));

		for (let i = 0; i < this.ringGlyphs.length; i++) {
			const glyph = this.ringGlyphs[i];
			if (!glyph || glyph.isDestroyed) continue;

			const angle =
				(Math.PI * 2 * i) / this.ringGlyphs.length + this.tick * 0.04;
			const wobble = Math.sin(this.tick * 0.07 + i * 1.7) * 5;
			const radialPulse = Math.sin(this.tick * 0.11 + i * 0.4) * 3;
			glyph.left = Math.max(
				1,
				Math.floor(
					centerX + Math.cos(angle) * (baseRadiusX + wobble + radialPulse),
				),
			);
			glyph.top = Math.max(
				2,
				Math.floor(centerY + Math.sin(angle) * (baseRadiusY + wobble * 0.4)),
			);
			glyph.content = RING_GLYPHS[(i + this.tick) % RING_GLYPHS.length] ?? "#";
			glyph.fg = RGBA.fromHex(
				GLITCH_COLORS[(Math.floor(this.tick / 2) + i) % GLITCH_COLORS.length] ??
					"#ff315c",
			);
		}
	}

	private updateSideRunes(): void {
		for (let i = 0; i < this.sideRunes.length; i++) {
			const rune = this.sideRunes[i];
			if (!rune || rune.isDestroyed) continue;

			const leftSide = i < this.sideRunes.length / 2;
			const lane = leftSide ? 2 : Math.max(2, this.width - 10);
			const localIndex = leftSide
				? i
				: i - Math.floor(this.sideRunes.length / 2);
			const travel =
				(this.tick * 2 + localIndex * 5) % Math.max(8, this.height - 6);
			const charIndex = (this.tick + i * 3) % GLITCH_CHARS.length;

			rune.left = lane + Math.floor(Math.sin(this.tick * 0.08 + i) * 2);
			rune.top = 3 + travel;
			rune.content = `${GLITCH_CHARS[charIndex] ?? "#"}${GLITCH_CHARS[(charIndex + 5) % GLITCH_CHARS.length] ?? "#"}`;
			rune.fg = RGBA.fromHex(
				GLITCH_COLORS[
					(localIndex + Math.floor(this.tick / 3)) % GLITCH_COLORS.length
				] ?? "#7d6bff",
			);
		}
	}
}
