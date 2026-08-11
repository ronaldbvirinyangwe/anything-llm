ALTER TABLE "quiz_results" ADD COLUMN "topic" TEXT;

CREATE INDEX "quiz_results_user_id_subject_idx"
ON "quiz_results"("user_id", "subject");
