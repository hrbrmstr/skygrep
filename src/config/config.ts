import { Config } from "../types/types.ts";
import { logger } from "../utils/logger.ts";

export async function loadConfig(): Promise<Config> {
  try {
    const config = JSON.parse(await Deno.readTextFile("./config.json"));
    logger.info("Configuration loaded", {
      numRules: config.rules.length,
      kafkaBrokers: config.kafka.brokers.length,
    });
    return config;
  } catch (error) {
    const msg = (error as Error).message;
    logger.error("Failed to load configuration", { error: msg });
    Deno.exit(1);
  }
}
