import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

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
    return request("/subjects", options);
  },

  list(options) {
    return request("", options);
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
    return request(`/lessons/${encodeURIComponent(lessonId)}`, options);
  },

  completeLesson(lessonId) {
    return request(`/lessons/${encodeURIComponent(lessonId)}/complete`, {
      method: "POST",
    });
  },

  assignment(assignmentId, options) {
    return request(`/assignments/${encodeURIComponent(assignmentId)}`, options);
  },

  submitAssignment(assignmentId, submissionLink) {
    return request(`/assignments/${encodeURIComponent(assignmentId)}/submit`, {
      method: "POST",
      body: JSON.stringify({ submissionLink }),
    });
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
