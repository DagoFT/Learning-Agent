// domain/entities/question.entity.ts
import { v4 as uuidv4 } from 'uuid';

export type QuestionStatus = 'generated' | 'invalid' | 'published';
export type QuestionType = 'multiple_choice' | 'true_false' | 'open_analysis' | 'open_exercise';

export class Question {
  public readonly id: string;
  public readonly createdAt: Date;
  public readonly status: QuestionStatus;
  public signature: string;
  public examId?: string | null;
  public topic?: string | null;
  public difficulty?: number | null;
  public tokensGenerated: number;
  public lastUsedAt?: Date | null;
  public uses: number;
  public rawText?: string | null;
  public metadata?: Record<string, any> | null;

  constructor(
    public readonly text: string,
    public readonly type: QuestionType = 'open_analysis',
    public readonly options?: string[] | null,
    status?: QuestionStatus,
    id?: string,
    createdAt?: Date,
    signature?: string,
    examId?: string | null,
    topic?: string | null,
    tokensGenerated = 0,
    lastUsedAt?: Date | null,
    uses = 0,
    difficulty?: number | null,
    rawText?: string | null,
    metadata?: Record<string, any> | null,
  ) {
    if (!text?.trim()) throw new Error('Question.text es obligatorio');
    if (text.length > 2000) throw new Error('Question.text excede el máximo de 2000 caracteres');
    if (type === 'multiple_choice' && (!options || options.length < 2)) {
      throw new Error('multiple_choice requiere al menos 2 opciones.');
    }

    this.id = id ?? uuidv4();
    this.createdAt = createdAt ?? new Date();
    this.status = status ?? 'generated';
    this.signature = signature ?? '';
    this.examId = examId ?? null;
    this.topic = topic ?? null;
    this.difficulty = difficulty ?? null;
    this.tokensGenerated = tokensGenerated ?? 0;
    this.lastUsedAt = lastUsedAt ?? null;
    this.uses = uses ?? 0;
    this.rawText = rawText ?? null;
    this.metadata = metadata ?? null;
  }

  static create(
    text: string,
    type: QuestionType = 'open_analysis',
    options?: string[] | null,
    status?: QuestionStatus,
    difficulty?: number | null
  ) {
    return new Question(
      text,
      type,
      options,
      status,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      0,
      undefined,
      0,
      difficulty ?? null,
      undefined,
      undefined
    );
  }

  static rehydrate(payload: {
    id: string;
    text: string;
    type: QuestionType;
    options?: string[] | null;
    status?: QuestionStatus;
    signature?: string;
    examId?: string | null;
    topic?: string | null;
    tokensGenerated?: number;
    createdAt?: Date | string;
    lastUsedAt?: Date | string | null;
    uses?: number;
    difficulty?: number | null;
    rawText?: string | null;
    metadata?: Record<string, any> | null;
  }): Question {
    return new Question(
      payload.text,
      payload.type,
      payload.options ?? null,
      payload.status ?? 'generated',
      payload.id,
      payload.createdAt ? new Date(payload.createdAt) : new Date(),
      payload.signature ?? '',
      payload.examId ?? null,
      payload.topic ?? null,
      payload.tokensGenerated ?? 0,
      payload.lastUsedAt ? new Date(payload.lastUsedAt) : null,
      payload.uses ?? 0,
      payload.difficulty ?? null,
      payload.rawText ?? null,
      payload.metadata ?? null
    );
  }

  toJSON() {
    return {
      id: this.id,
      text: this.text,
      type: this.type,
      options: this.options ?? null,
      status: this.status,
      signature: this.signature,
      examId: this.examId ?? null,
      topic: this.topic ?? null,
      difficulty: this.difficulty ?? null,
      tokensGenerated: this.tokensGenerated,
      createdAt: this.createdAt.toISOString(),
      lastUsedAt: this.lastUsedAt ? this.lastUsedAt.toISOString() : null,
      uses: this.uses,
      rawText: this.rawText ?? null,
      metadata: this.metadata ?? null,
    };
  }
}
