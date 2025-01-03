export interface Config {
  rules: Rule[];
  kafka: {
    brokers: string[];
  };
  jetstream: {
    endpoint: string;
  };
}

export interface Rule {
  field: string;
  pattern: string;
  kafkaTopic: string;
}

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
