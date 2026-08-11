import { API_BASE } from "@/utils/constants";
import { baseHeaders, userFromStorage } from "@/utils/request";

const DB_NAME = "chikoro-offline";
const DB_VERSION = 1;
const RESOURCE_STORE = "resources";
const OUTBOX_STORE = "outbox";
const LOW_DATA_PREFIX = "chikoro_low_data:";

function accountId() {
  return String(userFromStorage()?.id || "");
}

function accountScope(userId = accountId()) {
  return `${window.location.origin}|${userId}`;
}

function resourceKey(kind, id, userId = accountId()) {
  return `${accountScope(userId)}|${kind}|${id}`;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB)
      return reject(new Error("Offline storage unavailable"));
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(RESOURCE_STORE)) {
        const resources = database.createObjectStore(RESOURCE_STORE, {
          keyPath: "key",
        });
        resources.createIndex("account", "account", { unique: false });
      }
      if (!database.objectStoreNames.contains(OUTBOX_STORE)) {
        const outbox = database.createObjectStore(OUTBOX_STORE, {
          keyPath: "operationId",
        });
        outbox.createIndex("account", "account", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaction(storeName, mode, run) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    try {
      result = run(store);
    } catch (error) {
      database.close();
      reject(error);
      return;
    }
    tx.oncomplete = () => {
      database.close();
      resolve(result);
    };
    tx.onerror = () => {
      database.close();
      reject(tx.error);
    };
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheResource(kind, id, value) {
  const userId = accountId();
  if (!userId) return value;
  const record = {
    key: resourceKey(kind, id, userId),
    account: accountScope(userId),
    userId,
    kind,
    resourceId: String(id),
    value,
    updatedAt: Date.now(),
  };
  await transaction(RESOURCE_STORE, "readwrite", (store) => store.put(record));
  return value;
}

export async function cachedResource(kind, id) {
  const userId = accountId();
  if (!userId) return null;
  const database = await openDatabase();
  try {
    const tx = database.transaction(RESOURCE_STORE, "readonly");
    const record = await requestResult(
      tx.objectStore(RESOURCE_STORE).get(resourceKey(kind, id, userId))
    );
    return record?.value ?? null;
  } finally {
    database.close();
  }
}

export function lowDataEnabled(userId = accountId()) {
  if (!userId) return false;
  return (
    localStorage.getItem(`${LOW_DATA_PREFIX}${accountScope(userId)}`) === "1"
  );
}

export function setLowDataEnabled(enabled, userId = accountId()) {
  if (!userId) return;
  localStorage.setItem(
    `${LOW_DATA_PREFIX}${accountScope(userId)}`,
    enabled ? "1" : "0"
  );
  window.dispatchEvent(new CustomEvent("chikoro:offline-change"));
}

export async function cachedRequest(kind, id, fetcher) {
  const cached = await cachedResource(kind, id).catch(() => null);
  if (lowDataEnabled() && cached) return { ...cached, offlineSource: "cache" };
  try {
    const result = await fetcher();
    await cacheResource(kind, id, result).catch(() => {});
    return result;
  } catch (error) {
    if (error.name === "AbortError" || !cached) throw error;
    return { ...cached, offlineSource: "cache" };
  }
}

export async function downloadCoursePack(course) {
  await cacheResource("course-pack", course.id, {
    course,
    downloadedAt: Date.now(),
  });
  const writes = (course.modules || []).flatMap((module) => [
    ...(module.lessons || []).map((lesson) =>
      cacheResource("lesson", lesson.id, {
        success: true,
        lesson: {
          id: lesson.id,
          title: lesson.title,
          contentMd: lesson.contentMd,
          durationMin: lesson.durationMin,
          moduleId: module.id,
          moduleTitle: module.title,
          courseId: course.id,
          subject: course.subject,
          done: Boolean(lesson.done),
        },
      })
    ),
    ...(module.assignments || []).map((assignment) =>
      cacheResource("course-assignment", assignment.id, {
        success: true,
        assignment: {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          steps: assignment.stepsJson || assignment.steps,
          etaHours: assignment.etaHours,
          moduleId: module.id,
          status: assignment.status,
          submissionLink: assignment.submissionLink || null,
          feedback: assignment.feedback || null,
        },
      })
    ),
  ]);
  await Promise.all(writes);
  window.dispatchEvent(new CustomEvent("chikoro:offline-change"));
}

export async function coursePackDownloaded(courseId) {
  return Boolean(
    await cachedResource("course-pack", courseId).catch(() => null)
  );
}

async function outboxRecords(userId = accountId()) {
  if (!userId) return [];
  const database = await openDatabase();
  try {
    const tx = database.transaction(OUTBOX_STORE, "readonly");
    return await requestResult(
      tx.objectStore(OUTBOX_STORE).index("account").getAll(accountScope(userId))
    );
  } finally {
    database.close();
  }
}

export async function pendingMutationCount() {
  return (await outboxRecords().catch(() => [])).length;
}

export async function hasOfflineData(userId = accountId()) {
  if (!userId) return false;
  const database = await openDatabase().catch(() => null);
  if (!database) return false;
  try {
    const tx = database.transaction(RESOURCE_STORE, "readonly");
    const count = await requestResult(
      tx
        .objectStore(RESOURCE_STORE)
        .index("account")
        .count(accountScope(userId))
    );
    return count > 0;
  } finally {
    database.close();
  }
}

async function enqueueMutation(mutation) {
  const userId = accountId();
  if (!userId) throw new Error("Sign in before saving offline work");
  const records = await outboxRecords(userId);
  const superseded = mutation.coalesceKey
    ? records.filter((record) => record.coalesceKey === mutation.coalesceKey)
    : [];
  await transaction(OUTBOX_STORE, "readwrite", (store) => {
    superseded.forEach((record) => store.delete(record.operationId));
    store.put({
      ...mutation,
      userId,
      account: accountScope(userId),
      createdAt: Date.now(),
    });
  });
  window.dispatchEvent(new CustomEvent("chikoro:offline-change"));
}

export async function sendOrQueue({
  kind,
  resourceId,
  path,
  method,
  payload,
  send,
  coalesce = true,
}) {
  const operationId = crypto.randomUUID();
  try {
    if (!navigator.onLine) throw new TypeError("Offline");
    return await send(operationId);
  } catch (error) {
    if (
      error.status &&
      error.status < 500 &&
      ![408, 429].includes(error.status)
    ) {
      throw error;
    }
    await enqueueMutation({
      operationId,
      kind,
      resourceId: String(resourceId),
      coalesceKey: coalesce ? `${kind}:${resourceId}` : null,
      path,
      method,
      payload,
    });
    return { success: true, queued: true, operationId };
  }
}

export async function syncPendingMutations() {
  if (!navigator.onLine)
    return { synced: 0, pending: await pendingMutationCount() };
  const userId = accountId();
  const records = (await outboxRecords(userId)).sort(
    (left, right) => left.createdAt - right.createdAt
  );
  let synced = 0;
  for (const record of records) {
    if (record.userId !== accountId()) break;
    try {
      const response = await fetch(`${API_BASE}${record.path}`, {
        method: record.method,
        headers: {
          ...baseHeaders(),
          "Content-Type": "application/json",
          "Idempotency-Key": record.operationId,
        },
        body: JSON.stringify(record.payload),
      });
      if (response.status === 401 || response.status === 403) break;
      if (
        !response.ok &&
        (response.status >= 500 || [408, 429].includes(response.status))
      ) {
        break;
      }
      const responseData = await response.json().catch(() => ({}));
      await transaction(OUTBOX_STORE, "readwrite", (store) =>
        store.delete(record.operationId)
      );
      synced += 1;
      const settlement = {
        kind: record.kind,
        resourceId: record.resourceId,
        success: response.ok,
        error: null,
        data: response.ok ? responseData : null,
      };
      if (!response.ok) {
        settlement.error =
          responseData.error || "Saved work could not be synchronized";
        window.dispatchEvent(
          new CustomEvent("chikoro:sync-error", {
            detail: settlement,
          })
        );
      }
      await settleCachedMutation(settlement);
      window.dispatchEvent(
        new CustomEvent("chikoro:sync-settled", { detail: settlement })
      );
    } catch {
      break;
    }
  }
  const pending = await pendingMutationCount();
  window.dispatchEvent(
    new CustomEvent("chikoro:offline-change", { detail: { synced, pending } })
  );
  return { synced, pending };
}

async function settleCachedMutation(settlement) {
  const { kind, resourceId, success, error } = settlement;
  if (kind === "review-attempt") {
    if (!success) {
      await cacheResource("review-today", "all:all", null);
      await cacheResource("student-today", "current", null);
    }
    return;
  }
  if (kind === "lesson-completion") {
    const cached = await cachedResource("lesson", resourceId).catch(() => null);
    if (cached?.lesson)
      await cacheResource("lesson", resourceId, {
        ...cached,
        lesson: {
          ...cached.lesson,
          done: success,
          pendingSync: false,
          syncError: error,
        },
      });
    return;
  }
  if (kind === "course-assignment-submission") {
    const cached = await cachedResource("course-assignment", resourceId).catch(
      () => null
    );
    if (cached?.assignment)
      await cacheResource("course-assignment", resourceId, {
        ...cached,
        assignment: {
          ...cached.assignment,
          status: success ? "submitted" : "sync_failed",
          pendingSync: false,
          syncError: error,
        },
      });
    return;
  }
  if (kind !== "student-assignment-submission") return;
  const detail = await cachedResource("student-assignment", resourceId).catch(
    () => null
  );
  if (detail?.assignment)
    await cacheResource("student-assignment", resourceId, {
      ...detail,
      assignment: {
        ...detail.assignment,
        studentStatus: success ? "submitted" : "sync_failed",
        pendingSync: false,
        syncError: error,
      },
    });
  const list = await cachedResource("student-assignments", "all").catch(
    () => null
  );
  if (list?.assignments)
    await cacheResource("student-assignments", "all", {
      ...list,
      assignments: list.assignments.map((assignment) =>
        String(assignment.id) === String(resourceId)
          ? {
              ...assignment,
              studentStatus: success ? "submitted" : "sync_failed",
              pendingSync: false,
              syncError: error,
            }
          : assignment
      ),
    });
}
