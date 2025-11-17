-- CreateTable
CREATE TABLE "quiz_feedback" (
    "id" SERIAL NOT NULL,
    "quiz_result_id" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "user_answer" TEXT NOT NULL,
    "correct_answer" TEXT,
    "feedback" TEXT,
    "is_correct" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_feedback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "quiz_feedback" ADD CONSTRAINT "quiz_feedback_quiz_result_id_fkey" FOREIGN KEY ("quiz_result_id") REFERENCES "quiz_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
