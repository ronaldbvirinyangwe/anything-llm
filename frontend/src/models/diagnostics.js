import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

const ROOT = "/system/diagnostics";

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
  if (!response.ok || data.success === false)
    throw new Error(data.error || "Diagnostic request failed");
  return data;
}

const Diagnostics = {
  list(options) {
    return request("", options);
  },
  create(subject) {
    return request("", {
      method: "POST",
      body: JSON.stringify({ subject }),
    });
  },
  get(id, options) {
    return request(`/${encodeURIComponent(id)}`, options);
  },
  submit(id, answers) {
    return request(`/${encodeURIComponent(id)}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
  },
};

export default Diagnostics;
