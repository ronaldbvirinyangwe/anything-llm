-- CreateTable
CREATE TABLE "teacher_reviews" (
    "id" SERIAL NOT NULL,
    "quiz_result_id" INTEGER NOT NULL,
    "question_index" INTEGER NOT NULL,
    "answer_text" TEXT NOT NULL,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "teacher_comment" TEXT,
    "marks_awarded" INTEGER,

    CONSTRAINT "teacher_reviews_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "teacher_reviews" ADD CONSTRAINT "teacher_reviews_quiz_result_id_fkey" FOREIGN KEY ("quiz_result_id") REFERENCES "quiz_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
