import type { CliRenderer, KeyEvent } from "@opentui/core";
import {
	BoxRenderable,
	InputRenderable,
	InputRenderableEvents,
	RGBA,
	SelectRenderable,
	SelectRenderableEvents,
	TextRenderable,
} from "@opentui/core";
import {
	getPreset,
	PROVIDER_PRESETS,
} from "../ai/providers/ProviderPresets.ts";
import type { AppConfig } from "../infrastructure/ConfigStore.ts";
import type { TUIScreen } from "./TUIScreen.ts";

export type SettingsScreenEvent =
	| { type: "save"; config: Partial<AppConfig> }
	| { type: "back" };

type SettingsScreenHandler = (event: SettingsScreenEvent) => void;

/**
 * Settings Screen
 *
 * Allows the user to select a provider from a list,
 * configure API key, base URL, model, and save.
 */
export class SettingsScreen implements TUIScreen {
	private container: BoxRenderable | null = null;
	private keyHandler: ((key: KeyEvent) => void) | null = null;
	private handlers: SettingsScreenHandler[] = [];
	private currentConfig: AppConfig;

	// Widgets
	private providerSelect: SelectRenderable | null = null;
	private apiKeyInput: InputRenderable | null = null;
	private baseUrlInput: InputRenderable | null = null;
	private modelInput: InputRenderable | null = null;
	private infoText: TextRenderable | null = null;
	private providerInfoText: TextRenderable | null = null;
	private urlInfoText: TextRenderable | null = null;

	// Static UI Elements tracked for resize updates
	private title: TextRenderable | null = null;
	private sep: TextRenderable | null = null;
	private providerLabel: TextRenderable | null = null;
	private apiKeyLabel: TextRenderable | null = null;
	private baseUrlLabel: TextRenderable | null = null;
	private modelLabel: TextRenderable | null = null;
	private instructions: TextRenderable | null = null;

	// State
	private selectedProviderId: string;
	private apiKeyValue = "";
	private baseUrlValue = "";
	private modelValue = "";

	/** 0 = provider select, 1 = api key, 2 = base url, 3 = model */
	private focusedFieldIndex = 0;

	constructor(config: AppConfig) {
		this.currentConfig = config;
		this.selectedProviderId = config.provider;
		this.apiKeyValue = config.apiKey;
		this.baseUrlValue = config.apiBaseUrl;
		this.modelValue = config.model;
	}

	onEvent(handler: SettingsScreenHandler): void {
		this.handlers.push(handler);
	}

	private emit(event: SettingsScreenEvent): void {
		for (const handler of this.handlers) {
			handler(event);
		}
	}

	attach(renderer: CliRenderer): void {
		const w = renderer.terminalWidth;
		const h = renderer.terminalHeight;
		const panelWidth = Math.min(60, w - 4);
		const leftOffset = Math.max(2, Math.floor(w / 2 - panelWidth / 2));

		this.container = new BoxRenderable(renderer, {
			id: "settings-screen",
			width: "100%",
			height: "100%",
			flexDirection: "column",
			zIndex: 100,
		});
		renderer.root.add(this.container);

		// Title
		this.title = new TextRenderable(renderer, {
			id: "settings-title",
			content: "⚙  Settings",
			fg: RGBA.fromHex("#9966ff"),
			attributes: 1,
			position: "absolute",
			left: leftOffset,
			top: 1,
		});
		this.container.add(this.title);

		// Separator
		this.sep = new TextRenderable(renderer, {
			id: "settings-sep",
			content: "─".repeat(panelWidth),
			fg: RGBA.fromHex("#333355"),
			position: "absolute",
			left: leftOffset,
			top: 2,
		});
		this.container.add(this.sep);

		let row = 4;

		// ── Provider Select ──
		this.providerLabel = new TextRenderable(renderer, {
			id: "lbl-provider",
			content: "Provider:",
			fg: RGBA.fromHex("#8888aa"),
			position: "absolute",
			left: leftOffset,
			top: row,
		});
		this.container.add(this.providerLabel);

		row++;
		const selectHeight = Math.min(PROVIDER_PRESETS.length * 2, h - 22, 12);
		const selectOptions = PROVIDER_PRESETS.map((p) => ({
			name: p.name,
			description: p.description,
			value: p.id,
		}));

		const currentIndex = PROVIDER_PRESETS.findIndex(
			(p) => p.id === this.selectedProviderId,
		);

		this.providerSelect = new SelectRenderable(renderer, {
			id: "select-provider",
			width: panelWidth - 2,
			height: selectHeight,
			options: selectOptions,
			selectedIndex: currentIndex >= 0 ? currentIndex : 0,
			showDescription: true,
			wrapSelection: true,
			backgroundColor: "#0a0a14",
			textColor: "#8888cc",
			focusedBackgroundColor: "#1a1a3a",
			focusedTextColor: "#ccccff",
			selectedBackgroundColor: "#2a1a4a",
			selectedTextColor: "#bb88ff",
			descriptionColor: "#555577",
			selectedDescriptionColor: "#9977cc",
			position: "absolute",
			left: leftOffset + 1,
			top: row,
		});
		this.container.add(this.providerSelect);

		// Listen for provider change via selection change
		// Note: We ignore the event args and pull the selected option directly
		// to avoid potential signature mismatches.
		this.providerSelect.on(SelectRenderableEvents.SELECTION_CHANGED, () => {
			const option = this.providerSelect?.getSelectedOption();
			if (option) {
				const id = option.value ?? "openai";
				this.onProviderChanged(id);
			}
		});

		// Also handle ITEM_SELECTED (pressing Enter)
		this.providerSelect.on(SelectRenderableEvents.ITEM_SELECTED, () => {
			const option = this.providerSelect?.getSelectedOption();
			if (option) {
				const id = option.value ?? "openai";
				this.onProviderChanged(id);
				this.cycleFields();
			}
		});

		row += selectHeight + 1;

		// ── API Key ──
		this.apiKeyLabel = new TextRenderable(renderer, {
			id: "lbl-apikey",
			content: "API Key:",
			fg: RGBA.fromHex("#8888aa"),
			position: "absolute",
			left: leftOffset,
			top: row,
		});
		this.container.add(this.apiKeyLabel);

		row++;
		this.apiKeyInput = new InputRenderable(renderer, {
			id: "input-apikey",
			width: panelWidth - 2,
			placeholder: "sk-...",
			value: this.apiKeyValue,
			focusedBackgroundColor: "#0a0a14",
			position: "absolute",
			left: leftOffset + 1,
			top: row,
		});
		this.container.add(this.apiKeyInput);

		row += 2;

		// ── Base URL ──
		this.baseUrlLabel = new TextRenderable(renderer, {
			id: "lbl-baseurl",
			content: "API Base URL:",
			fg: RGBA.fromHex("#8888aa"),
			position: "absolute",
			left: leftOffset,
			top: row,
		});
		this.container.add(this.baseUrlLabel);

		row++;
		this.baseUrlInput = new InputRenderable(renderer, {
			id: "input-baseurl",
			width: panelWidth - 2,
			placeholder: "https://api.openai.com/v1",
			value: this.baseUrlValue,
			focusedBackgroundColor: "#0a0a14",
			position: "absolute",
			left: leftOffset + 1,
			top: row,
		});
		this.container.add(this.baseUrlInput);

		row += 2;

		// ── Model ──
		this.modelLabel = new TextRenderable(renderer, {
			id: "lbl-model",
			content: "Model:",
			fg: RGBA.fromHex("#8888aa"),
			position: "absolute",
			left: leftOffset,
			top: row,
		});
		this.container.add(this.modelLabel);

		row++;
		this.modelInput = new InputRenderable(renderer, {
			id: "input-model",
			width: panelWidth - 2,
			placeholder: "gpt-4o-mini",
			value: this.modelValue,
			focusedBackgroundColor: "#0a0a14",
			position: "absolute",
			left: leftOffset + 1,
			top: row,
		});
		this.container.add(this.modelInput);

		row += 2;

		// ── Current config info ──
		this.infoText = new TextRenderable(renderer, {
			id: "settings-info",
			content: this.getApiKeyStatusText(),
			fg: this.currentConfig.apiKey
				? RGBA.fromHex("#44ff88")
				: RGBA.fromHex("#ff6644"),
			position: "absolute",
			left: leftOffset,
			top: row,
		});
		this.container.add(this.infoText);

		row++;
		this.providerInfoText = new TextRenderable(renderer, {
			id: "settings-provider",
			content: this.getProviderInfoText(),
			fg: RGBA.fromHex("#666688"),
			position: "absolute",
			left: leftOffset,
			top: row,
		});
		this.container.add(this.providerInfoText);

		row++;
		this.urlInfoText = new TextRenderable(renderer, {
			id: "settings-url",
			content: `URL: ${this.baseUrlValue || "(Default)"}`,
			fg: RGBA.fromHex("#666688"),
			position: "absolute",
			left: leftOffset,
			top: row,
		});
		this.container.add(this.urlInfoText);

		// Instructions
		this.instructions = new TextRenderable(renderer, {
			id: "settings-instructions",
			content: "[Tab] Next field  ·  [Ctrl+S] Save all  ·  [Esc] Back",
			fg: RGBA.fromHex("#444466"),
			position: "absolute",
			left: Math.max(2, Math.floor(w / 2 - 28)),
			top: h - 2,
		});
		this.container.add(this.instructions);

		// Focus the provider select first
		this.focusedFieldIndex = 0;
		this.providerSelect.focus();

		// Update placeholders based on initial selection
		const initialPreset = getPreset(this.selectedProviderId);
		if (initialPreset) {
			this.baseUrlInput.placeholder = initialPreset.baseUrl || "https://...";
			this.modelInput.placeholder = initialPreset.defaultModel || "model-name";
			this.apiKeyInput.placeholder = initialPreset.requiresApiKey
				? "sk-..."
				: "(not required)";
		}

		// Wire up field change events
		this.apiKeyInput.on(InputRenderableEvents.CHANGE, (value: string) => {
			this.apiKeyValue = value;
			this.updateInfoText();
		});
		this.baseUrlInput.on(InputRenderableEvents.CHANGE, (value: string) => {
			this.baseUrlValue = value;
			if (this.urlInfoText) {
				this.urlInfoText.content = `URL: ${value || "(Default)"}`;
			}
		});
		this.modelInput.on(InputRenderableEvents.CHANGE, (value: string) => {
			this.modelValue = value;
			this.updateInfoText();
		});

		// Keyboard shortcuts
		this.keyHandler = (key: KeyEvent) => {
			if (key.name === "escape") {
				this.emit({ type: "back" });
			} else if (key.ctrl && key.name === "s") {
				this.saveAll();
			} else if (key.name === "tab") {
				this.cycleFields();
			}
		};
		renderer.keyInput.on("keypress", this.keyHandler);
	}

	onResize(width: number, height: number): void {
		const panelWidth = Math.min(60, width - 4);
		const leftOffset = Math.max(2, Math.floor(width / 2 - panelWidth / 2));

		if (this.title) this.title.left = leftOffset;

		if (this.sep) {
			this.sep.left = leftOffset;
			this.sep.content = "─".repeat(panelWidth);
		}

		if (this.providerLabel) this.providerLabel.left = leftOffset;
		if (this.providerSelect) {
			this.providerSelect.width = panelWidth - 2;
			this.providerSelect.left = leftOffset + 1;
		}

		if (this.apiKeyLabel) this.apiKeyLabel.left = leftOffset;
		if (this.apiKeyInput) {
			this.apiKeyInput.width = panelWidth - 2;
			this.apiKeyInput.left = leftOffset + 1;
		}

		if (this.baseUrlLabel) this.baseUrlLabel.left = leftOffset;
		if (this.baseUrlInput) {
			this.baseUrlInput.width = panelWidth - 2;
			this.baseUrlInput.left = leftOffset + 1;
		}

		if (this.modelLabel) this.modelLabel.left = leftOffset;
		if (this.modelInput) {
			this.modelInput.width = panelWidth - 2;
			this.modelInput.left = leftOffset + 1;
		}

		if (this.infoText) this.infoText.left = leftOffset;
		if (this.providerInfoText) this.providerInfoText.left = leftOffset;
		if (this.urlInfoText) this.urlInfoText.left = leftOffset;

		if (this.instructions) {
			this.instructions.left = Math.max(2, Math.floor(width / 2 - 28));
			this.instructions.top = height - 2;
		}
	}

	/**
	 * Called when the user selects a different provider in the dropdown.
	 * Updates placeholders and info text dynamically.
	 * Also clears inputs if switching providers to avoid mixing configs.
	 */
	private onProviderChanged(presetId: string): void {
		if (this.selectedProviderId === presetId) return;

		this.selectedProviderId = presetId;
		const preset = getPreset(presetId);
		if (!preset) return;

		// Reset API key when switching providers
		this.apiKeyValue = "";

		// Auto-populate URL and Model from preset defaults
		this.baseUrlValue = preset.baseUrl;
		this.modelValue = preset.defaultModel;

		// Update Widget Values and Placeholders
		if (this.apiKeyInput) {
			this.apiKeyInput.value = "";
			this.apiKeyInput.placeholder = preset.requiresApiKey
				? "sk-..."
				: "(not required)";
		}
		if (this.baseUrlInput) {
			this.baseUrlInput.value = this.baseUrlValue;
			this.baseUrlInput.placeholder = preset.baseUrl || "https://...";
		}
		if (this.modelInput) {
			this.modelInput.value = this.modelValue;
			this.modelInput.placeholder = preset.defaultModel || "model-name";
		}

		this.updateInfoText();

		if (this.urlInfoText) {
			this.urlInfoText.content = `URL: ${this.baseUrlValue || "(Default)"}`;
		}
	}

	private updateInfoText(): void {
		if (this.infoText) {
			// Check if we have a key provided or if one is not required
			const preset = getPreset(this.selectedProviderId);
			const notRequired = preset && !preset.requiresApiKey;
			const hasKey = this.apiKeyValue.length > 0;

			// If not required, show green
			if (notRequired) {
				this.infoText.content = "✓ No API key required";
				this.infoText.fg = RGBA.fromHex("#44ff88");
			}
			// If required and we have a NEW key entered
			else if (hasKey) {
				this.infoText.content = "✓ API key entered";
				this.infoText.fg = RGBA.fromHex("#44ff88");
			}
			// If required, we don't have a new key, BUT we are on the SAME provider as config
			// and config has a key
			else if (
				this.selectedProviderId === this.currentConfig.provider &&
				this.currentConfig.apiKey
			) {
				this.infoText.content = "✓ API key saved";
				this.infoText.fg = RGBA.fromHex("#44ff88");
			} else {
				this.infoText.content = "✗ No API key entered";
				this.infoText.fg = RGBA.fromHex("#ff6644");
			}
		}

		if (this.providerInfoText) {
			const preset = getPreset(this.selectedProviderId);
			const name = preset?.name ?? this.selectedProviderId;
			const model = this.modelValue || preset?.defaultModel || "(default)";
			this.providerInfoText.content = `Provider: ${name}  ·  Model: ${model}`;
		}
	}

	private getApiKeyStatusText(): string {
		// Used for initial display in constructor
		const preset = getPreset(this.currentConfig.provider);
		if (preset && !preset.requiresApiKey) {
			return "✓ No API key required for this provider";
		}
		if (this.currentConfig.apiKey) {
			return `✓ API key configured`;
		}
		return "✗ No API key configured";
	}

	private getProviderInfoText(): string {
		const preset = getPreset(this.currentConfig.provider);
		const name = preset?.name ?? this.currentConfig.provider;
		return `Provider: ${name}  ·  Model: ${this.currentConfig.model}`;
	}

	private saveAll(): void {
		// Sync state from widgets directly – the CHANGE event only fires on
		// blur, so if the user presses Ctrl+S while an input still has focus
		// the latest typed value would be missed.
		if (this.apiKeyInput) {
			this.apiKeyValue = this.apiKeyInput.value;
		}
		if (this.baseUrlInput) {
			this.baseUrlValue = this.baseUrlInput.value;
		}
		if (this.modelInput) {
			this.modelValue = this.modelInput.value;
		}

		const preset = getPreset(this.selectedProviderId);
		const config: Partial<AppConfig> = {
			provider: this.selectedProviderId,
		};

		const providerChanged =
			this.selectedProviderId !== this.currentConfig.provider;

		// API Key Logic
		if (this.apiKeyValue) {
			config.apiKey = this.apiKeyValue;
		} else if (!providerChanged) {
			// Keep existing key if provider not changed
			config.apiKey = this.currentConfig.apiKey;
		} else {
			// Clear key if provider changed and no new key entered
			config.apiKey = "";
		}

		// URL Logic
		if (this.baseUrlValue) {
			config.apiBaseUrl = this.baseUrlValue;
		} else if (preset?.baseUrl) {
			config.apiBaseUrl = preset.baseUrl;
		} else if (!providerChanged) {
			config.apiBaseUrl = this.currentConfig.apiBaseUrl;
		} else {
			config.apiBaseUrl = ""; // Should probably use preset default effectively
		}

		// Model Logic
		if (this.modelValue) {
			config.model = this.modelValue;
		} else if (preset?.defaultModel) {
			config.model = preset.defaultModel;
		} else if (!providerChanged) {
			config.model = this.currentConfig.model;
		} else {
			config.model = "";
		}

		this.emit({ type: "save", config });
	}

	private cycleFields(): void {
		const fields = [
			this.providerSelect,
			this.apiKeyInput,
			this.baseUrlInput,
			this.modelInput,
		];
		this.focusedFieldIndex = (this.focusedFieldIndex + 1) % fields.length;
		fields[this.focusedFieldIndex]?.focus();
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
		this.providerSelect = null;
		this.apiKeyInput = null;
		this.baseUrlInput = null;
		this.modelInput = null;
		this.infoText = null;
		this.providerInfoText = null;
		this.urlInfoText = null;

		this.title = null;
		this.sep = null;
		this.providerLabel = null;
		this.apiKeyLabel = null;
		this.baseUrlLabel = null;
		this.modelLabel = null;
		this.instructions = null;
	}
}
