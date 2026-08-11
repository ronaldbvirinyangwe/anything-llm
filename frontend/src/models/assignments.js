import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";
import { cacheResource, cachedRequest, sendOrQueue } from "@/utils/offline";

const ROOT = "/system/assignments";

async function request(path = "", options = {}) {
  const response = await fetch(`${API_BASE}${ROOT}${path}`, {
    ...options,
    headers: {
      ...baseHeaders(),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const error = new Error(data.error || "Assignment request failed");
    error.status = response.status;
    throw error;
  }
  return data;
}

const Assignments = {
  audiences(options) {
    return request("/audiences", options);
  },
  teacherList(options) {
    return request("/teacher", options);
  },
  create(payload) {
    return request("", { method: "POST", body: JSON.stringify(payload) });
  },
  publish(id) {
    return request(`/teacher/${id}/publish`, { method: "POST" });
  },
  submissions(id, options) {
    return request(`/teacher/${id}/submissions`, options);
  },
  grade(id, studentId, payload) {
    return request(`/teacher/${id}/submissions/${studentId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  gradebook(audienceKey, options) {
    const query = new URLSearchParams({ audienceKey });
    return request(`/gradebook?${query}`, options);
  },
  studentList(options) {
    return cachedRequest("student-assignments", "all", () =>
      request("/me", options)
    );
  },
  studentDetail(id, options) {
    return cachedRequest("student-assignment", id, () =>
      request(`/me/${id}`, options)
    );
  },
  async submit(id, payload) {
    const path = `${ROOT}/me/${encodeURIComponent(id)}/submission`;
    const result = await sendOrQueue({
      kind: "student-assignment-submission",
      resourceId: id,
      path,
      method: "PUT",
      payload,
      send: (operationId) =>
        request(`/me/${id}/submission`, {
          method: "PUT",
          headers: { "Idempotency-Key": operationId },
          body: JSON.stringify(payload),
        }),
    });
    const detail = await cachedRequest("student-assignment", id, () =>
      Promise.reject(new Error("Use cached assignment"))
    ).catch(() => null);
    const submittedAt = new Date().toISOString();
    if (detail?.assignment) {
      await cacheResource("student-assignment", id, {
        ...detail,
        assignment: {
          ...detail.assignment,
          ...payload,
          submittedAt,
          studentStatus: "submitted",
          pendingSync: result.queued,
        },
      });
    }
    const list = await cachedRequest("student-assignments", "all", () =>
      Promise.reject(new Error("Use cached assignments"))
    ).catch(() => null);
    if (list?.assignments) {
      await cacheResource("student-assignments", "all", {
        ...list,
        assignments: list.assignments.map((assignment) =>
          assignment.id === Number(id)
            ? {
                ...assignment,
                submitted: true,
                studentStatus: "submitted",
                pendingSync: result.queued,
              }
            : assignment
        ),
      });
    }
    return result;
  },
};

export default Assignments;
