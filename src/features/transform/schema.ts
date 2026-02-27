import { z } from 'zod';

export const SelfCheckSchema = z.object({
  meaning_preserved: z.boolean(),
  meaning_risk_notes: z.array(z.string()),
  surface_novelty_level: z.enum(['low', 'medium', 'high']),
  signal_reduction_actions: z.array(z.string()),
});

export const LLMOutputSchema = z.object({
  mode: z.enum(['constrained', 'unconstrained']),
  input_summary: z.string().min(1),
  transformed_text: z.string().min(1),
  self_check: SelfCheckSchema,
});

export type LLMOutput = z.infer<typeof LLMOutputSchema>;
export type SelfCheck = z.infer<typeof SelfCheckSchema>;
