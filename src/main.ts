import { parseArgs } from "jsr:@std/cli/parse-args";
import { loadConfig } from "./config/config.ts";
import { setupKafka } from "./services/kafka.ts";
import { setupJetstream } from "./services/jetstream.ts";
import { handleHealth } from "./controllers/health.ts";
import { handleMetrics } from "./controllers/metrics.ts";
import { logger } from "./utils/logger.ts";
import { HealthStatus } from "./types/types.ts";

const flags = parseArgs(Deno.args, {
  default: {
    hours: "24",
    port: "3030",
    config: "./config.json",
  },
  string: ["hours", "port", "config"],
  boolean: ["help"],
  alias: { h: "help" },
});

if (flags.help) {
  console.log(`
Bluesky Firehose Consumer

Options:
  --hours     Number of hours to look back in history (default: 24)
  --port      Port to run the HTTP server on (default: 3030)
  --config    Path to config file (default: ./config.json)
  --help, -h  Show this help message

Environment Variables:
  SKYGREP_CONFIG  Path to config file (overrides --config)

Example:
  deno run --allow-read --allow-net firehose_consumer.ts --hours 48 --config ./my-config.json
`);
  Deno.exit(0);
}

const HOUR_MICROSECONDS = 1 * 60 * 60 * 1000 * 1000;
const cursorHours = parseInt(flags.hours);
const cursorMicroseconds = cursorHours * HOUR_MICROSECONDS;

const config = await loadConfig(flags.config);

const healthStatus: HealthStatus = {
  startTime: Date.now(),
  isHealthy: true,
  lastEventTime: Date.now(),
  kafkaConnected: false, // Initialize as false
};

const producer = await setupKafka(config, healthStatus);

const ruleMetrics = new Map<string, number>();
config.rules.forEach((rule) => {
  ruleMetrics.set(rule.kafkaTopic, 0);
});

const jetstream = setupJetstream(
  cursorMicroseconds,
  config,
  producer,
  ruleMetrics,
  healthStatus,
);

// HTTP endpoints
const server = Deno.serve({ port: parseInt(flags.port) }, async (req) => {
  try {
    const url = new URL(req.url);

    switch (url.pathname) {
      case "/metrics":
        return handleMetrics(ruleMetrics);
      case "/health":
        return handleHealth(healthStatus);
      default:
        return new Response("Not Found", { status: 404 });
    }
  } catch (error) {
    const msg = (error as Error).message;
    logger.error("HTTP server error", { error: msg });
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
});

const cleanup = async () => {
  logger.info("Starting graceful shutdown");

  try {
    // Stop accepting new HTTP requests
    server.shutdown();

    // Stop Jetstream
    await Promise.race([
      jetstream.close(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Jetstream shutdown timeout")), 5000)
      ),
    ]);

    // Disconnect Kafka producer
    await Promise.race([
      producer.disconnect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Kafka shutdown timeout")), 5000)
      ),
    ]);

    logger.info("Graceful shutdown completed");
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Flush logs
    Deno.exit(0);
  } catch (error) {
    logger.error("Error during shutdown", { error: (error as Error).message });
    Deno.exit(1);
  }
};

Deno.addSignalListener("SIGINT", cleanup);
Deno.addSignalListener("SIGTERM", cleanup);

jetstream.start();
logger.info("Service started", {
  cursorHours,
  port: flags.port,
});
