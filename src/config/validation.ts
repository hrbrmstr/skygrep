import { Config, Rule } from "../types/types.ts";

interface ValidationError {
  field: string;
  message: string;
}

function validateRule(rule: Rule): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!rule.field) {
    errors.push({ field: "field", message: "Field name is required" });
  }

  if (!rule.pattern) {
    errors.push({ field: "pattern", message: "Pattern is required" });
  } else {
    try {
      new RegExp(rule.pattern);
    } catch (e) {
      errors.push({
        field: "pattern",
        message: "Invalid regular expression pattern",
      });
    }
  }

  if (!rule.kafkaTopic) {
    errors.push({ field: "kafkaTopic", message: "Kafka topic is required" });
  } else if (!/^[a-zA-Z0-9._-]+$/.test(rule.kafkaTopic)) {
    errors.push({
      field: "kafkaTopic",
      message: "Invalid Kafka topic name format",
    });
  }

  return errors;
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
    errors.push({ field: "rules", message: "At least one rule is required" });
  } else {
    conf.rules.forEach((rule, index) => {
      const ruleErrors = validateRule(rule);
      ruleErrors.forEach((error) => {
        errors.push({
          field: `rules[${index}].${error.field}`,
          message: error.message,
        });
      });
    });
  }

  if (errors.length > 0) {
    throw new Error(
      "Invalid configuration:\n" +
        errors.map((e) => `- ${e.field}: ${e.message}`).join("\n"),
    );
  }
}
