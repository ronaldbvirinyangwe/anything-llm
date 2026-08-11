const { randomUUID } = require("crypto");
const { validateJsonSchema } = require("./schemaValidator");

const ERROR_CODES = Object.freeze({
  ABORTED: "ABORTED",
  EXECUTION_ERROR: "EXECUTION_ERROR",
  FORBIDDEN: "FORBIDDEN",
  INVALID_INPUT: "INVALID_INPUT",
  INVALID_OUTPUT: "INVALID_OUTPUT",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  TIMEOUT: "TIMEOUT",
});

function asSet(value, singularValue) {
  const values = Array.isArray(value) ? [...value] : [];
  if (typeof singularValue === "string") values.push(singularValue);
  return new Set(values);
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

class EducationalSkillGateway {
  constructor(registry, options = {}) {
    if (!registry || typeof registry.get !== "function") {
      throw new TypeError("EducationalSkillGateway requires a skill registry");
    }
    this.registry = registry;
    this.hooks = options.hooks || {};
    this.now = options.now || Date.now;
    this.createExecutionId = options.createExecutionId || randomUUID;
    this.callWindows = new Map();
  }

  async emit(type, event) {
    const callbacks = [
      this.hooks.onEvent,
      type === "start" ? this.hooks.onStart : this.hooks.onFinish,
    ].filter((callback) => typeof callback === "function");

    for (const callback of callbacks) {
      try {
        await callback({ type, ...event });
      } catch (_error) {
        // Tracing must not alter skill behavior.
      }
    }
  }

  authorizationError(skill, caller) {
    const callerRoles = asSet(caller?.roles, caller?.role);
    const callerPermissions = asSet(caller?.permissions);
    const hasAllowedRole =
      skill.roles.length === 0 ||
      skill.roles.some((role) => callerRoles.has(role));
    const missingPermissions = skill.permissions.filter(
      (permission) => !callerPermissions.has(permission)
    );

    if (hasAllowedRole && missingPermissions.length === 0) return null;
    return {
      code: ERROR_CODES.FORBIDDEN,
      message: "Caller is not authorized to execute this skill",
      details: {
        allowedRoles: skill.roles,
        missingPermissions,
      },
    };
  }

  consumeCall(skill, caller) {
    if (!skill.callLimit) return null;
    const callerKey =
      caller?.id ?? caller?.userId ?? caller?.subject ?? "anonymous";
    const scopeKey =
      skill.callLimit.scope === "global" ? "global" : String(callerKey);
    const key = `${skill.stableName}:${scopeKey}`;
    const now = this.now();
    let window = this.callWindows.get(key);

    if (!window || now - window.startedAt >= skill.callLimit.windowMs) {
      window = { startedAt: now, calls: 0 };
      this.callWindows.set(key, window);
    }
    if (window.calls >= skill.callLimit.maxCalls) {
      return {
        code: ERROR_CODES.RATE_LIMITED,
        message: "Skill call limit exceeded",
        details: {
          limit: skill.callLimit.maxCalls,
          windowMs: skill.callLimit.windowMs,
          retryAfterMs: Math.max(
            0,
            skill.callLimit.windowMs - (now - window.startedAt)
          ),
        },
      };
    }
    window.calls += 1;
    return null;
  }

  async execute(stableName, input, context = {}) {
    const executionId = this.createExecutionId();
    const startedAt = this.now();
    const skill = this.registry.get(stableName);
    const baseMeta = { executionId, startedAt, stableName };
    await this.emit("start", { ...baseMeta, input, context });

    const finish = async (result) => {
      const finishedAt = this.now();
      const completed = {
        ...result,
        meta: {
          ...baseMeta,
          finishedAt,
          durationMs: Math.max(0, finishedAt - startedAt),
        },
      };
      await this.emit("finish", { ...baseMeta, result: completed });
      return completed;
    };
    const fail = (error) => finish({ ok: false, error });

    if (!skill) {
      return fail({
        code: ERROR_CODES.NOT_FOUND,
        message: `Educational skill not found: ${stableName}`,
      });
    }

    const validation = validateJsonSchema(input, skill.inputSchema);
    if (!validation.valid) {
      return fail({
        code: ERROR_CODES.INVALID_INPUT,
        message: "Skill input did not match its schema",
        details: { errors: validation.errors },
      });
    }

    const authorizationError = this.authorizationError(skill, context.caller);
    if (authorizationError) return fail(authorizationError);
    if (context.signal?.aborted) {
      return fail({
        code: ERROR_CODES.ABORTED,
        message: "Skill execution aborted",
      });
    }

    const callLimitError = this.consumeCall(skill, context.caller);
    if (callLimitError) return fail(callLimitError);

    const controller = new AbortController();
    let timedOut = false;
    let timer;
    const externalAbort = () => controller.abort(context.signal?.reason);
    context.signal?.addEventListener("abort", externalAbort, { once: true });
    if (skill.timeoutMs) {
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort(new Error("Skill execution timed out"));
      }, skill.timeoutMs);
    }

    const aborted = new Promise((_, reject) => {
      controller.signal.addEventListener(
        "abort",
        () => reject(controller.signal.reason || new Error("Aborted")),
        { once: true }
      );
    });
    const executionContext = {
      ...context,
      caller: context.caller || {},
      executionId,
      signal: controller.signal,
      stableName,
    };

    try {
      const data = await Promise.race([
        Promise.resolve().then(() => skill.execute(input, executionContext)),
        aborted,
      ]);
      if (skill.outputSchema) {
        const validation = validateJsonSchema(data, skill.outputSchema);
        if (!validation.valid) {
          return fail({
            code: ERROR_CODES.INVALID_OUTPUT,
            message: "Skill output did not match its schema",
            details: { errors: validation.errors },
          });
        }
      }
      return finish({ ok: true, data });
    } catch (error) {
      if (timedOut) {
        return fail({
          code: ERROR_CODES.TIMEOUT,
          message: `Skill execution exceeded ${skill.timeoutMs}ms`,
          details: { timeoutMs: skill.timeoutMs },
        });
      }
      if (controller.signal.aborted) {
        return fail({
          code: ERROR_CODES.ABORTED,
          message: "Skill execution aborted",
        });
      }
      return fail({
        code: ERROR_CODES.EXECUTION_ERROR,
        message: errorMessage(error),
      });
    } finally {
      if (timer) clearTimeout(timer);
      context.signal?.removeEventListener("abort", externalAbort);
    }
  }
}

module.exports = { EducationalSkillGateway, ERROR_CODES };
