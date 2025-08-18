-- CreateTable
CREATE TABLE "public"."designer_prompts" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'applied',
    "resultVersion" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "designer_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "designer_prompts_project_id_createdAt_idx" ON "public"."designer_prompts"("project_id", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."designer_prompts" ADD CONSTRAINT "designer_prompts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."designer_prompts" ADD CONSTRAINT "designer_prompts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
