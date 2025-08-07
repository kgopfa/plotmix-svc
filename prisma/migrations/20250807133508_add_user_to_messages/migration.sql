/*
  Warnings:

  - Added the required column `user_id` to the `messages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- First add the column as nullable
ALTER TABLE "public"."messages" ADD COLUMN "user_id" TEXT;

-- Update existing messages to link them to the conversation owner
UPDATE "public"."messages" 
SET "user_id" = (
  SELECT "user_id" 
  FROM "public"."conversations" 
  WHERE "conversations"."id" = "messages"."conversation_id"
);

-- Now make the column required
ALTER TABLE "public"."messages" ALTER COLUMN "user_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
