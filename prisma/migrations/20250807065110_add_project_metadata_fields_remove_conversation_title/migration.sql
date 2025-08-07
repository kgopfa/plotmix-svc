/*
  Warnings:

  - You are about to drop the column `title` on the `conversations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."conversations" DROP COLUMN "title";

-- AlterTable
ALTER TABLE "public"."projects" ADD COLUMN     "description" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "title" TEXT;
