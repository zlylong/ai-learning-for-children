import { MockAiProvider } from './mock-provider';
import type { AiProvider } from './types';

export function createAiProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER ?? 'mock';

  if (provider !== 'mock') {
    throw new Error(`Unsupported AI_PROVIDER: ${provider}. Only mock is implemented.`);
  }

  return new MockAiProvider();
}

export type { AiProvider, DiagnosisInput, DiagnosisResult } from './types';
