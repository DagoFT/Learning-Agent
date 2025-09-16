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
  async generateQuestion(@Body() body: { prompt: string; courseId?: string; userId?: string }) {
    return this.getOrGenerateQuestionUseCase.execute({ prompt: body.prompt, courseId: body.courseId, userId: body.userId });
  }

  @Post('generate-options')
  async generateOptions(@Body() body: { questionId?: string; prompt?: string; courseId?: string; userId?: string }) {
    return this.generateOptionsUseCase.execute({ questionId: body.questionId, prompt: body.prompt, courseId: body.courseId, userId: body.userId });
  }
}
