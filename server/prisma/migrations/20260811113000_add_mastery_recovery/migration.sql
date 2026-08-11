CREATE TABLE "review_items" (
    "id" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctOption" TEXT NOT NULL,
    "explanation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "step" INTEGER NOT NULL DEFAULT 0,
    "dueOn" DATE,
    "masteredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "review_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "review_items_step_check" CHECK ("step" BETWEEN 0 AND 5),
    CONSTRAINT "review_items_status_check" CHECK ("status" IN ('active', 'mastered')),
    CONSTRAINT "review_items_state_check" CHECK (("status" = 'active' AND "dueOn" IS NOT NULL AND "masteredAt" IS NULL) OR ("status" = 'mastered' AND "dueOn" IS NULL AND "masteredAt" IS NOT NULL))
);

CREATE TABLE "review_sources" (
    "id" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "reviewItemId" UUID NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceQuestionKey" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "review_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "review_attempts" (
    "id" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "reviewItemId" UUID NOT NULL,
    "clientOperationId" UUID NOT NULL,
    "selectedOption" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "evidenceApplied" BOOLEAN NOT NULL,
    "disposition" TEXT NOT NULL,
    "stepBefore" INTEGER NOT NULL,
    "stepAfter" INTEGER NOT NULL,
    "dueOnAfter" DATE,
    "attemptedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "review_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "review_items_userId_fingerprint_key" ON "review_items"("userId", "fingerprint");
CREATE INDEX "review_items_userId_status_dueOn_idx" ON "review_items"("userId", "status", "dueOn");
CREATE UNIQUE INDEX "review_sources_userId_sourceType_sourceId_sourceQuestionKey_key" ON "review_sources"("userId", "sourceType", "sourceId", "sourceQuestionKey");
CREATE INDEX "review_sources_reviewItemId_occurredAt_idx" ON "review_sources"("reviewItemId", "occurredAt");
CREATE UNIQUE INDEX "review_attempts_userId_clientOperationId_key" ON "review_attempts"("userId", "clientOperationId");
CREATE INDEX "review_attempts_reviewItemId_attemptedAt_idx" ON "review_attempts"("reviewItemId", "attemptedAt");

ALTER TABLE "review_items" ADD CONSTRAINT "review_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_sources" ADD CONSTRAINT "review_sources_reviewItemId_fkey" FOREIGN KEY ("reviewItemId") REFERENCES "review_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_attempts" ADD CONSTRAINT "review_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_attempts" ADD CONSTRAINT "review_attempts_reviewItemId_fkey" FOREIGN KEY ("reviewItemId") REFERENCES "review_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
