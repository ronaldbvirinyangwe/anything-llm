DROP INDEX IF EXISTS "students_user_id_idx";
DROP INDEX IF EXISTS "teachers_user_id_idx";

CREATE UNIQUE INDEX "students_user_id_key" ON "students"("user_id");
CREATE UNIQUE INDEX "teachers_user_id_key" ON "teachers"("user_id");
