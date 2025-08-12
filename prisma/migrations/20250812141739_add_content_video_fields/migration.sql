-- CreateEnum
CREATE TYPE "public"."ContentVideoStatus" AS ENUM ('pending', 'ready', 'failed');

-- AlterTable
ALTER TABLE "public"."projects" ADD COLUMN     "contentVideoKey" TEXT,
ADD COLUMN     "contentVideoStatus" "public"."ContentVideoStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "contentVideoUrl" TEXT;
