import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";
import {
  cacheResource,
  cachedRequest,
  cachedResource,
  sendOrQueue,
} from "@/utils/offline";

const ROOT = "/system/review";

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
  if (!response.ok) {
    const error = new Error(data.error || "Review request failed");
    error.status = response.status;
    throw error;
  }
  return data;
}

const Review = {
  today(filters = {}) {
    const query = new URLSearchParams({
      timezoneOffset: String(new Date().getTimezoneOffset()),
    });
    if (filters.subject) query.set("subject", filters.subject);
    if (filters.topic) query.set("topic", filters.topic);
    const cacheKey = `${filters.subject || "all"}:${filters.topic || "all"}`;
    return cachedRequest("review-today", cacheKey, () =>
      request(`/today?${query.toString()}`)
    );
  },

  async attempt(itemId, selectedOption) {
    const payload = {
      selectedOption,
      attemptedAt: new Date().toISOString(),
      timezoneOffset: new Date().getTimezoneOffset(),
    };
    const result = await sendOrQueue({
      kind: "review-attempt",
      resourceId: itemId,
      path: `${ROOT}/${encodeURIComponent(itemId)}/attempt`,
      method: "POST",
      payload,
      coalesce: false,
      send: (operationId) =>
        request(`/${encodeURIComponent(itemId)}/attempt`, {
          method: "POST",
          headers: { "Idempotency-Key": operationId },
          body: JSON.stringify(payload),
        }),
    });
    for (const key of ["all:all"]) {
      const cached = await cachedResource("review-today", key).catch(
        () => null
      );
      if (cached?.items)
        await cacheResource("review-today", key, {
          ...cached,
          items: cached.items.filter((item) => item.id !== itemId),
          summary: {
            ...cached.summary,
            due: Math.max(0, cached.summary.due - 1),
          },
        });
    }
    const today = await cachedResource("student-today", "current").catch(
      () => null
    );
    if (today?.summary)
      await cacheResource("student-today", "current", {
        ...today,
        primaryAction:
          today.primaryAction?.kind === "review" ? null : today.primaryAction,
        summary: {
          ...today.summary,
          reviewDue: Math.max(0, (today.summary.reviewDue || 0) - 1),
        },
      });
    return result;
  },
};

export default Review;
