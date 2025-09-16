/*
  Warnings:

  - You are about to drop the column `classId` on the `quiz_questions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[signature]` on the table `quiz_questions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `courseId` to the `quiz_questions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `signature` to the `quiz_questions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."quiz_questions" DROP CONSTRAINT "quiz_questions_classId_fkey";

-- DropIndex
DROP INDEX "public"."quiz_questions_classId_idx";

-- AlterTable
ALTER TABLE "public"."quiz_questions" DROP COLUMN "classId",
ADD COLUMN     "courseId" TEXT NOT NULL,
ADD COLUMN     "difficulty" TEXT,
ADD COLUMN     "signature" TEXT NOT NULL,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "tokensGenerated" INTEGER,
ADD COLUMN     "topic" TEXT,
ADD COLUMN     "uses" INTEGER DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "quiz_questions_signature_key" ON "public"."quiz_questions"("signature");

-- CreateIndex
CREATE INDEX "quiz_questions_courseId_idx" ON "public"."quiz_questions"("courseId");

-- AddForeignKey
ALTER TABLE "public"."quiz_questions" ADD CONSTRAINT "quiz_questions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
