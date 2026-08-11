CREATE TABLE "diagnostic_assessments" (
    "id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "curriculum" TEXT NOT NULL,
    "academicLevel" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'generating',
    "questionCount" INTEGER NOT NULL,
    "questions" JSONB,
    "responses" JSONB,
    "report" JSONB,
    "overallScore" INTEGER,
    "provider" TEXT,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    CONSTRAINT "diagnostic_assessments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "quiz_results" ADD COLUMN "diagnostic_assessment_id" UUID;

CREATE INDEX "diagnostic_assessments_user_id_status_idx"
ON "diagnostic_assessments"("user_id", "status");

CREATE INDEX "diagnostic_assessments_user_id_subject_createdAt_idx"
ON "diagnostic_assessments"("user_id", "subject", "createdAt");

CREATE INDEX "quiz_results_diagnostic_assessment_id_idx"
ON "quiz_results"("diagnostic_assessment_id");

CREATE UNIQUE INDEX "quiz_results_diagnostic_assessment_id_topic_key"
ON "quiz_results"("diagnostic_assessment_id", "topic");

ALTER TABLE "diagnostic_assessments"
ADD CONSTRAINT "diagnostic_assessments_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quiz_results"
ADD CONSTRAINT "quiz_results_diagnostic_assessment_id_fkey"
FOREIGN KEY ("diagnostic_assessment_id") REFERENCES "diagnostic_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
