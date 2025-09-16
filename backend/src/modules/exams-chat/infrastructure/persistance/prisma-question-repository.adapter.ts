import { Injectable } from '@nestjs/common';
import { Question } from '../../domain/entities/question.entity';
import type { QuestionRepositoryPort } from '../../domain/ports/question-repository.port';
import { createSignature } from '../../utils/createSignature';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../core/prisma/prisma.service';

@Injectable()
export class PrismaQuestionRepositoryAdapter implements QuestionRepositoryPort {
  private memory: Question[] = [];

  constructor(private readonly prisma: PrismaService) {}

  private get table(): any | null {
    if (!this.prisma) return null;
    return (this.prisma as any).generatedQuestion ?? (this.prisma as any).quizQuestion ?? null;
  }

  private get fkField(): string {
    if (!this.prisma) return 'examId';
    return (this.prisma as any).generatedQuestion ? 'examId' : (this.prisma as any).quizQuestion ? 'courseId' : 'examId';
  }

  private mapToEntity(record: any): Question {
    return Question.rehydrate({
      id: record.id,
      text: record.text,
      type: (record.type as any) ?? 'open_analysis',
      options: record.options ?? null,
      status: (record.status as any) ?? 'generated',
      signature: record.signature ?? '',
      examId: record.courseId ?? record.examId ?? null,
      topic: record.topic ?? null,
      tokensGenerated: record.tokensGenerated ?? 0,
      createdAt: record.createdAt ?? new Date(),
      lastUsedAt: record.lastUsedAt ?? null,
      uses: record.uses ?? 0,
      difficulty: record.difficulty ?? null,
    });
  }

  async save(question: Question): Promise<Question> {
    if (!question.signature) {
      question.signature = createSignature({ text: question.text, options: question.options, type: question.type });
    }
    const tbl = this.table;
    const fk = this.fkField;
    if (this.prisma && tbl) {
      const record = await tbl.upsert({
        where: { signature: question.signature },
        update: {
          text: question.text,
          type: question.type,
          options: question.options as Prisma.JsonValue,
          lastUsedAt: question.lastUsedAt ?? undefined,
          difficulty: question.difficulty ?? undefined,
          [fk]: question.examId ?? undefined,
          topic: question.topic ?? undefined,
          tokensGenerated: question.tokensGenerated ?? undefined,
          uses: question.uses ?? undefined,
          status: question.status ?? undefined,
        },
        create: {
          id: question.id,
          [fk]: question.examId ?? undefined,
          topic: question.topic ?? undefined,
          signature: question.signature,
          text: question.text,
          type: question.type,
          options: question.options as Prisma.JsonValue,
          tokensGenerated: question.tokensGenerated ?? undefined,
          difficulty: question.difficulty ?? undefined,
          createdAt: question.createdAt ?? new Date(),
          lastUsedAt: question.lastUsedAt ?? undefined,
          uses: question.uses ?? 0,
          status: question.status ?? undefined,
        },
      });
      return this.mapToEntity(record);
    } else {
      const existingIndex = this.memory.findIndex((q) => q.signature === question.signature);
      if (existingIndex >= 0) {
        const updated = Question.rehydrate({
          ...this.memory[existingIndex],
          text: question.text,
          type: question.type,
          options: question.options ?? null,
          tokensGenerated: question.tokensGenerated,
          lastUsedAt: new Date(),
          uses: (this.memory[existingIndex].uses ?? 0) + 1,
          difficulty: question.difficulty ?? null,
          status: question.status ?? 'generated',
          signature: question.signature ?? createSignature({ text: question.text, options: question.options, type: question.type }),
        });
        this.memory[existingIndex] = updated;
        return updated;
      }
      const created = Question.rehydrate({
        ...question,
        signature: question.signature ?? createSignature({ text: question.text, options: question.options, type: question.type }),
        createdAt: question.createdAt ?? new Date(),
        uses: question.uses ?? 0,
      });
      this.memory.push(created);
      return created;
    }
  }

  async findById(id: string): Promise<Question | null> {
    const tbl = this.table;
    if (this.prisma && tbl) {
      const record = await tbl.findUnique({ where: { id } });
      return record ? this.mapToEntity(record) : null;
    } else {
      const found = this.memory.find((q) => q.id === id);
      return found ? Question.rehydrate(found) : null;
    }
  }

  async findBySignature(signature: string): Promise<Question | null> {
    const tbl = this.table;
    if (this.prisma && tbl) {
      const record = await tbl.findUnique({ where: { signature } });
      return record ? this.mapToEntity(record) : null;
    } else {
      const found = this.memory.find((q) => q.signature === signature);
      return found ? Question.rehydrate(found) : null;
    }
  }

  async findAll(): Promise<Question[]> {
    const tbl = this.table;
    if (this.prisma && tbl) {
      const records = await tbl.findMany();
      return records.map((r: any) => this.mapToEntity(r));
    } else {
      return this.memory.map((q) => Question.rehydrate(q));
    }
  }

  async findByStatus(_status: string, limit = 10, offset = 0): Promise<Question[]> {
    const tbl = this.table;
    if (this.prisma && tbl) {
      const records = await tbl.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      });
      return records.map((r: any) => this.mapToEntity(r));
    } else {
      return this.memory
        .filter((q) => q.status === _status)
        .slice(offset, offset + limit)
        .map((q) => Question.rehydrate(q));
    }
  }

  async incrementUsage(id: string, _tokensUsed = 0): Promise<void> {
    const tbl = this.table;
    if (this.prisma && tbl) {
      const data: any = { lastUsedAt: new Date() };
      if (_tokensUsed) data.tokensGenerated = { increment: _tokensUsed };
      if (_tokensUsed) data.uses = { increment: 1 };
      await tbl.update({
        where: { id },
        data,
      });
    } else {
      const idx = this.memory.findIndex((q) => q.id === id);
      if (idx >= 0) {
        const updated = Question.rehydrate({
          ...this.memory[idx],
          uses: (this.memory[idx].uses ?? 0) + 1,
          tokensGenerated: (this.memory[idx].tokensGenerated ?? 0) + _tokensUsed,
          lastUsedAt: new Date(),
        });
        this.memory[idx] = updated;
      }
    }
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const tbl = this.table;
    if (this.prisma && tbl) {
      const res = await tbl.deleteMany({
        where: { createdAt: { lt: date } },
      });
      return res.count;
    } else {
      const before = this.memory.length;
      this.memory = this.memory.filter((q) => q.createdAt >= date);
      return before - this.memory.length;
    }
  }

  async countByExam(examId: string): Promise<number> {
    const tbl = this.table;
    const fk = this.fkField;
    if (this.prisma && tbl) {
      const where: any = {};
      where[fk] = examId;
      return tbl.count({ where });
    } else {
      return this.memory.filter((q) => q.examId === examId).length;
    }
  }

  async pruneToLimitByExam(examId: string, limit: number): Promise<void> {
    const tbl = this.table;
    const fk = this.fkField;
    if (this.prisma && tbl) {
      if (limit <= 0) {
        const where: any = {};
        where[fk] = examId;
        await tbl.deleteMany({ where });
        return;
      }
      const where: any = {};
      where[fk] = examId;
      const toDelete = await tbl.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: limit,
        select: { id: true },
      });
      const ids = toDelete.map((d: any) => d.id);
      if (ids.length > 0) {
        await tbl.deleteMany({ where: { id: { in: ids } } });
      }
    } else {
      const items = this.memory.filter((q) => q.examId === examId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const toKeep = items.slice(0, limit);
      const keepIds = new Set(toKeep.map((i) => i.id));
      this.memory = this.memory.filter((q) => q.examId !== examId || keepIds.has(q.id));
    }
  }
}
