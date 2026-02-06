import type { CliRenderer } from "@opentui/core";
import { createCliRenderer } from "@opentui/core";
import { DreamBooster } from "../ai/DreamBooster.ts";
import { DreamInterpreter } from "../ai/DreamInterpreter.ts";
import {
	createProvider,
	validateProvider,
} from "../ai/providers/ProviderFactory.ts";
import { Engine } from "../core/Engine.ts";
import { ConfigStore } from "../infrastructure/ConfigStore.ts";
import { InputScreen } from "../tui/InputScreen.ts";
import { MainScreen } from "../tui/MainScreen.ts";
import { SettingsScreen } from "../tui/SettingsScreen.ts";
import type { TUIScreen } from "../tui/TUIScreen.ts";

type AppScreen = "input" | "main" | "settings";

/**
 * DreamTUIApp — Top-level application orchestrator.
 *
 * Manages screen transitions, wires up the AI pipeline, and
 * coordinates the full dream lifecycle:
 *   Input → Boost Prompt → Generate ASCII Art + Params → Animate → Controls
 *
 * Two-stage AI pipeline:
 *   1. DreamBooster: raw dream text → vivid visual description
 *   2. DreamInterpreter: vivid description → ASCII art + animation parameters
 */
export class DreamTUIApp {
	private renderer!: CliRenderer;
	private configStore!: ConfigStore;
	private engine!: Engine;

	private activeScreen: TUIScreen | null = null;

	async run(): Promise<void> {
		// Load persisted user config
		this.configStore = await ConfigStore.load();

		// Create the OpenTUI renderer
		this.renderer = await createCliRenderer({
			exitOnCtrlC: true,
			targetFps: 30,
		});
		this.renderer.start();
		this.renderer.setBackgroundColor("#050510");

		// Handle resize
		this.renderer.on("resize", (w, h) => {
			if (this.activeScreen?.onResize) {
				this.activeScreen.onResize(w, h);
			}
		});

		// Create the animation engine
		this.engine = new Engine(this.renderer, this.configStore.getAnimationFps());

		// Start on the input screen
		this.showScreen("input");
	}

	// --- Screen Management ---

	private showScreen(name: AppScreen): void {
		// Detach current screen
		if (this.activeScreen) {
			this.activeScreen.detach(this.renderer);
			this.activeScreen = null;
		}

		this.currentScreenName = name;

		switch (name) {
			case "input":
				this.showInputScreen();
				break;
			case "settings":
				this.showSettingsScreen();
				break;
			case "main":
				// main screen is shown by startDream
				break;
		}
	}

	private showInputScreen(): void {
		const screen = new InputScreen();

		screen.onEvent(async (event) => {
			switch (event.type) {
				case "submit":
					await this.onDreamSubmit(screen, event.text);
					break;
				case "open-settings":
					this.showScreen("settings");
					break;
			}
		});

		screen.attach(this.renderer);
		this.activeScreen = screen;
	}

	private showSettingsScreen(): void {
		const screen = new SettingsScreen(this.configStore.get());

		screen.onEvent(async (event) => {
			switch (event.type) {
				case "save":
					await this.configStore.update(event.config);
					this.showScreen("input");
					break;
				case "back":
					this.showScreen("input");
					break;
			}
		});

		screen.attach(this.renderer);
		this.activeScreen = screen;
	}

	private showMainScreen(): void {
		const screen = new MainScreen();

		screen.onEvent((event) => {
			switch (event.type) {
				case "pause":
					if (this.engine.isPaused()) {
						this.engine.resume();
						screen.setStatus("running");
					} else {
						this.engine.pause();
						screen.setStatus("paused");
					}
					break;
				case "restart":
					this.engine.restart();
					screen.setStatus("running");
					break;
				case "exit":
					this.engine.stop();
					this.showScreen("input");
					break;
			}
		});

		// Update HUD when engine state changes
		this.engine.onEvent((event) => {
			if (event.type === "state-change") {
				screen.setStatus(event.state);
			}
		});

		screen.attach(this.renderer);
		this.activeScreen = screen;
		this.currentScreenName = "main";
	}

	// --- Dream Pipeline (Two-Stage AI) ---

	private async onDreamSubmit(
		screen: InputScreen,
		dreamText: string,
	): Promise<void> {
		// Validate provider config
		const validation = validateProvider(this.configStore.get());
		if (!validation.valid) {
			screen.setStatus(validation.error ?? "Invalid configuration", true);
			return;
		}

		screen.setLoading(true, "✦ Enhancing your dream...");

		try {
			// Create the AI provider from config
			const provider = createProvider(this.configStore.get());

			// ── Stage 1: Boost the dream prompt ──
			const booster = new DreamBooster(provider);
			const boostedText = await booster.boost(dreamText);

			// Update loading status for stage 2
			screen.setLoading(true, "✦ Creating ASCII visualization...");

			// ── Stage 2: Generate ASCII art + animation parameters ──
			const interpreter = new DreamInterpreter(provider);
			const spec = await interpreter.interpret(boostedText);

			// Transition to animation
			screen.setLoading(false);
			this.showScreen("main");
			this.showMainScreen();
			this.engine.startDream(spec, dreamText);
		} catch (error) {
			screen.setLoading(false);
			const message =
				error instanceof Error ? error.message : "Unknown error occurred";
			screen.setStatus(`Error: ${message}`, true);
		}
	}

	// --- Cleanup ---

	async destroy(): Promise<void> {
		this.engine?.destroy();
		if (this.activeScreen) {
			this.activeScreen.detach(this.renderer);
		}
		this.renderer?.destroy();
	}
}
