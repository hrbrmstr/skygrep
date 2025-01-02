export interface Rule {
  field: string;
  pattern: string;
  kafkaTopic: string;
}

export interface KafkaConfig {
  brokers: string[];
}

export interface Config {
  rules: Rule[];
  kafka: KafkaConfig;
}

export interface PostRecord {
  text?: string;
  [key: string]: unknown; // Allow other fields of unknown type
}
