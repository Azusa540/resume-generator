import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { findLlmModel, type LlmModel } from '@/lib/llmModels';
import { findToolUse, cachedText, TOOL_NAME } from '@/lib/resumeSchema';

export class ResumeGenerateError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export type ResumeFollowUp = {
  previous: Anthropic.ToolUseBlock;
  instruction: string;
};

export type ResumeModelRunner = {
  run(
    systemPrompt: string,
    userPrompt: string,
    tool: Anthropic.Tool,
    followUp?: ResumeFollowUp,
  ): Promise<{ toolUse: Anthropic.ToolUseBlock; stopReason: string | null }>;
};

type KeyOwner = {
  llmModel?: string | null;
  anthropicApiKey?: string | null;
  openaiApiKey?: string | null;
} | null;

export function openResumeModel(
  user: KeyOwner,
  who: 'account' | 'owner',
): { model: ResumeModelRunner } | { message: string } {
  const spec = findLlmModel(user?.llmModel);
  if (!spec) return { message: 'The selected model is not available.' };
  const apiKey = spec.vendor === 'claude' ? user?.anthropicApiKey : user?.openaiApiKey;
  if (!apiKey) return { message: missingKeyMessage(spec.vendorLabel, who) };
  return { model: createResumeModel(spec, apiKey, who) };
}

function missingKeyMessage(vendorLabel: string, who: 'account' | 'owner'): string {
  if (who === 'owner') return `No ${vendorLabel} API key configured for this profile's owner.`;
  return `No ${vendorLabel} API key configured for your account. Ask an admin to set one.`;
}

function createResumeModel(spec: LlmModel, apiKey: string, who: 'account' | 'owner'): ResumeModelRunner {
  if (spec.vendor === 'openai') return openaiRunner(spec, apiKey, who);
  return claudeRunner(spec, apiKey, who);
}

function claudeRunner(spec: LlmModel, apiKey: string, who: 'account' | 'owner'): ResumeModelRunner {
  const client = new Anthropic({ apiKey });
  return {
    async run(systemPrompt, userPrompt, tool, followUp) {
      const messages: Anthropic.MessageParam[] = [
        { role: 'user', content: [cachedText(userPrompt)] },
      ];
      if (followUp) {
        messages.push(
          { role: 'assistant', content: [followUp.previous] },
          {
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: followUp.previous.id,
              content: followUp.instruction,
            }],
          },
        );
      }
      let message: Anthropic.Message;
      try {
        message = await client.messages.create(
          {
            model: spec.id,
            max_tokens: 16000,
            system: [cachedText(systemPrompt)],
            tools: [tool],
            tool_choice: { type: 'tool', name: tool.name },
            messages,
          },
          { timeout: 120_000 },
        );
      } catch (err) {
        console.error('[resumeModel] Claude request failed:', spec.id, err);
        throw vendorError(spec.vendorLabel, who, err);
      }
      return {
        toolUse: findToolUse(message),
        stopReason: message.stop_reason,
      };
    },
  };
}

function openaiRunner(spec: LlmModel, apiKey: string, who: 'account' | 'owner'): ResumeModelRunner {
  const client = new OpenAI({ apiKey, timeout: 120_000 });
  return {
    async run(systemPrompt, userPrompt, tool, followUp) {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];
      if (followUp) {
        messages.push(
          {
            role: 'assistant',
            tool_calls: [{
              id: followUp.previous.id,
              type: 'function',
              function: {
                name: followUp.previous.name,
                arguments: JSON.stringify(followUp.previous.input),
              },
            }],
          },
          { role: 'tool', tool_call_id: followUp.previous.id, content: followUp.instruction },
        );
      }
      let completion: OpenAI.Chat.Completions.ChatCompletion;
      try {
        completion = await client.chat.completions.create({
          model: spec.id,
          max_completion_tokens: 16000,
          reasoning_effort: 'none',
          messages,
          tools: [{
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description ?? '',
              parameters: tool.input_schema as Record<string, unknown>,
            },
          }],
          tool_choice: { type: 'function', function: { name: tool.name } },
        });
      } catch (err) {
        console.error('[resumeModel] OpenAI request failed:', spec.id, err);
        throw vendorError(spec.vendorLabel, who, err);
      }
      const call = completion.choices[0]?.message.tool_calls?.find((item) => item.type === 'function');
      if (!call || call.type !== 'function') {
        throw new Error(`Model did not call the "${TOOL_NAME}" tool.`);
      }
      let input: unknown;
      try {
        input = JSON.parse(call.function.arguments);
      } catch {
        throw new Error('Model tool arguments were not valid JSON.');
      }
      const toolUse: Anthropic.ToolUseBlock = {
        type: 'tool_use',
        id: call.id,
        name: call.function.name,
        input: input as Anthropic.ToolUseBlock['input'],
        caller: { type: 'direct' },
      };
      const finish = completion.choices[0]?.finish_reason;
      return {
        toolUse,
        stopReason: finish === 'length' ? 'max_tokens' : finish ?? null,
      };
    },
  };
}

function vendorError(vendorLabel: string, who: 'account' | 'owner', err: unknown): ResumeGenerateError {
  const status = (err as { status?: number })?.status;
  const nested = (err as { error?: { message?: string; code?: string; error?: { message?: string } } })?.error;
  const text = [
    nested?.error?.message,
    nested?.message,
    (err as { message?: string })?.message,
  ].filter(Boolean).join(' ');
  const code = nested?.code || '';
  const ranOut = who === 'owner'
    ? `This profile's owner has run out of ${vendorLabel} API credits. Ask an admin to add credits or set a different key.`
    : `Your account has run out of ${vendorLabel} API credits. Ask an admin to add credits or set a different key.`;
  const invalid = who === 'owner'
    ? `AI service authentication failed. The profile owner's ${vendorLabel} API key may be invalid.`
    : `AI service authentication failed. Your ${vendorLabel} API key may be invalid.`;
  if (/credit balance|insufficient_quota|exceeded your current quota|billing/i.test(text) || code === 'insufficient_quota') {
    return new ResumeGenerateError(ranOut, 502);
  }
  if (status === 429) {
    return new ResumeGenerateError('The AI service is rate-limited right now. Please wait a moment and try again.', 502);
  }
  if (status === 401 || status === 403) {
    return new ResumeGenerateError(invalid, 502);
  }
  return new ResumeGenerateError('The AI service timed out or is unavailable. Please try again.', 502);
}
