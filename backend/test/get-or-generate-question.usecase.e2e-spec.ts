import { GetOrGenerateQuestionUseCase } from '../src/modules/exams-chat/application/usecases/get-or-generate-question.usecase'
import { QuestionRepositoryPort } from '../src/modules/exams-chat/domain/ports/question-repository.port'
import { IaClientWrapper } from '../src/modules/exams-chat/domain/ports/ia-client-wrapper.port'
import { AuditRepository } from '../src/modules/exams-chat/domain/ports/audit-repository.port'
import { QuestionMetricsService } from '../src/modules/exams-chat/domain/ports/question-metrics-service.port'
import { Question, QuestionType, QuestionStatus } from '../src/modules/exams-chat/domain/entities/question.entity'

describe('GetOrGenerateQuestionUseCase', () => {
  let repo: jest.Mocked<QuestionRepositoryPort>
  let iaClient: jest.Mocked<IaClientWrapper>
  let audit: jest.Mocked<AuditRepository>
  let metrics: jest.Mocked<QuestionMetricsService>
  let usecase: GetOrGenerateQuestionUseCase

  beforeEach(() => {
    repo = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByStatus: jest.fn(),
      findBySignature: jest.fn(),
      incrementUsage: jest.fn(),
      deleteOlderThan: jest.fn(),
      countByExam: jest.fn(),
      pruneToLimitByExam: jest.fn(),
    }
    iaClient = { generateQuestion: jest.fn() }
    audit = { record: jest.fn() }
    metrics = {
      incrementCacheHits: jest.fn(),
      incrementCacheMisses: jest.fn(),
      addTokensGenerated: jest.fn(),
      addTokensSaved: jest.fn(),
    }
    usecase = new GetOrGenerateQuestionUseCase(repo, iaClient, audit, metrics)
  })

  it('should return cached question if exists and within TTL', async () => {
    const now = new Date()
    const existing = new Question(
      'Existing question',
      'multiple_choice',
      ['a', 'b'],
      'generated',
      'q1',
      now,
      'sig1',
      'exam1',
      undefined,
      10,
      new Date(now.getTime() - 1000),
      1
    )
    repo.findBySignature.mockResolvedValue(existing)

    const result = await usecase.execute({ prompt: 'Prompt' })

    expect(result).toEqual({ id: 'q1', question: 'Existing question', cached: true })
    expect(repo.incrementUsage).toHaveBeenCalledWith('q1', 0)
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ source: 'cached' }))
    expect(metrics.incrementCacheHits).toHaveBeenCalled()
    expect(metrics.addTokensSaved).toHaveBeenCalledWith(10)
    expect(iaClient.generateQuestion).not.toHaveBeenCalled()
  })

  it('should generate question if not cached', async () => {
    repo.findBySignature.mockResolvedValue(null)
    iaClient.generateQuestion.mockResolvedValue({
      questionText: 'Generated question',
      options: ['x', 'y'],
      tokensUsed: 15,
    })
    repo.save.mockImplementation(async (q: Question) =>
      new Question(
        q.text,
        q.type,
        q.options,
        q.status,
        'new1',
        q.createdAt,
        q.signature,
        q.examId,
        q.topic,
        q.tokensGenerated,
        q.lastUsedAt,
        q.uses,
        q.difficulty
      )
    )

    const result = await usecase.execute({ prompt: 'Prompt' })

    expect(result).toEqual({ id: 'new1', question: 'Generated question', cached: false })
    expect(repo.save).toHaveBeenCalled()
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ source: 'generated', tokensUsed: 15 }))
    expect(metrics.incrementCacheMisses).toHaveBeenCalled()
    expect(metrics.addTokensGenerated).toHaveBeenCalledWith(15)
  })
})
