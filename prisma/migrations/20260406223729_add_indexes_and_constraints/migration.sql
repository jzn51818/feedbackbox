-- CreateIndex
CREATE INDEX "feedback_created_at_idx" ON "feedback"("created_at");

-- CreateIndex
CREATE INDEX "feedback_category_idx" ON "feedback"("category");

-- CreateIndex
CREATE INDEX "feedback_status_idx" ON "feedback"("status");
