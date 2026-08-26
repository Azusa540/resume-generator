import Anthropic from '@anthropic-ai/sdk';
import type { GeneratedResume } from '@/types/resume';

/**
 * Admin prompt only. When the model self-reports domain_overlap as "distant"
 * (the JD's core domain has no real overlap with the candidate's actual
 * background), send one follow-up asking it to review its own bullets for
 * interview defensibility and soften any claim of direct ownership/expertise
 * the candidate couldn't actually explain. Falls back to the original
 * generation if the review call fails or doesn't parse, or if overlap isn't
 * "distant" (no review needed for same/adjacent domains).
 */
export async function reviewAuthenticity(
  client: Anthropic,
  systemPrompt: string,
  userPrompt: string,
  rawAssistantJson: string,
  generated: GeneratedResume
): Promise<GeneratedResume> {
  if (generated.domain_overlap !== 'distant') return generated;

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
            content: `You flagged domain_overlap as "distant" — the JD's core domain has no real overlap with this candidate's actual background. Review every bolded technology and claim in "experience_bullets" against the 5-MINUTE TEST: could this candidate actually discuss it for 5 minutes in a live technical interview, using knowledge consistent with their real background? Rewrite any bullet that claims direct ownership or deep expertise the candidate couldn't defend, using DEFENSIBLE ADJACENT FRAMING instead (peripheral/adjacent involvement anchored in their real skills). Do not remove any PRIMARY STACK technology — only change how directly the candidate is credited with having built or owned it. Respond with the complete corrected JSON only, same schema including "primary_stack" and "domain_overlap", no explanation.`,
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
