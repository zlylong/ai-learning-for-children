export function generatePracticeQuestionsPrompt(input: {
  knowledgePointTitle: string;
  questionCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  questionType: 'single_choice' | 'fill_blank' | 'short_answer';
}) {
  return `你是面向小学生的 AI 练习题老师。请围绕知识点「${input.knowledgePointTitle}」生成 ${input.questionCount} 道 ${input.difficulty} 难度的 ${input.questionType} 练习题。

要求：
1. 只返回严格 JSON，不要输出 Markdown。
2. JSON 顶层必须是 questions 数组，数组长度必须为 ${input.questionCount}。
3. questionType 只能是 single_choice、fill_blank、short_answer。
4. single_choice 必须提供正好 4 个 options；fill_blank 和 short_answer 的 options 必须为空数组。
5. answer 和 explanation 必须存在且非空。
6. difficulty 只能是 easy、medium、hard。

输出格式：
{
  "questions": [
    {
      "questionText": "...",
      "questionType": "single_choice | fill_blank | short_answer",
      "options": [],
      "answer": "...",
      "explanation": "...",
      "knowledgePointTitle": "...",
      "difficulty": "easy | medium | hard"
    }
  ]
}`;
}
