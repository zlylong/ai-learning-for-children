export function now(): string {
  return new Date().toISOString();
}

export function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeAnswer(value: string): string {
  return value.trim().replace(/\s+/g, '').toLowerCase();
}

export function titleFromText(text: string, fallback = '试卷错题分析'): string {
  return text.split(/\n+/).find(Boolean)?.slice(0, 24) || fallback;
}

export function normalizeTitle(value: string): string {
  return value.trim().toLowerCase();
}
