import { describe, expect, it } from 'vitest';
import { MockAiProvider } from './mock-provider';

describe('MockAiProvider', () => {
  it('returns deterministic diagnosis structure', async () => {
    const provider = new MockAiProvider();
    const result = await provider.diagnoseWrongQuestion({ subject: '数学', questionText: '1 + 1 = ?' });

    expect(result.summary).toContain('数学');
    expect(result.weakKnowledgePoints.length).toBeGreaterThan(0);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});
