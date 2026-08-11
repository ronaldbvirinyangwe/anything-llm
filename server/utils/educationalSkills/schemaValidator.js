const SUPPORTED_TYPES = new Set([
  "array",
  "boolean",
  "integer",
  "null",
  "number",
  "object",
  "string",
]);
const SUPPORTED_KEYWORDS = new Set([
  "additionalProperties",
  "description",
  "enum",
  "items",
  "properties",
  "required",
  "title",
  "type",
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function valueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

function matchesType(value, type) {
  if (type === "object") return isObject(value);
  if (type === "array") return Array.isArray(value);
  if (type === "null") return value === null;
  if (type === "integer") return Number.isInteger(value);
  if (type === "number")
    return typeof value === "number" && Number.isFinite(value);
  return typeof value === type;
}

function valuesEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((item, index) => valuesEqual(item, right[index]))
    );
  }
  if (isObject(left) && isObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) =>
          Object.prototype.hasOwnProperty.call(right, key) &&
          valuesEqual(left[key], right[key])
      )
    );
  }
  return false;
}

function enumIncludes(values, value) {
  return values.some((candidate) => valuesEqual(candidate, value));
}

function validateSchemaDefinition(schema, path = "$schema") {
  if (!isObject(schema)) throw new TypeError(`${path} must be an object`);
  const unsupportedKeyword = Object.keys(schema).find(
    (keyword) => !SUPPORTED_KEYWORDS.has(keyword)
  );
  if (unsupportedKeyword) {
    throw new TypeError(`${path}.${unsupportedKeyword} is not supported`);
  }

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (
      types.length === 0 ||
      types.some(
        (type) => typeof type !== "string" || !SUPPORTED_TYPES.has(type)
      )
    ) {
      throw new TypeError(`${path}.type contains an unsupported JSON type`);
    }
  }

  if (
    schema.enum !== undefined &&
    (!Array.isArray(schema.enum) || schema.enum.length === 0)
  ) {
    throw new TypeError(`${path}.enum must be a non-empty array`);
  }
  if (
    schema.required !== undefined &&
    (!Array.isArray(schema.required) ||
      schema.required.some((key) => typeof key !== "string"))
  ) {
    throw new TypeError(`${path}.required must be an array of property names`);
  }
  if (schema.properties !== undefined) {
    if (!isObject(schema.properties)) {
      throw new TypeError(`${path}.properties must be an object`);
    }
    for (const [key, childSchema] of Object.entries(schema.properties)) {
      validateSchemaDefinition(childSchema, `${path}.properties.${key}`);
    }
  }
  if (
    schema.additionalProperties !== undefined &&
    typeof schema.additionalProperties !== "boolean" &&
    !isObject(schema.additionalProperties)
  ) {
    throw new TypeError(
      `${path}.additionalProperties must be a boolean or schema`
    );
  }
  if (isObject(schema.additionalProperties)) {
    validateSchemaDefinition(
      schema.additionalProperties,
      `${path}.additionalProperties`
    );
  }
  if (schema.items !== undefined) {
    validateSchemaDefinition(schema.items, `${path}.items`);
  }

  return true;
}

function validateJsonSchema(value, schema) {
  const errors = [];

  function visit(currentValue, currentSchema, path) {
    const types = Array.isArray(currentSchema.type)
      ? currentSchema.type
      : currentSchema.type
        ? [currentSchema.type]
        : [];

    if (
      types.length > 0 &&
      !types.some((type) => matchesType(currentValue, type))
    ) {
      errors.push({
        path,
        keyword: "type",
        message: `must be of type ${types.join(" or ")}`,
        expected: types,
        actual: valueType(currentValue),
      });
      return;
    }

    if (
      currentSchema.enum !== undefined &&
      !enumIncludes(currentSchema.enum, currentValue)
    ) {
      errors.push({
        path,
        keyword: "enum",
        message: "must be one of the allowed values",
        allowed: currentSchema.enum,
      });
      return;
    }

    if (isObject(currentValue)) {
      const properties = currentSchema.properties || {};
      for (const key of currentSchema.required || []) {
        if (!Object.prototype.hasOwnProperty.call(currentValue, key)) {
          errors.push({
            path: `${path}.${key}`,
            keyword: "required",
            message: "is required",
          });
        }
      }

      for (const [key, childValue] of Object.entries(currentValue)) {
        if (Object.prototype.hasOwnProperty.call(properties, key)) {
          visit(childValue, properties[key], `${path}.${key}`);
        } else if (currentSchema.additionalProperties === false) {
          errors.push({
            path: `${path}.${key}`,
            keyword: "additionalProperties",
            message: "is not an allowed property",
          });
        } else if (isObject(currentSchema.additionalProperties)) {
          visit(
            childValue,
            currentSchema.additionalProperties,
            `${path}.${key}`
          );
        }
      }
    }

    if (Array.isArray(currentValue) && currentSchema.items) {
      currentValue.forEach((item, index) => {
        visit(item, currentSchema.items, `${path}[${index}]`);
      });
    }
  }

  visit(value, schema, "$");
  return { valid: errors.length === 0, errors };
}

module.exports = { validateJsonSchema, validateSchemaDefinition };
