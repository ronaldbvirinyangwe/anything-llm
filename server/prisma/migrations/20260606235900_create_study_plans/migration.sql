CREATE TABLE IF NOT EXISTS "study_plans" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "workspace_id" INTEGER NOT NULL,
  "subject" TEXT,
  "exam_date" TIMESTAMP(3),
  "topics" TEXT[],
  "study_hours" DOUBLE PRECISION NOT NULL,
  "days_off" TEXT[],
  "plan_content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sessions" JSONB NOT NULL DEFAULT '[]',
  "last_active" TIMESTAMPTZ(6),
  CONSTRAINT "study_plans_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "study_plans_user_id_idx" ON "study_plans"("user_id");
