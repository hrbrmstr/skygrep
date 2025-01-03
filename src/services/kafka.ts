import { Kafka } from "npm:kafkajs";
import { Config } from "../types/types.ts";
import { logger } from "../utils/logger.ts";

export async function setupKafka(config: Config) {
  Deno.env.set("KAFKAJS_NO_PARTITIONER_WARNING", "1");

  const kafka = new Kafka({
    brokers: config.kafka.brokers,
  });

  const producer = kafka.producer();

  producer.on("producer.disconnect", () => {
    logger.error("Kafka producer disconnected");
    return false;
  });

  await producer.connect();
  logger.info("Connected to Kafka");

  return producer;
}
