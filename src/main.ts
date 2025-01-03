import { parseArgs } from "jsr:@std/cli/parse-args";
import { loadConfig } from "./config/config.ts";
import { setupKafka } from "./services/kafka.ts";
import { setupJetstream } from "./services/jetstream.ts";
import { handleHealth } from "./controllers/health.ts";
import { handleMetrics } from "./controllers/metrics.ts";
import { logger } from "./utils/logger.ts";
import { HealthStatus } from "./types/types.ts";

const flags = parseArgs(Deno.args, {
  default: { hours: "24", port: "3030" },
  string: ["hours", "port"],
  boolean: ["help"],
  alias: { h: "help" },
});

if (flags.help) {
  console.log(`
Bluesky Firehose Consumer

Options:
  --hours     Number of hours to look back in history (default: 24)
  --help, -h  Show this help message

Example:
  deno run --allow-read --allow-net firehose_consumer.ts --hours 48
`);
  Deno.exit(0);
}

const HOUR_MICROSECONDS = 1 * 60 * 60 * 1000 * 1000;
const cursorHours = parseInt(flags.hours);
const cursorMicroseconds = cursorHours * HOUR_MICROSECONDS;

const config = await loadConfig();
const producer = await setupKafka(config);

const ruleMetrics = new Map<string, number>();
config.rules.forEach((rule) => {
  ruleMetrics.set(rule.kafkaTopic, 0);
});

const healthStatus: HealthStatus = {
  startTime: Date.now(),
  isHealthy: true,
  lastEventTime: Date.now(),
};

const jetstream = setupJetstream(cursorMicroseconds, config, producer, ruleMetrics);

// HTTP endpoints
Deno.serve({ port: parseInt(flags.port) }, (req) => {
  const url = new URL(req.url);

  switch (url.pathname) {
    case "/metrics":
      return handleMetrics(ruleMetrics);
    case "/health":
      return handleHealth(healthStatus);
    default:
      return new Response("Not Found", { status: 404 });
  }
});

const cleanup = async () => {
  logger.info("Shutting down service");
  await producer.disconnect();
  Deno.exit(0);
};

Deno.addSignalListener("SIGINT", cleanup);
Deno.addSignalListener("SIGTERM", cleanup);

jetstream.start();
logger.info("Service started", {
  cursorHours,
  port: flags.port,
});
