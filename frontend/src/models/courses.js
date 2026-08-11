import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";
import {
  cacheResource,
  cachedRequest,
  coursePackDownloaded,
  downloadCoursePack,
  sendOrQueue,
} from "@/utils/offline";

const ROOT = "/system/courses";

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
    const error = new Error(data.error || "Course request failed");
    error.status = response.status;
    throw error;
  }

  return data;
}

const Courses = {
  subjects(options) {
    return cachedRequest("course-subjects", "all", () =>
      request("/subjects", options)
    );
  },

  list(options) {
    return cachedRequest("course-list", "all", () => request("", options));
  },

  generate(subject) {
    return request("/generate", {
      method: "POST",
      body: JSON.stringify({ subject }),
    });
  },

  generationStatus(subject, options) {
    const query = new URLSearchParams({ subject });
    return request(`/status?${query.toString()}`, options);
  },

  lesson(lessonId, options) {
    return cachedRequest("lesson", lessonId, () =>
      request(`/lessons/${encodeURIComponent(lessonId)}`, options)
    );
  },

  async completeLesson(lessonId) {
    const path = `${ROOT}/lessons/${encodeURIComponent(lessonId)}/complete`;
    const result = await sendOrQueue({
      kind: "lesson-completion",
      resourceId: lessonId,
      path,
      method: "POST",
      payload: {},
      send: (operationId) =>
        request(`/lessons/${encodeURIComponent(lessonId)}/complete`, {
          method: "POST",
          headers: { "Idempotency-Key": operationId },
        }),
    });
    const cached = await cachedRequest("lesson", lessonId, () =>
      Promise.reject(new Error("Use cached lesson"))
    ).catch(() => null);
    if (cached?.lesson) {
      await cacheResource("lesson", lessonId, {
        ...cached,
        lesson: { ...cached.lesson, done: true, pendingSync: result.queued },
      });
    }
    return result;
  },

  assignment(assignmentId, options) {
    return cachedRequest("course-assignment", assignmentId, () =>
      request(`/assignments/${encodeURIComponent(assignmentId)}`, options)
    );
  },

  async submitAssignment(assignmentId, submissionLink) {
    const path = `${ROOT}/assignments/${encodeURIComponent(assignmentId)}/submit`;
    const payload = { submissionLink };
    const result = await sendOrQueue({
      kind: "course-assignment-submission",
      resourceId: assignmentId,
      path,
      method: "POST",
      payload,
      send: (operationId) =>
        request(`/assignments/${encodeURIComponent(assignmentId)}/submit`, {
          method: "POST",
          headers: { "Idempotency-Key": operationId },
          body: JSON.stringify(payload),
        }),
    });
    const cached = await cachedRequest("course-assignment", assignmentId, () =>
      Promise.reject(new Error("Use cached assignment"))
    ).catch(() => null);
    if (cached?.assignment) {
      await cacheResource("course-assignment", assignmentId, {
        ...cached,
        assignment: {
          ...cached.assignment,
          status: "submitted",
          submissionLink,
          pendingSync: result.queued,
        },
      });
    }
    return result;
  },

  download(course) {
    return downloadCoursePack(course);
  },

  isDownloaded(courseId) {
    return coursePackDownloaded(courseId);
  },

  generateModule(moduleId) {
    return request(`/modules/${encodeURIComponent(moduleId)}/generate`, {
      method: "POST",
    });
  },

  moduleStatus(moduleId, options) {
    return request(`/modules/${encodeURIComponent(moduleId)}/status`, options);
  },
};

export default Courses;
