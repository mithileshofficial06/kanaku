import { defineConfig } from "vitest/config";

// Parsing a full statement PDF can take several seconds on a cold or busy machine.
export default defineConfig({ test: { testTimeout: 30000 } });
