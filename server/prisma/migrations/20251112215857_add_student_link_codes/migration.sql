-- CreateTable
CREATE TABLE "student_link_codes" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "code" VARCHAR(8) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_link_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_link_codes_code_key" ON "student_link_codes"("code");

-- AddForeignKey
ALTER TABLE "student_link_codes" ADD CONSTRAINT "student_link_codes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
