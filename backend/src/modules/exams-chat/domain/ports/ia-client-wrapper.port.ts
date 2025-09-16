export interface IaClientWrapper {
  generateQuestion(prompt: string, options?: { classId?: string; contextTexts?: string[] }): Promise<{
    questionText: string;
    options?: string[];
    tokensUsed: number;
  }>;
}
