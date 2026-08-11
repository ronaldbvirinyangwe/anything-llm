ALTER TABLE "course_assignments" ALTER COLUMN "moduleId" DROP NOT NULL;
ALTER TABLE "course_assignments"
  ADD COLUMN "teacherId" INTEGER,
  ADD COLUMN "subject" TEXT,
  ADD COLUMN "assignmentType" TEXT NOT NULL DEFAULT 'homework',
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN "maxPoints" DOUBLE PRECISION,
  ADD COLUMN "dueAt" TIMESTAMP(3),
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "submissionModes" JSONB,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "assignment_classes" (
  "id" SERIAL NOT NULL,
  "assignmentId" INTEGER NOT NULL,
  "classId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assignment_classes_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "student_assignment_submissions"
  ADD COLUMN "sourceClassId" INTEGER,
  ADD COLUMN "submissionText" TEXT,
  ADD COLUMN "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "firstSubmittedAt" TIMESTAMP(3),
  ADD COLUMN "scorePoints" DOUBLE PRECISION,
  ADD COLUMN "gradedAt" TIMESTAMP(3),
  ADD COLUMN "gradedByTeacherId" INTEGER,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "student_assignment_submissions" ALTER COLUMN "status" SET DEFAULT 'assigned';

CREATE INDEX "course_assignments_teacherId_status_dueAt_idx"
ON "course_assignments"("teacherId", "status", "dueAt");
CREATE UNIQUE INDEX "assignment_classes_assignmentId_classId_key"
ON "assignment_classes"("assignmentId", "classId");
CREATE INDEX "assignment_classes_classId_assignmentId_idx"
ON "assignment_classes"("classId", "assignmentId");
CREATE UNIQUE INDEX "student_assignment_submissions_assignmentId_studentId_key"
ON "student_assignment_submissions"("assignmentId", "studentId");
CREATE INDEX "student_assignment_submissions_sourceClassId_assignmentId_idx"
ON "student_assignment_submissions"("sourceClassId", "assignmentId");

ALTER TABLE "course_assignments"
ADD CONSTRAINT "course_assignments_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignment_classes"
ADD CONSTRAINT "assignment_classes_assignmentId_fkey"
FOREIGN KEY ("assignmentId") REFERENCES "course_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignment_classes"
ADD CONSTRAINT "assignment_classes_classId_fkey"
FOREIGN KEY ("classId") REFERENCES "education_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_assignment_submissions"
ADD CONSTRAINT "student_assignment_submissions_sourceClassId_fkey"
FOREIGN KEY ("sourceClassId") REFERENCES "education_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_assignment_submissions"
ADD CONSTRAINT "student_assignment_submissions_gradedByTeacherId_fkey"
FOREIGN KEY ("gradedByTeacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
