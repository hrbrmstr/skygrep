import { CollectionRule, Config, PatternRule, Rule } from "../types/types.ts";

interface ValidationError {
  field: string;
  message: string;
}

function validatePatternRule(
  rule: PatternRule,
  index: number,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!rule.field) {
    errors.push({
      field: `rules[${index}].field`,
      message: "Field name is required",
    });
  }

  if (!rule.pattern) {
    errors.push({
      field: `rules[${index}].pattern`,
      message: "Pattern is required",
    });
  } else {
    try {
      new RegExp(rule.pattern);
    } catch (e) {
      errors.push({
        field: `rules[${index}].pattern`,
        message: "Invalid regular expression pattern",
      });
    }
  }

  if (!rule.kafkaTopic) {
    errors.push({
      field: `rules[${index}].kafkaTopic`,
      message: "Kafka topic is required",
    });
  } else if (!/^[a-zA-Z0-9._-]+$/.test(rule.kafkaTopic)) {
    errors.push({
      field: `rules[${index}].kafkaTopic`,
      message: "Invalid Kafka topic name format",
    });
  }

  return errors;
}

function validateCollectionRule(
  rule: CollectionRule,
  index: number,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!Array.isArray(rule.collections) || rule.collections.length === 0) {
    errors.push({
      field: `rules[${index}].collections`,
      message: "Collections must be a non-empty array of strings",
    });
  } else {
    for (let i = 0; i < rule.collections.length; i++) {
      const collection = rule.collections[i];
      if (typeof collection !== "string" || !collection) {
        errors.push({
          field: `rules[${index}].collections[${i}]`,
          message: "Collection must be a non-empty string",
        });
      }
    }
  }

  if (!rule.kafkaTopic) {
    errors.push({
      field: `rules[${index}].kafkaTopic`,
      message: "Kafka topic is required",
    });
  } else if (!/^[a-zA-Z0-9._-]+$/.test(rule.kafkaTopic)) {
    errors.push({
      field: `rules[${index}].kafkaTopic`,
      message: "Invalid Kafka topic name format",
    });
  }

  return errors;
}

function validateRule(rule: Rule, index: number): ValidationError[] {
  if (!rule.type) {
    return [
      {
        field: `rules[${index}].type`,
        message: "Rule type is required ('pattern' or 'collection')",
      },
    ];
  }

  switch (rule.type) {
    case "pattern":
      return validatePatternRule(rule as PatternRule, index);
    case "collection":
      return validateCollectionRule(rule as CollectionRule, index);
    default:
      return [
        {
          field: `rules[${index}].type`,
          message: "Invalid rule type. Must be 'pattern' or 'collection'",
        },
      ];
  }
}

export function validateConfig(config: unknown): asserts config is Config {
  const errors: ValidationError[] = [];

  if (!config || typeof config !== "object") {
    throw new Error("Configuration must be a valid JSON object");
  }

  const conf = config as Config;

  // Validate Kafka configuration
  if (!conf.kafka?.brokers?.length) {
    errors.push({
      field: "kafka.brokers",
      message: "At least one Kafka broker is required",
    });
  } else {
    for (const broker of conf.kafka.brokers) {
      try {
        new URL(broker);
      } catch {
        errors.push({
          field: "kafka.brokers",
          message: `Invalid broker URL: ${broker}`,
        });
      }
    }
  }

  // Validate Jetstream configuration
  if (!conf.jetstream?.endpoint) {
    errors.push({
      field: "jetstream.endpoint",
      message: "Jetstream endpoint is required",
    });
  } else {
    try {
      new URL(conf.jetstream.endpoint);
    } catch {
      errors.push({
        field: "jetstream.endpoint",
        message: `Invalid Jetstream endpoint URL: ${conf.jetstream.endpoint}`,
      });
    }
  }

  // Validate rules
  if (!Array.isArray(conf.rules)) {
    errors.push({ field: "rules", message: "Rules must be an array" });
  } else if (conf.rules.length === 0) {
    errors.push({
      field: "rules",
      message: "At least one rule is required",
    });
  } else {
    conf.rules.forEach((rule, index) => {
      const ruleErrors = validateRule(rule, index);
      errors.push(...ruleErrors);
    });
  }

  if (errors.length > 0) {
    throw new Error(
      "Invalid configuration:\n" +
        errors.map((e) => `- ${e.field}: ${e.message}`).join("\n"),
    );
  }
}
