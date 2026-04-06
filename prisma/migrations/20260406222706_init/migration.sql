-- CreateEnum
CREATE TYPE "Category" AS ENUM ('BUG', 'FEATURE', 'GENERAL', 'OTHER');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('NEW', 'REVIEWED', 'RESOLVED');

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" "Category" NOT NULL DEFAULT 'GENERAL',
    "status" "Status" NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);
