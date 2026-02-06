#!/usr/bin/env bun

/**
 * DreamTUI — Entry Point
 *
 * A terminal-based generative dream engine.
 * Transforms user-written dreams into full-screen, animated ASCII experiences
 * using AI-driven semantic interpretation and procedural rendering.
 */

import { DreamTUIApp } from "./src/app/DreamTUIApp.ts";

const app = new DreamTUIApp();

// Graceful shutdown
process.on("SIGINT", async () => {
	await app.destroy();
	process.exit(0);
});

process.on("SIGTERM", async () => {
	await app.destroy();
	process.exit(0);
});

await app.run();
