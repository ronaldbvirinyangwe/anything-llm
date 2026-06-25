-- CreateTable
CREATE TABLE "weak_area_cards" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "wrongAnswer" TEXT,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT,
    "timesWrong" INTEGER NOT NULL DEFAULT 1,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "firstFlaggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastWrongAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weak_area_cards_pkey" PRIMARY KEY ("id")
);
