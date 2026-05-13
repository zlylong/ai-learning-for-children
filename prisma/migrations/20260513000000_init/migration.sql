-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ExamUploadStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "ChildKnowledgePointStatus" AS ENUM ('UNKNOWN', 'WEAK', 'PRACTICING', 'MASTERED');

-- CreateEnum
CREATE TYPE "PracticeSessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PracticeType" AS ENUM ('KNOWLEDGE_POINT', 'MONTHLY_WRONG_SET');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "phone" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Child" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "grade" TEXT,
    "province" TEXT,
    "city" TEXT,
    "textbookVersion" TEXT,
    "birthday" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Child_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Textbook" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "version" TEXT,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Textbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "textbookId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgePoint" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamUpload" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '数学',
    "title" TEXT NOT NULL,
    "fileUrl" TEXT,
    "rawText" TEXT NOT NULL,
    "imageCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ExamUploadStatus" NOT NULL DEFAULT 'PENDING',
    "resultJson" JSONB,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WrongQuestion" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "examUploadId" TEXT,
    "knowledgePointId" TEXT,
    "subject" TEXT NOT NULL DEFAULT '数学',
    "questionText" TEXT NOT NULL,
    "studentAnswer" TEXT,
    "userAnswer" TEXT,
    "correctAnswer" TEXT,
    "errorReason" TEXT,
    "knowledgePointText" TEXT,
    "answerText" TEXT,
    "analysis" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WrongQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WrongQuestionKnowledgePoint" (
    "id" TEXT NOT NULL,
    "wrongQuestionId" TEXT NOT NULL,
    "knowledgePointId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "WrongQuestionKnowledgePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildKnowledgePoint" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "knowledgePointId" TEXT,
    "knowledgePointText" TEXT,
    "status" "ChildKnowledgePointStatus" NOT NULL DEFAULT 'UNKNOWN',
    "masteryScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "practiceCount" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "lastPracticedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChildKnowledgePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeSession" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "type" "PracticeType" NOT NULL DEFAULT 'KNOWLEDGE_POINT',
    "title" TEXT NOT NULL,
    "subject" TEXT,
    "sourceMonth" TEXT,
    "summaryJson" JSONB,
    "status" "PracticeSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "knowledgePointText" TEXT,
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "difficulty" TEXT,
    "questionType" TEXT,
    "correctCount" INTEGER,
    "accuracy" INTEGER,
    "masteryBefore" TEXT,
    "masteryAfter" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeQuestion" (
    "id" TEXT NOT NULL,
    "practiceSessionId" TEXT NOT NULL,
    "sessionId" TEXT,
    "knowledgePointId" TEXT,
    "knowledgePointText" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "questionText" TEXT NOT NULL,
    "questionType" TEXT NOT NULL DEFAULT 'single_choice',
    "options" JSONB,
    "answer" TEXT NOT NULL DEFAULT '',
    "explanation" TEXT,
    "answerText" TEXT,
    "analysis" TEXT,
    "userAnswer" TEXT,
    "isCorrect" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "Child_userId_idx" ON "Child"("userId");

-- CreateIndex
CREATE INDEX "Textbook_subject_grade_idx" ON "Textbook"("subject", "grade");

-- CreateIndex
CREATE INDEX "Chapter_textbookId_order_idx" ON "Chapter"("textbookId", "order");

-- CreateIndex
CREATE INDEX "KnowledgePoint_chapterId_order_idx" ON "KnowledgePoint"("chapterId", "order");

-- CreateIndex
CREATE INDEX "ExamUpload_childId_uploadedAt_idx" ON "ExamUpload"("childId", "uploadedAt");

-- CreateIndex
CREATE INDEX "WrongQuestion_childId_createdAt_idx" ON "WrongQuestion"("childId", "createdAt");

-- CreateIndex
CREATE INDEX "WrongQuestion_knowledgePointId_idx" ON "WrongQuestion"("knowledgePointId");

-- CreateIndex
CREATE INDEX "WrongQuestionKnowledgePoint_knowledgePointId_idx" ON "WrongQuestionKnowledgePoint"("knowledgePointId");

-- CreateIndex
CREATE UNIQUE INDEX "WrongQuestionKnowledgePoint_wrongQuestionId_knowledgePointI_key" ON "WrongQuestionKnowledgePoint"("wrongQuestionId", "knowledgePointId");

-- CreateIndex
CREATE INDEX "ChildKnowledgePoint_knowledgePointId_idx" ON "ChildKnowledgePoint"("knowledgePointId");

-- CreateIndex
CREATE UNIQUE INDEX "ChildKnowledgePoint_childId_knowledgePointId_key" ON "ChildKnowledgePoint"("childId", "knowledgePointId");

-- CreateIndex
CREATE UNIQUE INDEX "ChildKnowledgePoint_childId_knowledgePointText_key" ON "ChildKnowledgePoint"("childId", "knowledgePointText");

-- CreateIndex
CREATE INDEX "PracticeSession_childId_startedAt_idx" ON "PracticeSession"("childId", "startedAt");

-- CreateIndex
CREATE INDEX "PracticeQuestion_practiceSessionId_idx" ON "PracticeQuestion"("practiceSessionId");

-- CreateIndex
CREATE INDEX "PracticeQuestion_knowledgePointId_idx" ON "PracticeQuestion"("knowledgePointId");

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_textbookId_fkey" FOREIGN KEY ("textbookId") REFERENCES "Textbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgePoint" ADD CONSTRAINT "KnowledgePoint_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamUpload" ADD CONSTRAINT "ExamUpload_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrongQuestion" ADD CONSTRAINT "WrongQuestion_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrongQuestion" ADD CONSTRAINT "WrongQuestion_examUploadId_fkey" FOREIGN KEY ("examUploadId") REFERENCES "ExamUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrongQuestion" ADD CONSTRAINT "WrongQuestion_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrongQuestionKnowledgePoint" ADD CONSTRAINT "WrongQuestionKnowledgePoint_wrongQuestionId_fkey" FOREIGN KEY ("wrongQuestionId") REFERENCES "WrongQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrongQuestionKnowledgePoint" ADD CONSTRAINT "WrongQuestionKnowledgePoint_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildKnowledgePoint" ADD CONSTRAINT "ChildKnowledgePoint_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildKnowledgePoint" ADD CONSTRAINT "ChildKnowledgePoint_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeQuestion" ADD CONSTRAINT "PracticeQuestion_practiceSessionId_fkey" FOREIGN KEY ("practiceSessionId") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeQuestion" ADD CONSTRAINT "PracticeQuestion_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

