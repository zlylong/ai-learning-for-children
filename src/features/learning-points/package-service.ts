import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { learningPointCatalogSchema, learningPointManifestSchema, type LearningPointCatalog } from './schema';

const catalogRoot = path.join(process.cwd(), 'data', 'learning-points');
const manifestPath = path.join(catalogRoot, 'manifest.json');

export const learningPointPackageUploadSchema = z.object({
  catalog: learningPointCatalogSchema,
  replace: z.boolean().default(true),
});

export type LearningPointPackageUpload = z.infer<typeof learningPointPackageUploadSchema>;

function safeCatalogRelativePath(catalog: LearningPointCatalog) {
  const grade = catalog.grade.code.toLowerCase();
  const subject = catalog.subject.code;
  const version = catalog.textbook.version.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 48) || 'default';
  return path.join(grade, `${subject}.${version}.json`);
}

async function readManifest() {
  const raw = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as unknown;
  return learningPointManifestSchema.parse(raw);
}

export async function listLearningPointCatalogPackages() {
  const manifest = await readManifest();
  const packages = await Promise.all(manifest.files.map(async (file) => {
    const resolved = path.resolve(catalogRoot, file.path);
    if (!resolved.startsWith(catalogRoot + path.sep)) throw new Error('Invalid learning point catalog path');
    const catalog = learningPointCatalogSchema.parse(JSON.parse(await fs.readFile(resolved, 'utf8')) as unknown);
    return {
      grade: file.grade,
      subject: file.subject,
      version: file.version,
      path: file.path,
      textbookName: catalog.textbook.name,
      chapterCount: catalog.chapters.length,
      pointCount: catalog.chapters.reduce((sum, chapter) => sum + chapter.knowledgePoints.length, 0),
      updatedAt: catalog.updatedAt,
    };
  }));
  return {
    catalogVersion: manifest.catalogVersion,
    updatedAt: manifest.updatedAt,
    packageCount: packages.length,
    packages,
  };
}

export async function exportSampleLearningPointCatalog() {
  const manifest = await readManifest();
  const first = manifest.files[0];
  if (!first) return null;
  const resolved = path.resolve(catalogRoot, first.path);
  if (!resolved.startsWith(catalogRoot + path.sep)) throw new Error('Invalid learning point catalog path');
  return learningPointCatalogSchema.parse(JSON.parse(await fs.readFile(resolved, 'utf8')) as unknown);
}

export async function installLearningPointCatalogPackage(input: LearningPointPackageUpload) {
  const { catalog, replace } = learningPointPackageUploadSchema.parse(input);
  const relativePath = safeCatalogRelativePath(catalog);
  const absolutePath = path.resolve(catalogRoot, relativePath);
  if (!absolutePath.startsWith(catalogRoot + path.sep)) throw new Error('Invalid catalog package path');

  const manifest = await readManifest();
  const exists = manifest.files.some((file) => file.grade === catalog.grade.code && file.subject === catalog.subject.code && file.version === catalog.textbook.version);
  if (exists && !replace) throw new Error('同年级/学科/版本的知识点包已存在');

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');

  manifest.files = manifest.files.filter((file) => !(file.grade === catalog.grade.code && file.subject === catalog.subject.code && file.version === catalog.textbook.version));
  manifest.files.push({
    grade: catalog.grade.code,
    subject: catalog.subject.code,
    version: catalog.textbook.version,
    path: relativePath.split(path.sep).join('/'),
  });
  manifest.files.sort((a, b) => `${a.grade}-${a.subject}-${a.version}`.localeCompare(`${b.grade}-${b.subject}-${b.version}`));
  manifest.updatedAt = new Date().toISOString();
  if (!manifest.gradeRange.includes(catalog.grade.code)) manifest.gradeRange.push(catalog.grade.code);
  if (!manifest.subjects.some((subject) => subject.code === catalog.subject.code)) manifest.subjects.push(catalog.subject);

  learningPointManifestSchema.parse(manifest);
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return {
    grade: catalog.grade.code,
    subject: catalog.subject.code,
    version: catalog.textbook.version,
    path: relativePath.split(path.sep).join('/'),
    chapterCount: catalog.chapters.length,
    pointCount: catalog.chapters.reduce((sum, chapter) => sum + chapter.knowledgePoints.length, 0),
    replaced: exists,
  };
}
