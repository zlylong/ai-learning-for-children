import { describe, expect, it } from 'vitest';
import { childFormSchema } from './schema';

describe('childFormSchema', () => {
  it('rejects invalid mobile child profile form values', () => {
    const result = childFormSchema.safeParse({
      name: '',
      age: 0,
      grade: '',
      province: '',
      city: '',
      textbookVersion: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join('.'))).toContain('name');
      expect(result.error.issues.map((issue) => issue.path.join('.'))).toContain('age');
    }
  });

  it('accepts valid mobile child profile form values', () => {
    const result = childFormSchema.safeParse({
      name: '小红',
      age: 9,
      grade: '三年级',
      province: '广东省',
      city: '深圳市',
      textbookVersion: '人教版',
    });

    expect(result.success).toBe(true);
  });
});
