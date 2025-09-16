import { Injectable, Inject } from '@nestjs/common';
import type { QuestionRepositoryPort } from '../../domain/ports/question-repository.port';
import type { IaClientWrapper } from '../../domain/ports/ia-client-wrapper.port';
import type { AuditRepository } from '../../domain/ports/audit-repository.port';
import type { QuestionMetricsService } from '../../domain/ports/question-metrics-service.port';
import { createSignature } from '../../utils/createSignature';
import { EXAM_AI_GENERATOR, EXAM_QUESTION_REPO } from '../../tokens';
import { DOCUMENT_CHUNK_REPOSITORY_PORT } from 'src/modules/repository_documents/tokens';
import type { DocumentChunkRepositoryPort } from 'src/modules/repository_documents/domain/ports/document-chunk-repository.port';

@Injectable()
export class GetOrGenerateQuestionUseCase {
  private readonly ttlMs = 30 * 24 * 60 * 60 * 1000;
  private readonly chanceUseExisting = 0.5;
  private readonly dbChance = 0.4;
  private readonly minQuestionsForDbChoice = 20;
  private readonly maxStoredQuestions = 1000;

  constructor(
    @Inject(EXAM_QUESTION_REPO) private readonly repo: QuestionRepositoryPort,
    @Inject(EXAM_AI_GENERATOR) private readonly iaClient: IaClientWrapper,
    @Inject('AUDIT_REPO') private readonly audit: AuditRepository,
    @Inject('METRICS_SERVICE') private readonly metrics: QuestionMetricsService,
    @Inject(DOCUMENT_CHUNK_REPOSITORY_PORT) private readonly docChunks: DocumentChunkRepositoryPort,
  ) {}

  private isFallbackOptions(questionText: string, options: string[] | null | undefined): boolean {
    if (!options || options.length < 4) return true;
    const joined = options.join(' ').toLowerCase();
    const q = (questionText || '').toLowerCase();
    const simpleFallback = options.every(o => o.toLowerCase().includes(q) || o.toLowerCase().startsWith(q) || o.includes('— opción'));
    if (simpleFallback) return true;
    if (joined.length < 20) return true;
    return false;
  }

  async execute(input: { prompt: string; examId?: string; userId?: string }): Promise<{ id: string; question: string; cached: boolean }> {
    if (!input.prompt || !input.prompt.trim()) throw new Error('Prompt requerido');
    const now = new Date();
    const signature = createSignature({ text: input.prompt });

    const existing = await this.repo.findBySignature(signature);
    if (existing && existing.lastUsedAt && (now.getTime() - existing.lastUsedAt.getTime()) <= this.ttlMs) {
      existing.lastUsedAt = now;
      await this.repo.incrementUsage(existing.id, 0);
      await this.audit.record({
        questionId: existing.id,
        timestamp: now,
        userId: input.userId,
        examId: input.examId,
        signature,
        source: 'cached',
        tokensUsed: existing.tokensGenerated,
      });
      this.metrics.incrementCacheHits();
      this.metrics.addTokensSaved(existing.tokensGenerated);
      return { id: existing.id, question: existing.text, cached: true };
    }

    const allQuestions = await this.repo.findAll();
    const totalQuestions = allQuestions.length;

    const classCandidates = input.examId ? allQuestions.filter(q => q.examId === input.examId) : [];
    if (classCandidates.length > 0 && Math.random() < this.chanceUseExisting) {
      const pick = classCandidates[Math.floor(Math.random() * classCandidates.length)];
      await this.repo.incrementUsage(pick.id, 0);
      await this.audit.record({
        questionId: pick.id,
        timestamp: now,
        userId: input.userId,
        examId: input.examId,
        signature: pick.signature ?? signature,
        source: 'cached',
        tokensUsed: pick.tokensGenerated,
      });
      this.metrics.incrementCacheHits();
      this.metrics.addTokensSaved(pick.tokensGenerated);
      return { id: pick.id, question: pick.text, cached: true };
    }

    if (totalQuestions >= this.minQuestionsForDbChoice) {
      if (totalQuestions >= this.maxStoredQuestions || Math.random() < this.dbChance) {
        const pick = allQuestions[Math.floor(Math.random() * allQuestions.length)];
        await this.repo.incrementUsage(pick.id, 0);
        await this.audit.record({
          questionId: pick.id,
          timestamp: now,
          userId: input.userId,
          examId: input.examId,
          signature: pick.signature ?? signature,
          source: 'cached',
          tokensUsed: pick.tokensGenerated,
        });
        this.metrics.incrementCacheHits();
        this.metrics.addTokensSaved(pick.tokensGenerated);
        return { id: pick.id, question: pick.text, cached: true };
      }
    }

    if (!input.examId) throw new Error('No hay documentos para generar preguntas');

    const chunksResult = await this.docChunks.findByDocumentId(input.examId, { limit: 10, orderBy: 'chunkIndex', orderDirection: 'asc' });
    if (!chunksResult || (chunksResult.total ?? 0) === 0) throw new Error('No hay documentos para generar preguntas');

    const chunkTexts = chunksResult.chunks.map(c => c.content);
    const contextText = chunkTexts.join('\n').slice(0, 3000);
    const promptWithContext = `${input.prompt}\n\nBasado en el siguiente contenido:\n${contextText}`;

    const maxAttempts = 5;
    let generatedQuestionText = '';
    let generatedOptions: string[] | null = null;
    let tokensUsed = 0;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const generated = await this.iaClient.generateQuestion(promptWithContext);
      generatedQuestionText = (generated as any).questionText ?? (generated as any).question ?? '';
      tokensUsed = (generated as any).tokensUsed ?? 0;
      if (!generatedQuestionText || !generatedQuestionText.trim()) continue;
      if (typeof (this.iaClient as any).generateOptions === 'function') {
        const opts = await (this.iaClient as any).generateOptions(generatedQuestionText);
        generatedOptions = opts?.options ?? null;
        if (!this.isFallbackOptions(generatedQuestionText, generatedOptions)) break;
      } else {
        break;
      }
    }

    if (!generatedQuestionText || (generatedOptions && this.isFallbackOptions(generatedQuestionText, generatedOptions))) {
      throw new Error('No se pudo generar una pregunta válida');
    }

    const toSave: any = {
      id: undefined,
      text: generatedQuestionText,
      type: 'open_analysis',
      options: generatedOptions ?? null,
      status: 'generated',
      signature,
      examId: input.examId ?? null,
      createdAt: now,
      lastUsedAt: undefined,
      tokensGenerated: tokensUsed ?? 0,
      uses: 0,
      difficulty: undefined,
      topic: undefined,
    };

    const saved = await this.repo.save(toSave as any);

    await this.audit.record({
      questionId: saved.id,
      timestamp: now,
      userId: input.userId,
      examId: input.examId,
      signature,
      source: 'generated',
      tokensUsed,
    });

    this.metrics.incrementCacheMisses();
    this.metrics.addTokensGenerated(tokensUsed);

    return { id: saved.id, question: saved.text, cached: false };
  }
}
