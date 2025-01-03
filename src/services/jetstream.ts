import { Jetstream } from "npm:@skyware/jetstream";
import { Config, PostRecord } from "../types/types.ts";
import { logger } from "../utils/logger.ts";

export function setupJetstream(
  cursorMicroseconds: number,
  config: Config,
  producer: any,
  ruleMetrics: Map<string, number>,
) {
  const jetstream = new Jetstream({
    endpoint: config.jetstream.endpoint,
    wantedCollections: ["app.bsky.feed.post"],
    cursor: cursorMicroseconds,
  });

  jetstream.onCreate("app.bsky.feed.post", async (event) => {
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
                value: JSON.stringify(event.commit.record),
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
