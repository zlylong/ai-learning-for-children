import type { AiProvider, DiagnosisInput, DiagnosisResult } from './types';

export class MockAiProvider implements AiProvider {
  async diagnoseWrongQuestion(input: DiagnosisInput): Promise<DiagnosisResult> {
    return {
      summary: `Mock 诊断：${input.subject} 题目需要补齐基础概念与解题步骤。`,
      weakKnowledgePoints: ['概念理解', '审题能力', '步骤表达'],
      suggestions: ['先复述题意', '回顾对应教材章节', '完成 3 道同类基础题'],
    };
  }
}
