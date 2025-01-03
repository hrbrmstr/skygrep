import { Jetstream } from "npm:@skyware/jetstream";
import { Config, PostRecord } from "../types/types.ts";
import { logger } from "../utils/logger.ts";
import { HealthStatus } from "../types/types.ts";

export function setupJetstream(
  cursorMicroseconds: number,
  config: Config,
  producer: any,
  ruleMetrics: Map<string, number>,
  healthStatus: HealthStatus,
) {
  const jetstream = new Jetstream({
    endpoint: config.jetstream.endpoint,
    wantedCollections: ["app.bsky.feed.post"],
    cursor: cursorMicroseconds,
  });

  jetstream.onCreate("app.bsky.feed.post", async (event) => {
    healthStatus.lastEventTime = Date.now();
    const key =
      `at://did:plc:${event.did}/app.bsky.feed.post/${event.commit.rkey}`;
    const record = event.commit.record as unknown as PostRecord;

    for (const rule of config.rules) {
      const fieldValue = record[rule.field] as string;
      if (fieldValue && new RegExp(rule.pattern).test(fieldValue)) {
        ruleMetrics.set(
          rule.kafkaTopic,
          (ruleMetrics.get(rule.kafkaTopic) || 0) + 1,
        );

        try {
          await producer.send({
            topic: rule.kafkaTopic,
            messages: [
              {
                key,
                value: JSON.stringify(event),
              },
            ],
          });
          logger.info("Message sent to Kafka", {
            topic: rule.kafkaTopic,
          });
        } catch (error) {
          const msg = (error as Error).message;
          logger.error("Failed to send message to Kafka", {
            topic: rule.kafkaTopic,
            error: msg,
          });
        }
      }
    }
  });

  return jetstream;
}
