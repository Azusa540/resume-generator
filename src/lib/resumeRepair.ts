import Anthropic from '@anthropic-ai/sdk';
import type { GeneratedResume } from '@/types/resume';
import { findMissingPrimaryStack } from '@/lib/verifyPrimaryStack';

/**
 * Admin prompt only. If the model's own PRIMARY STACK DISTRIBUTION CHECK failed
 * (a primary_stack term appears in fewer than 2 companies), send one corrective
 * follow-up naming the gap before returning the result. Falls back to the
 * original generation if the repair call fails or doesn't parse.
 */
export async function repairPrimaryStackCoverage(
  client: Anthropic,
  systemPrompt: string,
  userPrompt: string,
  rawAssistantJson: string,
  generated: GeneratedResume
): Promise<GeneratedResume> {
  let missing: string[];
  try {
    missing = findMissingPrimaryStack(generated);
  } catch {
    return generated;
  }
  if (missing.length === 0) return generated;

  try {
    const message = await client.messages.create(
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 16000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: rawAssistantJson },
          {
            role: 'user',
            content: `Your PRIMARY STACK DISTRIBUTION CHECK failed: the following technologies are missing or appear in fewer than 2 companies in experience_bullets: ${missing.join(', ')}. Revise ONLY the "experience_bullets" array (and "skills" too, if a term is missing there) so each of these technologies appears bolded in bullets across at least 2 different companies, blended naturally into that company's real domain per the BLEND, DON'T BOLT ON rule. Keep everything else — professional_summary, education, the other bullets' content and order — unchanged. Respond with the complete corrected JSON only, same schema including "primary_stack", no explanation.`,
          },
        ],
      },
      { timeout: 120_000 }
    );

    const rawText = message.content[0]?.type === 'text' ? message.content[0].text : '';
    const stripped = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const jsonEnd = stripped.lastIndexOf('}');
    const raw = jsonEnd !== -1 ? stripped.slice(0, jsonEnd + 1) : stripped;
    return JSON.parse(raw) as GeneratedResume;
  } catch {
    return generated;
  }
}
