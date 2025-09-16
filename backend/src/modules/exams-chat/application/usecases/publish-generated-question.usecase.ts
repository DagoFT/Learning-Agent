// application/usecases/publish-generate-question.usecase.ts
import { Inject, Injectable } from '@nestjs/common';
import { Question } from '../../domain/entities/question.entity';
import type { QuestionRepositoryPort } from '../../domain/ports/question-repository.port';
import { EXAM_QUESTION_REPO } from '../../tokens';
import { createSignature } from '../../utils/createSignature';

export type PublishInput = {
  text: string;
  rawText?: string;
  examId?: string;
  options?: string[] | null;
  source?: string;
  rawMetadata?: Record<string, any>;
};

export type PublishResult =
  | { result: 'created'; questionId: string }
  | { result: 'duplicate' };

const MAX_CONTENT_LENGTH = 500;

function normalizeText(input: string): string {
  if (!input) return '';
  let t = input.replace(/<[^>]*>/g, ' ');
  t = t
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  try {
    t = t.normalize('NFKD').replace(/\p{Diacritic}/gu, '');
  } catch {
    t = t.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  }
  t = t.replace(/[^\p{L}\p{N}\s]+/gu, ' ');
  t = t.replace(/\s+/g, ' ').trim().toLowerCase();
  return t;
}

@Injectable()
export class PublishGeneratedQuestionUseCase {
  constructor(
    @Inject(EXAM_QUESTION_REPO)
    private readonly questionRepo: QuestionRepositoryPort,
  ) {}

  async execute(input: PublishInput): Promise<PublishResult> {
    if (!input || typeof input.text !== 'string') {
      throw new Error('Invalid input: text is required');
    }

    let normalized = normalizeText(input.text);
    if (!normalized) {
      throw new Error('Question empty after normalization');
    }

    if (normalized.length > MAX_CONTENT_LENGTH) {
      normalized = normalized.substring(0, MAX_CONTENT_LENGTH);
    }

    const signature = createSignature({ text: normalized, options: input.options ?? null, examId: input.examId ?? null });
    const existing = await this.questionRepo.findBySignature(signature);
    if (existing) {
      return { result: 'duplicate' };
    }

    const question = Question.create(normalized, 'open_analysis', input.options ?? null);
    question.signature = signature;
    question.examId = input.examId ?? null;
    (question as any).rawText = input.rawText ?? input.text;
    (question as any).metadata = input.rawMetadata ?? null;
    const saved = await this.questionRepo.save(question);

    return { result: 'created', questionId: saved.id };
  }
}
