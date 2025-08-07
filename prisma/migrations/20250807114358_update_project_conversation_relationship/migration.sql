/*
  Warnings:

  - A unique constraint covering the columns `[project_id]` on the table `conversations` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "conversations_project_id_key" ON "public"."conversations"("project_id");
