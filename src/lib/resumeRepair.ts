import Anthropic from '@anthropic-ai/sdk';
import type { GeneratedResume } from '@/types/resume';
import { findMissingPrimaryStack } from '@/lib/verifyPrimaryStack';
import { positionZeroBulletCount } from '@/lib/verifyBulletCount';
import { extractGeneratedResume, cachedText } from '@/lib/resumeSchema';

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
        system: [cachedText(systemPrompt)],
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
        messages: [
          { role: 'user', content: [cachedText(userPrompt)] },
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

/**
 * Admin software prompt only. Position 0 (the most recent company) must have
 * more than 8 bullets per the Sentence distribution rule. If the model came
 * in at 8 or fewer, send one corrective follow-up asking it to add more
 * genuine bullets to that position only. Falls back to the original
 * generation if the repair call fails, doesn't call the tool, or fails
 * schema validation.
 */
export async function repairPositionZeroBulletCount(
  client: Anthropic,
  systemPrompt: string,
  userPrompt: string,
  tool: Anthropic.Tool,
  previousToolUse: Anthropic.ToolUseBlock,
  generated: GeneratedResume,
  profileType: 'software' | 'other' | undefined
): Promise<{ generated: GeneratedResume; toolUse: Anthropic.ToolUseBlock }> {
  const count = positionZeroBulletCount(generated);
  if (count > 8) return { generated, toolUse: previousToolUse };

  const company = generated.experience_bullets[0]?.company ?? 'the most recent company';

  try {
    const message = await client.messages.create(
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 16000,
        system: [cachedText(systemPrompt)],
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
        messages: [
          { role: 'user', content: [cachedText(userPrompt)] },
          { role: 'assistant', content: [previousToolUse] },
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: previousToolUse.id,
                content: `Position 0 ("${company}", the most recent role) only has ${count} bullets, but per the Sentence distribution rule it MUST have more than 8 (9-12). Add genuine, specific bullets to position 0 ONLY until it exceeds 8 — draw on more of the candidate's real Role Description detail and more JD-relevant angles per PRIMARY STACK DISTRIBUTION and BULLET ORDER WITHIN EACH COMPANY. Every new bullet must say something true and specific and still follow all the existing rules (tech density, bold highlighting, verb variety, no padding with vague filler). Keep every other position, the professional_summary, education, and primary_stack unchanged. Call the tool again with the complete corrected resume, same schema.`,
              },
            ],
          },
        ],
      },
      { timeout: 120_000 }
    );

    return extractGeneratedResume(message, profileType);
  } catch (err) {
    console.error('[resumeRepair] Position-0 bullet-count repair call failed, keeping original generation:', err);
    return { generated, toolUse: previousToolUse };
  }
}
