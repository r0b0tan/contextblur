import type { TransformRequest, TransformResponse } from './types';
import type { LLMRunRequest, LLMRunResponse } from './features/transform/types';

export async function fetchModels(): Promise<string[]> {
  const res = await fetch('/models');
  if (!res.ok) return [];
  const data = (await res.json()) as { models: string[] };
  return data.models ?? [];
}

export async function postTransform(body: TransformRequest): Promise<TransformResponse> {
  const res = await fetch('/transform', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as TransformResponse & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export async function postLLMRun(body: LLMRunRequest): Promise<LLMRunResponse> {
  const res = await fetch('/llm-run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as LLMRunResponse & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}
