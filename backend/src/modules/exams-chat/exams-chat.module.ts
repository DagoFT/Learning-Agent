import { Module } from '@nestjs/common';
import { ExamsChatController } from './infrastructure/http/exams.controller';
import { AIQuestionGenerator } from './infrastructure/ai/ai-question.generator';
import { EXAM_AI_GENERATOR, EXAM_QUESTION_REPO } from './tokens';
import { GenerateOptionsForQuestionUseCase } from './application/usecases/generate-options-for-question.usecase';
import { GetOrGenerateQuestionUseCase } from './application/usecases/get-or-generate-question.usecase';
import { PublishGeneratedQuestionUseCase } from './application/usecases/publish-generated-question.usecase';
import { PrismaQuestionRepositoryAdapter } from './infrastructure/persistance/prisma-question-repository.adapter';
import { PrismaAuditRepositoryAdapter } from './infrastructure/persistance/prisma-audit-repository.adapter';
import { InMemoryMetricsService } from './infrastructure/persistance/in-memory-metrics.service';
import { DeepseekModule } from '../deepseek/deepseek.module';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { DocumentsModule } from '../repository_documents/documents.module';

@Module({
  imports: [DeepseekModule, PrismaModule, DocumentsModule],
  controllers: [ExamsChatController],
  providers: [
    { provide: EXAM_AI_GENERATOR, useClass: AIQuestionGenerator },
    { provide: EXAM_QUESTION_REPO, useClass: PrismaQuestionRepositoryAdapter },
    { provide: 'AUDIT_REPO', useClass: PrismaAuditRepositoryAdapter },
    { provide: 'METRICS_SERVICE', useClass: InMemoryMetricsService },
    GenerateOptionsForQuestionUseCase,
    GetOrGenerateQuestionUseCase,
    PublishGeneratedQuestionUseCase,
  ],
})
export class ExamsChatModule {}
