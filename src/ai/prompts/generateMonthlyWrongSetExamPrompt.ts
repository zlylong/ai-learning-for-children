export function generateMonthlyWrongSetExamPrompt(input: {
  grade: string;
  subject: string;
  textbookVersion: string;
  month: string;
  wrongCount: number;
  topKnowledgePoints: string[];
  summaryJson: unknown;
}) {
  return `你是一名中国中小学试卷命题老师。
请根据学生指定月份的错题和薄弱知识点，生成一张复习试卷。

学生信息：
- 年级：${input.grade}
- 学科：${input.subject}
- 教材版本：${input.textbookVersion}
- 月份：${input.month}

该月错题统计：
- 总错题数：${input.wrongCount}
- 高频错题知识点：${input.topKnowledgePoints.join('、')}
- 错题详情摘要：
${JSON.stringify(input.summaryJson, null, 2)}

输出要求：
1. 请生成一张复习试卷，包含题目列表。
2. 题目数量建议 20 题左右。
3. 题目分布：
   - 70% 覆盖高频错题知识点。
   - 20% 覆盖相邻或前置知识点。
   - 10% 为综合应用题。
4. 规则：
   - 不要直接照抄原错题，可以改编。
   - 所有题目必须适合该年级（${input.grade}）。
   - 题干不能泄露答案。
   - single_choice 必须有 4 个选项。
   - difficulty 只能是 easy、medium、hard。
   - questionType 只能是 single_choice、fill_blank、short_answer。

输出 JSON 格式：
{
  "title": "${input.month}错题复习卷",
  "questions": [
    {
      "questionText": "...",
      "questionType": "single_choice | fill_blank | short_answer",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "...",
      "explanation": "...",
      "knowledgePointTitle": "...",
      "difficulty": "easy | medium | hard"
    }
  ]
}`;
}
