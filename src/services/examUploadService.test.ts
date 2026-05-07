import { beforeEach, describe, expect, it } from 'vitest';
import { examUploadService, resetExamUploadServiceForTest } from './examUploadService';

describe('examUploadService', () => {
  beforeEach(() => {
    resetExamUploadServiceForTest();
  });

  it('creates a pending upload then processes validated AI output into wrong questions and weak mastery', async () => {
    const upload = await examUploadService.createExamUpload({
      childId: 'demo-child-1',
      subject: '数学',
      rawText: '题目：36 + 27 = ?\n学生答案：62\n正确答案：63',
    });

    expect(upload.status).toBe('PENDING');

    const result = await examUploadService.processExamUpload(upload.id);

    expect(result.upload.status).toBe('DONE');
    expect(result.wrongQuestions).toHaveLength(2);
    expect(result.wrongQuestions[0]).toMatchObject({
      childId: 'demo-child-1',
      subject: '数学',
      userAnswer: expect.any(String),
      correctAnswer: expect.any(String),
      analysis: expect.any(String),
      source: upload.id,
    });
    expect(result.wrongQuestions[0].knowledgePoints[0]).toMatchObject({
      title: expect.any(String),
      confidence: expect.any(Number),
    });

    const mastery = examUploadService.getMemoryChildKnowledgePoint('demo-child-1', result.wrongQuestions[0].knowledgePoints[0].knowledgePointId);
    expect(mastery).toMatchObject({ status: 'WEAK', wrongCount: 1 });
    expect(examUploadService.listMemoryChildKnowledgePoints('demo-child-1')[0]).toMatchObject({
      childId: 'demo-child-1',
      knowledgePointId: result.wrongQuestions[0].knowledgePoints[0].knowledgePointId,
      knowledgePointText: result.wrongQuestions[0].knowledgePoints[0].title,
      status: 'WEAK',
      wrongCount: 1,
    });
  });

  it('is idempotent when processing an already completed upload', async () => {
    const upload = await examUploadService.createExamUpload({
      childId: 'demo-child-1',
      subject: '数学',
      rawText: '题目：36 + 27 = ?\n学生答案：62\n正确答案：63',
    });

    const first = await examUploadService.processExamUpload(upload.id);
    const second = await examUploadService.processExamUpload(upload.id);
    const allWrongQuestions = await examUploadService.listWrongQuestions('demo-child-1');
    const mastery = examUploadService.getMemoryChildKnowledgePoint('demo-child-1', first.wrongQuestions[0].knowledgePoints[0].knowledgePointId);

    expect(second.wrongQuestions).toHaveLength(first.wrongQuestions.length);
    expect(allWrongQuestions).toHaveLength(first.wrongQuestions.length);
    expect(mastery?.wrongCount).toBe(1);
  });

  it('marks upload failed and does not persist wrong questions when AI output is invalid', async () => {
    const upload = await examUploadService.createExamUpload({
      childId: 'demo-child-1',
      subject: '数学',
      rawText: 'INVALID_AI_OUTPUT',
    });

    await expect(examUploadService.processExamUpload(upload.id)).rejects.toThrow('AI 错题分析结果校验失败');

    const failed = await examUploadService.getExamUpload(upload.id);
    const wrongQuestions = await examUploadService.listWrongQuestions('demo-child-1');
    expect(failed?.status).toBe('FAILED');
    expect(wrongQuestions).toHaveLength(0);
  });
});
