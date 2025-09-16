export interface QuestionCacheCleaner {
  run(): Promise<void>;
}
