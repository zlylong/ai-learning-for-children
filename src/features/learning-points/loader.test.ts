import { describe, expect, it } from 'vitest';
import { learningPointCatalogSchema } from './schema';
import { listCatalogKnowledgePoints, loadLearningPointCatalog, normalizeGradeCode, normalizeSubjectCode } from './loader';

const sampleCatalog = {
  schemaVersion: 'learning-point-catalog/v1',
  catalogVersion: 'test',
  subject: { code: 'math', name: '数学' },
  grade: { code: 'G01', name: '一年级' },
  semester: 'all',
  textbook: { version: 'default', name: '通用版', publisher: null },
  generatedBy: { agent: 'learning', promptVersion: 'test' },
  chapters: [{
    id: 'ch_math_g01_001',
    title: '数与运算',
    order: 1,
    knowledgePoints: [{
      id: 'kp_math_g01_001_001',
      title: '20以内数的认识',
      order: 1,
      level: 'core',
      status: 'active',
      summary: '认识20以内的数。',
      aliases: ['20以内数'],
      objectives: { remember: ['记住数序'], understand: ['理解数的组成'], apply: ['能够比较大小'] },
      keyConcepts: ['数序'],
      prerequisites: [],
      relatedPoints: [],
      commonMistakes: [{ type: 'counting_skip', description: '漏数。', remediation: '借助实物点数。' }],
      explanation: {
        why: '20以内数是后续加减法的基础。',
        howToLearn: '先数实物，再读写数字，最后比较大小。',
        steps: ['点数实物并说出数量', '写出对应数字', '比较两个数量的大小'],
      },
      examples: [{
        question: '数一数：桌上有 12 根小棒，再添 3 根，一共有几根？',
        answer: '15 根。',
        analysis: '从 12 往后数 3 个数：13、14、15。',
        difficulty: 'easy',
        type: 'calculation',
      }],
      masteryCriteria: ['会读数', '会写数', '会比较'],
      practiceProfile: { recommendedQuestionTypes: ['single_choice'], difficultyRange: ['easy'], minCorrectRateForMastery: 0.85 },
      tags: ['基础'],
      teachingTags: ['基础', '常考'],
    }],
  }],
  updatedAt: '2026-05-08T00:00:00.000Z',
};

describe('LearningPointCatalog v1', () => {
  it('validates standard catalog structure', () => {
    expect(learningPointCatalogSchema.parse(sampleCatalog).chapters[0].knowledgePoints[0].id).toBe('kp_math_g01_001_001');
  });

  it('normalizes Chinese grade and subject labels', () => {
    expect(normalizeGradeCode('二年级')).toBe('G02');
    expect(normalizeGradeCode('g03')).toBe('G03');
    expect(normalizeGradeCode('七年级')).toBe('G07');
    expect(normalizeGradeCode('初三')).toBe('G09');
    expect(normalizeSubjectCode('数学')).toBe('math');
    expect(normalizeSubjectCode('english')).toBe('english');
  });

  it('loads checked-in catalog files for runtime use', async () => {
    const catalog = await loadLearningPointCatalog({ grade: '一年级', subject: '数学', version: '人教版' });
    expect(catalog?.grade.code).toBe('G01');
    expect(catalog?.chapters.length).toBeGreaterThan(0);

    const points = await listCatalogKnowledgePoints({ grade: 'G01', subject: 'math' });
    expect(points[0]).toMatchObject({
      knowledgePointId: expect.stringMatching(/^kp_math_g01_/),
      status: 'UNKNOWN',
      explanation: expect.objectContaining({ why: expect.any(String), howToLearn: expect.any(String) }),
      examples: expect.arrayContaining([expect.objectContaining({ question: expect.any(String), answer: expect.any(String), analysis: expect.any(String) })]),
      teachingTags: expect.arrayContaining([expect.stringMatching(/基础|易错|拔高|常考/)]),
    });
  });

  it('loads junior high catalog files', async () => {
    const catalog = await loadLearningPointCatalog({ grade: '七年级', subject: '数学', version: 'default' });
    expect(catalog?.grade.code).toBe('G07');
    expect(catalog?.chapters.flatMap((chapter) => chapter.knowledgePoints).length).toBeGreaterThan(0);

    const points = await listCatalogKnowledgePoints({ grade: '初三', subject: 'english' });
    expect(points[0].knowledgePointId).toMatch(/^kp_english_g09_/);
    expect(points[0].examples?.[0]).toEqual(expect.objectContaining({ question: expect.any(String), analysis: expect.any(String) }));
  });
});
