CREATE UNIQUE INDEX "student_quiz_assignments_quiz_id_student_id_key"
ON "student_quiz_assignments"("quiz_id", "student_id");
