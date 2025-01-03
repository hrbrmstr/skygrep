import { Config } from "../types/types.ts";
import { logger } from "../utils/logger.ts";
import { validateConfig } from "./validation.ts";

export async function loadConfig(configPath?: string): Promise<Config> {
  // Priority: env var > CLI param > default
  const configFile = Deno.env.get("SKYGREP_CONFIG") || configPath ||
    "./config.json";

  try {
    const rawConfig = JSON.parse(await Deno.readTextFile(configFile));
    validateConfig(rawConfig);

    logger.info("Configuration loaded", {
      configPath: configFile,
      numRules: rawConfig.rules.length,
      kafkaBrokers: rawConfig.kafka.brokers.length,
    });
    return rawConfig;
  } catch (error) {
    const msg = (error as Error).message;
    logger.error("Failed to load configuration", {
      error: msg,
      configPath: configFile,
    });
    Deno.exit(1);
  }
}
