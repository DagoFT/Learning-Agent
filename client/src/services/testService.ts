import { useState, useCallback, useEffect } from "react";

export type QuestionType = "multiple" | "truefalse";

export interface QuestionData {
  id: string;
  type: QuestionType;
  question: string;
  options: string[];
  correctIndex: number;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export async function fetchQuestionFromAI(context: string, courseId: string): Promise<QuestionData> {
  const res = await fetch(`${API_BASE}/exams-chat/generate-question`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: context, examId: courseId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
  }
  const data = await res.json();
  const optsRes = await fetch(`${API_BASE}/exams-chat/generate-options`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: data.question, examId: courseId, userId: undefined }),
  });
  if (!optsRes.ok) throw new Error(`HTTP ${optsRes.status} ${optsRes.statusText}`);
  const optsData = await optsRes.json();
  return {
    id: optsData.id ?? crypto.randomUUID(),
    type: optsData.options.length === 2 ? "truefalse" : "multiple",
    question: String(optsData.question),
    options: optsData.options.map((o: any) => String(o)),
    correctIndex: 0
  };
}

export async function fetchQuestion(context: string, courseId: string): Promise<QuestionData> {
  return await fetchQuestionFromAI(context, courseId);
}

export function useQuestionLoader(initialContext: string, courseId: string) {
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (ctx?: string) => {
    setLoading(true);
    setError(null);
    try {
      const q = await fetchQuestion(ctx ?? initialContext, courseId);
      setQuestionData(q);
    } catch (err: any) {
      setError(err?.message ?? "Error desconocido al pedir la pregunta");
      setQuestionData(null);
    } finally {
      setLoading(false);
    }
  }, [initialContext, courseId]);

  useEffect(() => {
    load(initialContext);
  }, [load, initialContext]);

  return { questionData, loading, error, reload: load };
}
