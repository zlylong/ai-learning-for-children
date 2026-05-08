import { promises as fs } from 'node:fs';
import path from 'node:path';
import { learningGradeCodeSchema, learningPointCatalogSchema, learningPointManifestSchema, learningSubjectCodeSchema, type LearningGradeCode, type LearningPointCatalog, type LearningPointManifest, type LearningSubjectCode } from './schema';

const catalogRoot = path.join(process.cwd(), 'data', 'learning-points');
const manifestPath = path.join(catalogRoot, 'manifest.json');

const gradeNameToCode: Record<string, LearningGradeCode> = {
  一年级: 'G01',
  二年级: 'G02',
  三年级: 'G03',
  四年级: 'G04',
  五年级: 'G05',
  六年级: 'G06',
  '1年级': 'G01',
  '2年级': 'G02',
  '3年级': 'G03',
  '4年级': 'G04',
  '5年级': 'G05',
  '6年级': 'G06',
};

export function normalizeGradeCode(value: string | null | undefined): LearningGradeCode | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  const parsed = learningGradeCodeSchema.safeParse(upper);
  if (parsed.success) return parsed.data;
  return gradeNameToCode[trimmed] ?? null;
}

export function normalizeSubjectCode(value: string | null | undefined): LearningSubjectCode | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const alias: Record<string, LearningSubjectCode> = { 语文: 'chinese', 数学: 'math', 英语: 'english' };
  const lower = trimmed.toLowerCase();
  const parsed = learningSubjectCodeSchema.safeParse(lower);
  if (parsed.success) return parsed.data;
  return alias[trimmed] ?? null;
}

async function readJsonFile(filePath: string) {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as unknown;
}

export async function loadLearningPointManifest(): Promise<LearningPointManifest> {
  return learningPointManifestSchema.parse(await readJsonFile(manifestPath));
}

export async function loadLearningPointCatalog(input: { grade: string; subject: string; version?: string | null }): Promise<LearningPointCatalog | null> {
  const grade = normalizeGradeCode(input.grade);
  const subject = normalizeSubjectCode(input.subject);
  const requestedVersion = input.version?.trim() || 'default';
  if (!grade || !subject) return null;

  const manifest = await loadLearningPointManifest();
  const exact = manifest.files.find((file) => file.grade === grade && file.subject === subject && file.version === requestedVersion);
  const fallback = manifest.files.find((file) => file.grade === grade && file.subject === subject && file.version === 'default');
  const file = exact ?? fallback;
  if (!file) return null;

  const resolved = path.resolve(catalogRoot, file.path);
  if (!resolved.startsWith(catalogRoot + path.sep)) {
    throw new Error('Invalid learning point catalog path');
  }
  return learningPointCatalogSchema.parse(await readJsonFile(resolved));
}

export async function listCatalogKnowledgePoints(input: { grade: string; subject?: string | null; version?: string | null }) {
  const catalog = await loadLearningPointCatalog({ grade: input.grade, subject: input.subject ?? 'math', version: input.version });
  if (!catalog) return [];
  return catalog.chapters.flatMap((chapter) => chapter.knowledgePoints.map((point) => ({
    id: point.id,
    knowledgePointId: point.id,
    knowledgePointText: point.title,
    status: 'UNKNOWN' as const,
    masteryScore: 0,
    wrongCount: 0,
    practiceCount: 0,
    correctCount: 0,
    subject: catalog.subject.name,
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    summary: point.summary,
    tags: point.tags,
  })));
}
