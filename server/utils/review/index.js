const crypto = require("crypto");

const CORRECT_INTERVALS = [1, 3, 7, 14, 30];

function dateOnly(value = new Date(), timezoneOffset = 0) {
  const date = new Date(value);
  const shifted = new Date(date.getTime() - timezoneOffset * 60_000);
  return new Date(`${shifted.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function contentFingerprint({ subject, topic, prompt, correctOption }) {
  const canonical = [subject, topic, prompt, correctOption]
    .map((value) => String(value || "").trim().toLowerCase())
    .join("\n");
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

async function seedReviewItem(transaction, input) {
  const sourceWhere = {
    userId_sourceType_sourceId_sourceQuestionKey: {
      userId: input.userId,
      sourceType: input.sourceType,
      sourceId: String(input.sourceId),
      sourceQuestionKey: String(input.sourceQuestionKey),
    },
  };
  const existingSource = await transaction.review_sources.findUnique({
    where: sourceWhere,
  });
  if (existingSource) return existingSource.reviewItemId;

  const fingerprint = contentFingerprint(input);
  const occurredAt = input.occurredAt || new Date();
  const dueOn = dateOnly(occurredAt);
  const item = await transaction.review_items.upsert({
    where: {
      userId_fingerprint: { userId: input.userId, fingerprint },
    },
    update: {
      subject: input.subject,
      topic: input.topic,
      prompt: input.prompt,
      options: input.options,
      correctOption: input.correctOption,
      explanation: input.explanation || null,
      status: "active",
      step: 0,
      dueOn,
      masteredAt: null,
    },
    create: {
      userId: input.userId,
      fingerprint,
      subject: input.subject,
      topic: input.topic,
      prompt: input.prompt,
      options: input.options,
      correctOption: input.correctOption,
      explanation: input.explanation || null,
      dueOn,
    },
  });
  await transaction.review_sources.create({
    data: {
      userId: input.userId,
      reviewItemId: item.id,
      sourceType: input.sourceType,
      sourceId: String(input.sourceId),
      sourceQuestionKey: String(input.sourceQuestionKey),
      occurredAt,
    },
  });
  return item.id;
}

function publicReviewItem(item, today = dateOnly()) {
  const overdueDays = Math.max(
    0,
    Math.floor((today.getTime() - item.dueOn.getTime()) / 86_400_000)
  );
  return {
    id: item.id,
    subject: item.subject,
    topic: item.topic,
    prompt: item.prompt,
    options: item.options,
    step: item.step,
    dueOn: item.dueOn,
    overdueDays,
  };
}

module.exports = {
  CORRECT_INTERVALS,
  addDays,
  dateOnly,
  publicReviewItem,
  seedReviewItem,
};
