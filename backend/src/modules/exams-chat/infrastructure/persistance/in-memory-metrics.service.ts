import { QuestionMetricsService } from '../../domain/ports/question-metrics-service.port'

export class InMemoryMetricsService implements QuestionMetricsService {
  private cacheHits = 0
  private cacheMisses = 0
  private tokensGeneratedTotal = 0
  private tokensSavedTotal = 0

  incrementCacheHits(): void {
    this.cacheHits++
  }

  incrementCacheMisses(): void {
    this.cacheMisses++
  }

  addTokensGenerated(count: number): void {
    this.tokensGeneratedTotal += count
  }

  addTokensSaved(count: number): void {
    this.tokensSavedTotal += count
  }

  getSnapshot() {
    return {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      tokensGeneratedTotal: this.tokensGeneratedTotal,
      tokensSavedTotal: this.tokensSavedTotal,
    }
  }
}
