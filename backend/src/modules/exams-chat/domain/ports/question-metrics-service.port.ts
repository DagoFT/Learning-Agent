export interface QuestionMetricsService {
  incrementCacheHits(): void
  incrementCacheMisses(): void
  addTokensGenerated(count: number): void
  addTokensSaved(count: number): void
}
