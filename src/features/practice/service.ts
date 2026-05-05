import { practiceService as publicPracticeService, resetPracticeStoreForTest } from '../../services/practiceService';
import type { PracticeSessionCreateInput, PracticeSubmitInput } from './schema';

export const practiceService = {
  async createSession(input: PracticeSessionCreateInput) {
    const result = await publicPracticeService.createPracticeSession(input);
    const fullSession = await publicPracticeService.getPracticeSessionForResult(result.sessionId);
    return fullSession ?? result.session;
  },

  getSession(sessionId: string) {
    return publicPracticeService.getPracticeSession(sessionId);
  },

  async submitSession(sessionId: string, input: PracticeSubmitInput) {
    const result = await publicPracticeService.submitPracticeSession(sessionId, {
      answers: Object.fromEntries(input.answers.map((answer) => [answer.questionId, answer.userAnswer])),
    });
    return result.session;
  },
};

export { resetPracticeStoreForTest };
