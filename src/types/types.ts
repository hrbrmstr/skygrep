export interface Config {
  rules: Rule[];
  kafka: {
    brokers: string[];
  };
  jetstream: {
    endpoint: string;
  };
}

export interface BaseRule {
  kafkaTopic: string;
}

export interface PatternRule extends BaseRule {
  type: "pattern";
  field: string;
  pattern: string;
}

export interface CollectionRule extends BaseRule {
  type: "collection";
  collections: string[];
}

export type Rule = PatternRule | CollectionRule;

export interface KafkaConfig {
  brokers: string[];
}

export interface PostRecord {
  [key: string]: unknown;
}

export interface HealthStatus {
  startTime: number;
  isHealthy: boolean;
  lastEventTime: number;
  kafkaConnected: boolean;
}
