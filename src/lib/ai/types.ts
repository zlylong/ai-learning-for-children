export type DiagnosisInput = {
  childId?: string;
  subject: string;
  questionText: string;
  answerText?: string;
};

export type DiagnosisResult = {
  summary: string;
  weakKnowledgePoints: string[];
  suggestions: string[];
};

export interface AiProvider {
  diagnoseWrongQuestion(input: DiagnosisInput): Promise<DiagnosisResult>;
}
