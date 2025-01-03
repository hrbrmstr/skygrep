import { Kafka } from "npm:kafkajs";
import { Config } from "../types/types.ts";
import { logger } from "../utils/logger.ts";
import { HealthStatus } from "../types/types.ts";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

export async function setupKafka(config: Config, healthStatus: HealthStatus) { // Add healthStatus parameter
  Deno.env.set("KAFKAJS_NO_PARTITIONER_WARNING", "1");

  const kafka = new Kafka({
    brokers: config.kafka.brokers,
    retry: {
      initialRetryTime: 1000,
      retries: 10,
    },
  });

  const producer = kafka.producer({
    retry: {
      initialRetryTime: 1000,
      retries: 10,
    },
  });

  producer.on("producer.connect", () => {
    healthStatus.kafkaConnected = true;
  });

  producer.on("producer.disconnect", async () => {
    healthStatus.kafkaConnected = false;
    logger.error("Kafka producer disconnected");
    await reconnectWithRetry(producer);
  });

  await connectWithRetry(producer);
  healthStatus.kafkaConnected = true; // Set initial connection status
  return producer;
}

async function connectWithRetry(producer: any, attempt = 1): Promise<void> {
  try {
    await producer.connect();
    logger.info("Connected to Kafka");
  } catch (error) {
    if (attempt >= MAX_RETRIES) {
      logger.error(`Failed to connect to Kafka after ${MAX_RETRIES} attempts`);
      throw error;
    }

    logger.warn(
      `Connection attempt ${attempt} failed. Retrying in ${
        RETRY_DELAY_MS / 1000
      }s...`,
    );
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    await connectWithRetry(producer, attempt + 1);
  }
}

async function reconnectWithRetry(producer: any, attempt = 1): Promise<void> {
  try {
    await producer.connect();
    logger.info("Reconnected to Kafka");
  } catch (error) {
    if (attempt >= MAX_RETRIES) {
      logger.error(
        `Failed to reconnect to Kafka after ${MAX_RETRIES} attempts`,
      );
      return;
    }

    logger.warn(
      `Reconnection attempt ${attempt} failed. Retrying in ${
        RETRY_DELAY_MS / 1000
      }s...`,
    );
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    await reconnectWithRetry(producer, attempt + 1);
  }
}
