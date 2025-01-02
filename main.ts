import { Jetstream } from "npm:@skyware/jetstream";
import { Kafka } from "npm:kafkajs";
import { Config, PostRecord } from "./types/config.ts";
import { parseArgs } from "jsr:@std/cli/parse-args";

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

let config: Config;

try {
  config = JSON.parse(await Deno.readTextFile("./config.json"));
} catch (error) {
  console.error("Failed to load configuration:", error);
  Deno.exit(1);
}

const ruleMetrics = new Map<string, number>();
config.rules.forEach((rule) => {
  ruleMetrics.set(rule.pattern, 0);
});

const HOUR_MICROSECONDS = 1 * 60 * 60 * 1000 * 1000;
const cursorHours = parseInt(flags.hours);
const cursorMicroseconds = cursorHours * HOUR_MICROSECONDS;

Deno.env.set("KAFKAJS_NO_PARTITIONER_WARNING", "1");

const kafka = new Kafka({
  brokers: config.kafka.brokers,
});

const producer = kafka.producer();

producer.on("producer.disconnect", () => {
  console.error("Kafka producer disconnected");
  healthStatus.isHealthy = false;
});

await producer.connect();

const healthStatus = {
  startTime: Date.now(),
  isHealthy: true,
  lastEventTime: Date.now(),
};

const jetstream = new Jetstream({
  endpoint: "wss://jetstream2.us-east.bsky.network/subscribe",
  wantedCollections: ["app.bsky.feed.post"],
  cursor: cursorMicroseconds,
});

jetstream.onCreate("app.bsky.feed.post", async (event) => {
  healthStatus.lastEventTime = Date.now();

  const record = event.commit.record as unknown as PostRecord;

  for (const rule of config.rules) {
    const fieldValue = record[rule.field] as string;
    if (fieldValue && new RegExp(rule.pattern).test(fieldValue)) {
      ruleMetrics.set(rule.pattern, (ruleMetrics.get(rule.pattern) || 0) + 1);

      await producer.send({
        topic: rule.kafkaTopic,
        messages: [
          {
            value: JSON.stringify(event.commit.record),
          },
        ],
      });
    }
  }
});

// HTTP endpoints
Deno.serve({ port: parseInt(flags.port) }, (req) => {
  const url = new URL(req.url);

  switch (url.pathname) {
    case "/metrics": {
      const metrics = Object.fromEntries(ruleMetrics);
      return new Response(JSON.stringify(metrics, null, 2), {
        headers: { "Content-Type": "application/json" },
      });
    }

    case "/health": {
      const uptime = Date.now() - healthStatus.startTime;
      const timeSinceLastEvent = Date.now() - healthStatus.lastEventTime;

      // Consider unhealthy if no events received in last 5 minutes
      healthStatus.isHealthy = timeSinceLastEvent < 5 * 60 * 1000;

      const health = {
        status: healthStatus.isHealthy ? "healthy" : "unhealthy",
        uptime_ms: uptime,
        last_event_ms_ago: timeSinceLastEvent,
      };

      return new Response(JSON.stringify(health, null, 2), {
        status: healthStatus.isHealthy ? 200 : 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    default: {
      return new Response("Not Found", { status: 404 });
    }
  }
});

const cleanup = async () => {
  await producer.disconnect();
  Deno.exit(0);
};

Deno.addSignalListener("SIGINT", cleanup);
Deno.addSignalListener("SIGTERM", cleanup);

jetstream.start();
