/**
 * A 2D character grid that serves as the compositing surface
 * for all render layers before being flushed to the terminal buffer.
 *
 * Each cell holds a character and foreground/background color indices.
 */
export class Grid {
	private readonly cells: string[];
	private readonly fgColors: string[];
	private readonly bgColors: string[];

	readonly width: number;
	readonly height: number;

	constructor(width: number, height: number) {
		this.width = width;
		this.height = height;
		const size = width * height;
		this.cells = new Array<string>(size).fill(" ");
		this.fgColors = new Array<string>(size).fill("#888888");
		this.bgColors = new Array<string>(size).fill("#000000");
	}

	private index(x: number, y: number): number {
		return y * this.width + x;
	}

	private inBounds(x: number, y: number): boolean {
		return x >= 0 && x < this.width && y >= 0 && y < this.height;
	}

	setCell(x: number, y: number, char: string, fg?: string, bg?: string): void {
		if (!this.inBounds(x, y)) return;
		const i = this.index(x, y);
		this.cells[i] = char;
		if (fg) this.fgColors[i] = fg;
		if (bg) this.bgColors[i] = bg;
	}

	getCell(x: number, y: number): { char: string; fg: string; bg: string } {
		if (!this.inBounds(x, y))
			return { char: " ", fg: "#888888", bg: "#000000" };
		const i = this.index(x, y);
		return {
			char: this.cells[i] ?? " ",
			fg: this.fgColors[i] ?? "#888888",
			bg: this.bgColors[i] ?? "#000000",
		};
	}

	clear(char = " ", fg = "#888888", bg = "#000000"): void {
		this.cells.fill(char);
		this.fgColors.fill(fg);
		this.bgColors.fill(bg);
	}

	/**
	 * Fill a rectangular region with a character.
	 */
	fillRect(
		x0: number,
		y0: number,
		w: number,
		h: number,
		char: string,
		fg?: string,
		bg?: string,
	): void {
		for (let y = y0; y < y0 + h; y++) {
			for (let x = x0; x < x0 + w; x++) {
				this.setCell(x, y, char, fg, bg);
			}
		}
	}
}
