/*
  Warnings:

  - Added the required column `subscription_updated_at` to the `students` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('pending', 'paid', 'none');

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "subscription_expiration_date" TIMESTAMP(3),
ADD COLUMN     "subscription_payment_poll_url" TEXT,
ADD COLUMN     "subscription_plan" TEXT,
ADD COLUMN     "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'none',
ADD COLUMN     "subscription_updated_at" TIMESTAMP(3) NOT NULL;
