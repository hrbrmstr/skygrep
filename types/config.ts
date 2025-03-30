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

export interface Config {
  rules: Rule[];
  kafka: KafkaConfig;
}

export interface PostRecord {
  text?: string;
  [key: string]: unknown; // Allow other fields of unknown type
}
