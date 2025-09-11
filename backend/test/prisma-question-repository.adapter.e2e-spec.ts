import { PrismaQuestionRepositoryAdapter } from '../src/modules/exams-chat/infrastructure/persistance/prisma-question-repository.adapter';
import { Question } from '../src/modules/exams-chat/domain/entities/question.entity';

describe('PrismaQuestionRepositoryAdapter (mock)', () => {
  let repo: PrismaQuestionRepositoryAdapter;

  const baseQuestion = Question.rehydrate({
    id: 'q1',
    examId: 'exam1',
    topic: 'algorithms',
    signature: 'sig-123',
    text: '¿Qué es un algoritmo?',
    type: 'multiple_choice',
    options: ['conjunto de pasos', 'variable', 'dato'],
    tokensGenerated: 5,
    createdAt: new Date(),
    uses: 0,
  });

  beforeEach(() => {
    repo = new PrismaQuestionRepositoryAdapter();
  });

  it('should save a new question', async () => {
    const saved = await repo.save(baseQuestion);
    expect(saved.id).toBe('q1');
    expect((await repo.findAll()).length).toBe(1);
  });

  it('should update an existing question when saving with same signature', async () => {
    await repo.save(baseQuestion);
    const updated = await repo.save(baseQuestion);
    expect(updated.uses).toBe(1);
    expect((await repo.findAll()).length).toBe(1);
  });

  it('should find question by id', async () => {
    await repo.save(baseQuestion);
    const found = await repo.findById('q1');
    expect(found?.text).toContain('algoritmo');
  });

  it('should return null if question not found', async () => {
    const result = await repo.findById('not-exist');
    expect(result).toBeNull();
  });

  it('should increment usage count', async () => {
    await repo.save(baseQuestion);
    await repo.incrementUsage('q1');
    const q = await repo.findById('q1');
    expect(q?.uses).toBe(1);
    expect(q?.lastUsedAt).toBeInstanceOf(Date);
  });
});
