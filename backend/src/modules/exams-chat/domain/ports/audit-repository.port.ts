export interface AuditRepository {
  record(entry: {
    questionId?: string
    timestamp: Date
    userId?: string
    examId?: string
    signature: string
    source: 'cached' | 'generated'
    tokensUsed: number
  }): Promise<void>
}
