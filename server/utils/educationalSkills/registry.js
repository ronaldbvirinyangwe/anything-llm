const { validateSchemaDefinition } = require("./schemaValidator");

const NAMESPACE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NAME_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

function createSkillStableName(namespace, name) {
  if (typeof namespace !== "string" || !NAMESPACE_PATTERN.test(namespace)) {
    throw new TypeError(
      "Skill namespace must contain lowercase letters, numbers, or hyphens"
    );
  }
  if (typeof name !== "string" || !NAME_PATTERN.test(name)) {
    throw new TypeError(
      "Skill name must contain lowercase letters, numbers, dots, or hyphens"
    );
  }
  return `${namespace}.${name}`;
}

function validateStringArray(value, field) {
  if (
    value !== undefined &&
    (!Array.isArray(value) || value.some((item) => typeof item !== "string"))
  ) {
    throw new TypeError(`${field} must be an array of strings`);
  }
}

function validateCallLimit(callLimit) {
  if (callLimit === undefined) return;
  if (
    !callLimit ||
    !Number.isInteger(callLimit.maxCalls) ||
    callLimit.maxCalls < 1 ||
    !Number.isInteger(callLimit.windowMs) ||
    callLimit.windowMs < 1
  ) {
    throw new TypeError(
      "callLimit requires positive integer maxCalls and windowMs values"
    );
  }
  if (
    callLimit.scope !== undefined &&
    !["caller", "global"].includes(callLimit.scope)
  ) {
    throw new TypeError('callLimit.scope must be "caller" or "global"');
  }
}

class EducationalSkillRegistry {
  constructor() {
    this.skills = new Map();
  }

  register(contract) {
    if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
      throw new TypeError("Skill contract must be an object");
    }

    const stableName = createSkillStableName(contract.namespace, contract.name);
    if (this.skills.has(stableName)) {
      throw new Error(`Educational skill already registered: ${stableName}`);
    }
    if (typeof contract.execute !== "function") {
      throw new TypeError("Skill contract requires an execute function");
    }
    validateSchemaDefinition(contract.inputSchema);
    if (contract.outputSchema) validateSchemaDefinition(contract.outputSchema);
    validateStringArray(contract.roles, "roles");
    validateStringArray(contract.permissions, "permissions");
    validateCallLimit(contract.callLimit);
    if (
      contract.timeoutMs !== undefined &&
      (!Number.isInteger(contract.timeoutMs) || contract.timeoutMs < 1)
    ) {
      throw new TypeError("timeoutMs must be a positive integer");
    }

    const registered = Object.freeze({
      ...contract,
      stableName,
      roles: Object.freeze([...(contract.roles || [])]),
      permissions: Object.freeze([...(contract.permissions || [])]),
      callLimit: contract.callLimit
        ? Object.freeze({ scope: "caller", ...contract.callLimit })
        : undefined,
    });
    this.skills.set(stableName, registered);
    return registered;
  }

  get(stableName) {
    return this.skills.get(stableName);
  }

  has(stableName) {
    return this.skills.has(stableName);
  }

  unregister(stableName) {
    return this.skills.delete(stableName);
  }

  list() {
    return Array.from(this.skills.values(), (skill) => ({
      stableName: skill.stableName,
      namespace: skill.namespace,
      name: skill.name,
      description: skill.description,
      inputSchema: skill.inputSchema,
      outputSchema: skill.outputSchema,
      roles: skill.roles,
      permissions: skill.permissions,
      callLimit: skill.callLimit,
      timeoutMs: skill.timeoutMs,
    }));
  }
}

module.exports = { EducationalSkillRegistry, createSkillStableName };
