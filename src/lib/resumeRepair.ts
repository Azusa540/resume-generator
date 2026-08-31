import Anthropic from '@anthropic-ai/sdk';
import type { GeneratedResume } from '@/types/resume';
import { findMissingPrimaryStack } from '@/lib/verifyPrimaryStack';
import { extractGeneratedResume } from '@/lib/resumeSchema';

/**
 * Admin prompt only. If the model's own PRIMARY STACK DISTRIBUTION CHECK failed
 * (a primary_stack term appears in fewer than 2 companies), send one corrective
 * follow-up naming the gap before returning the result. Falls back to the
 * original generation (and its tool_use block, so a later call in the chain
 * can still continue the conversation correctly) if the repair call fails,
 * doesn't call the tool, or fails schema validation.
 */
export async function repairPrimaryStackCoverage(
  client: Anthropic,
  systemPrompt: string,
  userPrompt: string,
  tool: Anthropic.Tool,
  previousToolUse: Anthropic.ToolUseBlock,
  generated: GeneratedResume,
  profileType: 'software' | 'other' | undefined
): Promise<{ generated: GeneratedResume; toolUse: Anthropic.ToolUseBlock }> {
  let missing: string[];
  try {
    missing = findMissingPrimaryStack(generated);
  } catch {
    return { generated, toolUse: previousToolUse };
  }
  if (missing.length === 0) return { generated, toolUse: previousToolUse };

  try {
    const message = await client.messages.create(
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 16000,
        system: systemPrompt,
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
        messages: [
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: [previousToolUse] },
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: previousToolUse.id,
                content: `Your PRIMARY STACK DISTRIBUTION CHECK failed: the following technologies are missing or appear in fewer than 2 companies in experience_bullets: ${missing.join(', ')}. Revise ONLY the "experience_bullets" array (and "skills" too, if a term is missing there) so each of these technologies appears bolded in bullets across at least 2 different companies, blended naturally into that company's real domain per the BLEND, DON'T BOLT ON rule. Keep everything else — professional_summary, education, the other bullets' content and order — unchanged. Call the tool again with the complete corrected resume, same schema including "primary_stack".`,
              },
            ],
          },
        ],
      },
      { timeout: 120_000 }
    );

    return extractGeneratedResume(message, profileType);
  } catch (err) {
    console.error('[resumeRepair] Repair call failed, keeping original generation:', err);
    return { generated, toolUse: previousToolUse };
  }
}
