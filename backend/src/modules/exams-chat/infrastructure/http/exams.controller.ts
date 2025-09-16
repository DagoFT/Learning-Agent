// infrastructure/http/exams.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { GenerateOptionsForQuestionUseCase } from '../../application/usecases/generate-options-for-question.usecase';
import { GetOrGenerateQuestionUseCase } from '../../application/usecases/get-or-generate-question.usecase';

@Controller('exams-chat')
export class ExamsChatController {
  constructor(
    private readonly getOrGenerateQuestionUseCase: GetOrGenerateQuestionUseCase,
    private readonly generateOptionsUseCase: GenerateOptionsForQuestionUseCase
  ) {}

  @Post('generate-question')
  async generateQuestion(@Body() body: { prompt: string; examId?: string; userId?: string }) {
    return this.getOrGenerateQuestionUseCase.execute({ prompt: body.prompt, examId: body.examId, userId: body.userId });
  }

  @Post('generate-options')
  async generateOptions(@Body() body: { questionId?: string; prompt?: string; examId?: string; userId?: string }) {
    return this.generateOptionsUseCase.execute({ questionId: body.questionId, prompt: body.prompt, examId: body.examId, userId: body.userId });
  }
}
