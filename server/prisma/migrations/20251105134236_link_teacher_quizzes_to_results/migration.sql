-- AlterTable
ALTER TABLE "quiz_results" ADD COLUMN     "quiz_code" TEXT,
ADD COLUMN     "shared_quiz_id" INTEGER;

-- AddForeignKey
ALTER TABLE "quiz_results" ADD CONSTRAINT "quiz_results_shared_quiz_id_fkey" FOREIGN KEY ("shared_quiz_id") REFERENCES "shared_quizzes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
