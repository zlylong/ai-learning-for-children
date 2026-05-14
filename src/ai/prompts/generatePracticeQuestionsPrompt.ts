import { promptTemplateService } from '@/features/prompt-templates/service';
import type { LearningKnowledgePoint } from '@/features/learning-points/schema';

export async function generatePracticeQuestionsPrompt(input: {
  knowledgePointTitle: string;
  questionCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  questionType: 'single_choice' | 'fill_blank' | 'short_answer' | 'mixed';
  learningPoints?: LearningKnowledgePoint[];
}) {
  const questionTypeInstruction = input.questionType === 'mixed'
    ? '单选题和填空题混合（single_choice 与 fill_blank 尽量均衡，题目数量为奇数时单选题可多 1 道）'
    : `${input.questionType} 题`;

  return promptTemplateService.renderPrompt('generate-practice-questions', {
    variables: {
      knowledgePointTitle: input.knowledgePointTitle,
      questionCount: input.questionCount,
      difficulty: input.difficulty,
      questionType: input.questionType,
      questionTypeInstruction,
    },
    learningPoints: input.learningPoints,
  });
}
