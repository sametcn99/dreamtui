import type { CliRenderer } from "@opentui/core";

/**
 * Shared interface for all TUI screens.
 * Supports attach/detach lifecycle for clean screen switching.
 */
export interface TUIScreen {
	/** Mount this screen's renderables onto the renderer root */
	attach(renderer: CliRenderer): void;

	/** Remove this screen's renderables and clean up listeners */
	detach(renderer: CliRenderer): void;

	/** Optional: Handle terminal resize events to adjust layout */
	onResize?(width: number, height: number): void;
}
