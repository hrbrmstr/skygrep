import { Jetstream } from "npm:@skyware/jetstream";
import {
  CollectionRule,
  Config,
  PatternRule,
  PostRecord,
} from "../types/types.ts";
import { logger } from "../utils/logger.ts";
import { HealthStatus } from "../types/types.ts";

export function setupJetstream(
  cursorMicroseconds: number,
  config: Config,
  producer: any,
  ruleMetrics: Map<string, number>,
  healthStatus: HealthStatus,
) {
  // Collect all collections needed for both rule types
  const wantedCollections = new Set<string>(["app.bsky.feed.post"]);

  // Add collections from collection rules
  config.rules.forEach((rule) => {
    if (rule.type === "collection" && Array.isArray(rule.collections)) {
      rule.collections.forEach((collection) =>
        wantedCollections.add(collection)
      );
    }
  });

  const jetstream = new Jetstream({
    endpoint: config.jetstream.endpoint,
    wantedCollections: Array.from(wantedCollections),
    cursor: cursorMicroseconds,
  });

  // Generic handler for any collection type that matches any rules
  jetstream.on("commit", async (event) => {
    healthStatus.lastEventTime = Date.now();
    const key =
      `at://did:plc:${event.did}/${event.commit.collection}/${event.commit.rkey}`;
    // const record = event.commit.record as unknown as PostRecord;

    // Process collection rules
    for (const rule of config.rules) {
      if (rule.type === "collection") {
        const collectionRule = rule as CollectionRule;

        if (
          collectionRule.collections.includes(event.commit.collection)
        ) {
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
            logger.info(
              "Collection rule matched - message sent to Kafka",
              {
                collection: event.commit.collection,
                topic: rule.kafkaTopic,
              },
            );
          } catch (error) {
            const msg = (error as Error).message;
            logger.error("Failed to send message to Kafka", {
              topic: rule.kafkaTopic,
              error: msg,
            });
          }
        }
      }
    }
  });

  // Keep the specific handler for post content pattern matching
  jetstream.onCreate("app.bsky.feed.post", async (event) => {
    healthStatus.lastEventTime = Date.now();
    const key =
      `at://did:plc:${event.did}/app.bsky.feed.post/${event.commit.rkey}`;
    const record = event.commit.record as unknown as PostRecord;

    // Process pattern rules
    for (const rule of config.rules) {
      if (rule.type === "pattern") {
        const patternRule = rule as PatternRule;
        const fieldValue = record[patternRule.field] as string;

        if (
          fieldValue &&
          new RegExp(patternRule.pattern).test(fieldValue)
        ) {
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
            logger.info(
              "Pattern rule matched - message sent to Kafka",
              {
                topic: rule.kafkaTopic,
              },
            );
          } catch (error) {
            const msg = (error as Error).message;
            logger.error("Failed to send message to Kafka", {
              topic: rule.kafkaTopic,
              error: msg,
            });
          }
        }
      }
    }
  });

  return jetstream;
}
