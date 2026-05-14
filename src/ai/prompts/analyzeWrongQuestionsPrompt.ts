import { promptTemplateService } from '@/features/prompt-templates/service';
import type { LearningKnowledgePoint } from '@/features/learning-points/schema';

export async function analyzeWrongQuestionsPrompt(input: {
  subject: string;
  rawText: string;
  learningPoints?: LearningKnowledgePoint[];
}) {
  return promptTemplateService.renderPrompt('analyze-wrong-questions', {
    variables: {
      subject: input.subject,
      rawText: input.rawText,
    },
    learningPoints: input.learningPoints,
  });
}
