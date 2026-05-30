import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertObject(value, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object.`);
}

export function assertString(value, label) {
  assert(typeof value === "string" && value.trim().length > 0, `${label} must be a non-empty string.`);
}

export function assertArray(value, label) {
  assert(Array.isArray(value), `${label} must be an array.`);
}

export function assertStringArray(value, label) {
  assertArray(value, label);
  for (const item of value) {
    assertString(item, `${label} item`);
  }
}

export function assertNonEmptyStringArray(value, label) {
  assertStringArray(value, label);
  assert(value.length > 0, `${label} must be a non-empty array.`);
}

export function assertRelativeAofPath(value, label) {
  assertString(value, label);
  assert(!path.isAbsolute(value), `${label} must be a relative path under .aof/.`);
  const normalized = path.posix.normalize(value.replaceAll("\\", "/"));
  assert(!normalized.startsWith("../") && normalized !== "..", `${label} must not escape .aof/.`);
}

const schemaCache = new Map();

function valueType(value) {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  if (Number.isInteger(value)) {
    return "integer";
  }
  return typeof value;
}

function normalizeTypes(typeValue) {
  return Array.isArray(typeValue) ? typeValue : [typeValue];
}

function assertMatchesType(value, schema, label) {
  if (!schema.type) {
    return;
  }
  const allowedTypes = normalizeTypes(schema.type);
  const actualType = valueType(value);
  if (!allowedTypes.includes(actualType)) {
    throw new Error(`${label} must be of type ${allowedTypes.join(" or ")}, got ${actualType}.`);
  }
}

function validateEnum(value, schema, label) {
  if (schema.enum && !schema.enum.includes(value)) {
    throw new Error(`${label} must be one of: ${schema.enum.join(", ")}.`);
  }
}

function validateArray(value, schema, label) {
  if (!Array.isArray(value)) {
    return;
  }
  if (typeof schema.minItems === "number" && value.length < schema.minItems) {
    throw new Error(`${label} must contain at least ${schema.minItems} items.`);
  }
  if (schema.items) {
    value.forEach((item, index) => {
      validateAgainstSchema(item, schema.items, `${label}[${index}]`);
    });
  }
}

function validateObject(value, schema, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return;
  }

  const requiredKeys = schema.required ?? [];
  for (const key of requiredKeys) {
    if (!(key in value)) {
      throw new Error(`${label} is missing required key '${key}'.`);
    }
  }

  const propertySchemas = schema.properties ?? {};
  for (const [key, propertyValue] of Object.entries(value)) {
    const propertySchema = propertySchemas[key];
    if (!propertySchema) {
      if (schema.additionalProperties === false) {
        throw new Error(`${label}.${key} is not allowed by schema.`);
      }
      continue;
    }
    validateAgainstSchema(propertyValue, propertySchema, `${label}.${key}`);
  }

  if (typeof schema.minProperties === "number" && Object.keys(value).length < schema.minProperties) {
    throw new Error(`${label} must contain at least ${schema.minProperties} properties.`);
  }
}

export function validateAgainstSchema(value, schema, label = "value") {
  assertObject(schema, "schema");
  assertMatchesType(value, schema, label);
  validateEnum(value, schema, label);

  if (schema.type === "integer" && typeof schema.minimum === "number" && value < schema.minimum) {
    throw new Error(`${label} must be >= ${schema.minimum}.`);
  }

  if (schema.type === "string" && typeof value === "string" && schema.minLength && value.length < schema.minLength) {
    throw new Error(`${label} must be at least ${schema.minLength} characters.`);
  }

  validateArray(value, schema, label);
  validateObject(value, schema, label);
}

function schemaFileUrl(schemaFileName) {
  return new URL(`../../schemas/${schemaFileName}`, import.meta.url);
}

export async function loadBundledSchema(schemaFileName) {
  if (schemaCache.has(schemaFileName)) {
    return schemaCache.get(schemaFileName);
  }
  const schemaPath = fileURLToPath(schemaFileUrl(schemaFileName));
  const schemaText = await fs.readFile(schemaPath, "utf8");
  const schema = JSON.parse(schemaText);
  schemaCache.set(schemaFileName, schema);
  return schema;
}

export async function validateWithBundledSchema(value, schemaFileName, label) {
  const schema = await loadBundledSchema(schemaFileName);
  validateAgainstSchema(value, schema, label);
}
