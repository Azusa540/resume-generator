export type LlmVendor = 'claude' | 'openai';

export interface LlmModel {
  id: string;
  label: string;
  vendor: LlmVendor;
  vendorLabel: 'Claude' | 'OpenAI';
}

export const LLM_MODELS: LlmModel[] = [
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', vendor: 'claude', vendorLabel: 'Claude' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', vendor: 'claude', vendorLabel: 'Claude' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', vendor: 'claude', vendorLabel: 'Claude' },
  { id: 'gpt-5.6-luna', label: 'OpenAI 5.6 Luna', vendor: 'openai', vendorLabel: 'OpenAI' },
  { id: 'gpt-6-luna', label: 'OpenAI 6 Luna', vendor: 'openai', vendorLabel: 'OpenAI' },
  { id: 'gpt-6-sol', label: 'OpenAI 6 Sol', vendor: 'openai', vendorLabel: 'OpenAI' },
];

export const DEFAULT_LLM_MODEL = 'claude-haiku-4-5';

export function isKnownLlmModel(id: unknown): id is string {
  return typeof id === 'string' && LLM_MODELS.some((model) => model.id === id);
}

export function findLlmModel(id: string | null | undefined): LlmModel | null {
  if (!id) return LLM_MODELS[0];
  return LLM_MODELS.find((model) => model.id === id) ?? null;
}

export function llmModelLabel(id: string | null | undefined): string {
  return findLlmModel(id)?.label ?? LLM_MODELS[0].label;
}
