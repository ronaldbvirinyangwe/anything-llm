/*
  Warnings:

  - A unique constraint covering the columns `[teacherId,studentId,subject]` on the table `teacher_students` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "teacher_students_teacherId_studentId_key";

-- CreateIndex
CREATE UNIQUE INDEX "teacher_students_teacherId_studentId_subject_key" ON "teacher_students"("teacherId", "studentId", "subject");
