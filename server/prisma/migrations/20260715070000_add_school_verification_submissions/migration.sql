CREATE TABLE "school_verification_submissions" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "submittedBy" INTEGER NOT NULL,
    "proposedName" TEXT,
    "schoolLevel" TEXT NOT NULL,
    "provinceId" INTEGER NOT NULL,
    "districtId" INTEGER NOT NULL,
    "sector" TEXT NOT NULL,
    "responsibleAuthority" TEXT NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" INTEGER,
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "school_verification_submissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "school_verification_submissions_schoolId_status_idx" ON "school_verification_submissions"("schoolId", "status");
CREATE INDEX "school_verification_submissions_submittedBy_idx" ON "school_verification_submissions"("submittedBy");
CREATE INDEX "school_verification_submissions_status_createdAt_idx" ON "school_verification_submissions"("status", "createdAt");

ALTER TABLE "school_verification_submissions" ADD CONSTRAINT "school_verification_submissions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "school_verification_submissions" ADD CONSTRAINT "school_verification_submissions_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "school_verification_submissions" ADD CONSTRAINT "school_verification_submissions_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
