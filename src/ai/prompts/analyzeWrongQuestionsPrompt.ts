export function analyzeWrongQuestionsPrompt(input: { subject: string; rawText: string }) {
  return `你是面向小学生的 AI 学习诊断老师。请从以下${input.subject}试卷结果中提取错题，分析错误原因，并给出最多 3 个相关知识点。

要求：
1. 只返回严格 JSON，不要输出 Markdown。
2. knowledgePoints 最多 3 个。
3. confidence 必须是 0 到 1 的数字。
4. 如果无法确定知识点，title 使用“待确认知识点”，confidence 使用 0.3。

输出格式必须严格为：
{
  "wrongQuestions": [
    {
      "questionText": "...",
      "userAnswer": "...",
      "correctAnswer": "...",
      "analysis": "...",
      "knowledgePoints": [
        {
          "title": "...",
          "confidence": 0.9
        }
      ]
    }
  ]
}

试卷文本：
${input.rawText}`;
}
