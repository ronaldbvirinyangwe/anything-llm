ALTER TABLE "education_classes" ADD COLUMN "departmentId" INTEGER;

CREATE INDEX "education_classes_departmentId_idx" ON "education_classes"("departmentId");

ALTER TABLE "education_classes" ADD CONSTRAINT "education_classes_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
