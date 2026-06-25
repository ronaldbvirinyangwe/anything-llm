/*
  Warnings:

  - A unique constraint covering the columns `[user_id]` on the table `parents` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "parents_user_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "parents_user_id_key" ON "parents"("user_id");
