const { randomUUID } = require("crypto");

const WORKFLOW_STATUSES = Object.freeze({
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  FAILED: "failed",
  PAUSED: "paused",
});

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function validateWorkflow(workflow) {
  if (!workflow || typeof workflow !== "object") {
    throw new TypeError("Educational workflow must be an object");
  }
  if (typeof workflow.id !== "string" || workflow.id.length === 0) {
    throw new TypeError("Educational workflow requires an id");
  }
  if (!Array.isArray(workflow.steps) || workflow.steps.length === 0) {
    throw new TypeError("Educational workflow requires at least one step");
  }

  const ids = new Set();
  for (const step of workflow.steps) {
    if (!step || typeof step.id !== "string" || step.id.length === 0) {
      throw new TypeError("Every educational workflow step requires an id");
    }
    if (ids.has(step.id)) {
      throw new TypeError(`Duplicate educational workflow step: ${step.id}`);
    }
    ids.add(step.id);
    if (!step.skill && typeof step.pause !== "function") {
      throw new TypeError(`Workflow step ${step.id} requires a skill or pause`);
    }
  }
}

class EducationalWorkflowExecutor {
  constructor(gateway, options = {}) {
    if (!gateway || typeof gateway.execute !== "function") {
      throw new TypeError(
        "EducationalWorkflowExecutor requires an EducationalSkillGateway"
      );
    }
    this.gateway = gateway;
    this.now = options.now || Date.now;
    this.createExecutionId = options.createExecutionId || randomUUID;
    this.hooks = options.hooks || {};
  }

  async emit(event) {
    if (typeof this.hooks.onEvent !== "function") return;
    try {
      await this.hooks.onEvent(event);
    } catch (_error) {
      // Workflow tracing must not change execution behavior.
    }
  }

  async execute(workflow, input = {}, options = {}) {
    validateWorkflow(workflow);
    const resumed = options.resumeState;
    if (resumed && resumed.workflowId !== workflow.id) {
      throw new TypeError("Resume state belongs to a different workflow");
    }

    const executionId = resumed?.executionId || this.createExecutionId();
    const startedAt = resumed?.startedAt ?? this.now();
    const initialInput = { ...(resumed?.input || {}), ...(input || {}) };
    const values = { ...(resumed?.values || {}) };
    const results = [...(resumed?.results || [])];
    const context = options.context || {};
    const signal = options.signal || context.signal;
    let nextStep = resumed?.nextStep || 0;

    const snapshot = () => ({
      executionId,
      input: initialInput,
      nextStep,
      results,
      startedAt,
      values,
      workflowId: workflow.id,
    });
    const finish = async (status, extra = {}) => {
      const finishedAt = this.now();
      const result = {
        ok: [WORKFLOW_STATUSES.COMPLETED, WORKFLOW_STATUSES.PAUSED].includes(
          status
        ),
        status,
        workflowId: workflow.id,
        executionId,
        startedAt,
        finishedAt,
        durationMs: Math.max(0, finishedAt - startedAt),
        results,
        values,
        ...extra,
      };
      await this.emit({ type: "finish", workflow, result });
      return result;
    };

    await this.emit({
      type: resumed ? "resume" : "start",
      workflow,
      executionId,
      input: initialInput,
      context,
    });

    for (; nextStep < workflow.steps.length; nextStep += 1) {
      const step = workflow.steps[nextStep];
      const stepContext = {
        context,
        input: initialInput,
        results,
        values,
        workflow,
      };

      if (signal?.aborted) {
        return finish(WORKFLOW_STATUSES.CANCELLED, {
          error: { code: "ABORTED", message: "Workflow execution aborted" },
        });
      }
      if (typeof step.when === "function" && !step.when(stepContext)) {
        results.push({ stepId: step.id, status: "skipped" });
        continue;
      }

      if (typeof step.pause === "function") {
        const pause = step.pause(stepContext);
        if (pause) {
          return finish(WORKFLOW_STATUSES.PAUSED, {
            pause: { stepId: step.id, ...pause },
            resumeState: snapshot(),
          });
        }
        results.push({ stepId: step.id, status: "satisfied" });
        continue;
      }

      const stepStartedAt = this.now();
      let skillInput;
      try {
        skillInput =
          typeof step.input === "function"
            ? step.input(stepContext)
            : step.input || initialInput;
      } catch (error) {
        const finishedAt = this.now();
        const failure = {
          stepId: step.id,
          skill: step.skill,
          status: "failed",
          startedAt: stepStartedAt,
          finishedAt,
          durationMs: Math.max(0, finishedAt - stepStartedAt),
          error: { code: "INVALID_STEP_INPUT", message: errorMessage(error) },
        };
        results.push(failure);
        return finish(WORKFLOW_STATUSES.FAILED, { error: failure.error });
      }

      const skillResult = await this.gateway.execute(step.skill, skillInput, {
        ...context,
        signal,
        workflow: {
          executionId,
          id: workflow.id,
          stepId: step.id,
        },
      });
      const finishedAt = this.now();
      const traced = {
        stepId: step.id,
        skill: step.skill,
        status: skillResult.ok ? "completed" : "failed",
        startedAt: stepStartedAt,
        finishedAt,
        durationMs: Math.max(0, finishedAt - stepStartedAt),
        result: skillResult,
      };
      results.push(traced);

      if (!skillResult.ok) {
        if (skillResult.error?.code === "ABORTED") {
          return finish(WORKFLOW_STATUSES.CANCELLED, {
            error: skillResult.error,
          });
        }
        if (workflow.stopOnError !== false && step.stopOnError !== false) {
          return finish(WORKFLOW_STATUSES.FAILED, {
            error: skillResult.error,
          });
        }
      } else if (step.saveAs) {
        values[step.saveAs] = skillResult.data;
      }
    }

    return finish(WORKFLOW_STATUSES.COMPLETED, {
      output: workflow.output
        ? workflow.output({ input: initialInput, values })
        : values,
    });
  }

  resume(workflow, resumeState, input = {}, options = {}) {
    return this.execute(workflow, input, { ...options, resumeState });
  }
}

module.exports = {
  EducationalWorkflowExecutor,
  WORKFLOW_STATUSES,
  validateWorkflow,
};
