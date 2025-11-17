-- CreateTable
CREATE TABLE "shared_quizzes" (
    "id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "quiz_code" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "difficulty" TEXT,
    "quiz_content" TEXT NOT NULL,
    "is_class_specific" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_quiz_assignments" (
    "id" SERIAL NOT NULL,
    "quiz_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "student_quiz_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shared_quizzes_quiz_code_key" ON "shared_quizzes"("quiz_code");

-- AddForeignKey
ALTER TABLE "shared_quizzes" ADD CONSTRAINT "shared_quizzes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_quiz_assignments" ADD CONSTRAINT "student_quiz_assignments_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "shared_quizzes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_quiz_assignments" ADD CONSTRAINT "student_quiz_assignments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
