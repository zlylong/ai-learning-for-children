import { promptTemplateService } from '@/features/prompt-templates/service';
import type { LearningKnowledgePoint } from '@/features/learning-points/schema';

export async function generateMonthlyWrongSetExamPrompt(input: {
  grade: string;
  subject: string;
  textbookVersion: string;
  month: string;
  wrongCount: number;
  topKnowledgePoints: string[];
  summaryJson: unknown;
  learningPoints?: LearningKnowledgePoint[];
}) {
  return promptTemplateService.renderPrompt('generate-monthly-wrong-set-exam', {
    variables: {
      grade: input.grade,
      subject: input.subject,
      textbookVersion: input.textbookVersion,
      month: input.month,
      wrongCount: input.wrongCount,
      topKnowledgePoints: input.topKnowledgePoints,
      summaryJson: input.summaryJson,
    },
    learningPoints: input.learningPoints,
  });
}
