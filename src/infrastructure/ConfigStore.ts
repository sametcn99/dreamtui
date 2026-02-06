import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Persists user configuration (API keys, provider choice, animation settings)
 * to ~/.dreamtui/config.json
 */
export interface AppConfig {
	apiKey: string;
	provider: string;
	apiBaseUrl: string;
	model: string;
	animationFps: number;
}

const DEFAULT_CONFIG: AppConfig = {
	apiKey: "",
	provider: "openai",
	apiBaseUrl: "https://api.openai.com/v1",
	model: "gpt-4o-mini",
	animationFps: 13,
};

const CONFIG_DIR = join(homedir(), ".dreamtui");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export class ConfigStore {
	private config: AppConfig;

	private constructor(config: AppConfig) {
		this.config = config;
	}

	/**
	 * Load config from disk, falling back to defaults.
	 */
	static async load(): Promise<ConfigStore> {
		try {
			const file = Bun.file(CONFIG_PATH);
			const exists = await file.exists();
			if (exists) {
				const raw = await file.json();
				const merged: AppConfig = { ...DEFAULT_CONFIG, ...raw };
				return new ConfigStore(merged);
			}
		} catch {
			// ignore – use defaults
		}
		return new ConfigStore({ ...DEFAULT_CONFIG });
	}

	/**
	 * Persist current config to disk.
	 */
	async save(): Promise<void> {
		// Ensure directory exists
		try {
			await Bun.write(CONFIG_PATH, `${JSON.stringify(this.config, null, 2)}\n`);
		} catch {
			// If directory doesn't exist, create it first
			const { mkdir } = await import("node:fs/promises");
			await mkdir(CONFIG_DIR, { recursive: true });
			await Bun.write(CONFIG_PATH, `${JSON.stringify(this.config, null, 2)}\n`);
		}
	}

	get(): Readonly<AppConfig> {
		return { ...this.config };
	}

	getApiKey(): string {
		return this.config.apiKey;
	}

	getProvider(): string {
		return this.config.provider;
	}

	getApiBaseUrl(): string {
		return this.config.apiBaseUrl;
	}

	getModel(): string {
		return this.config.model;
	}

	getAnimationFps(): number {
		return this.config.animationFps;
	}

	async update(partial: Partial<AppConfig>): Promise<void> {
		this.config = { ...this.config, ...partial };
		await this.save();
	}

	hasApiKey(): boolean {
		return this.config.apiKey.length > 0;
	}
}
