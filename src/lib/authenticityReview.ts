import Anthropic from '@anthropic-ai/sdk';
import type { GeneratedResume } from '@/types/resume';
import { extractGeneratedResume, cachedText } from '@/lib/resumeSchema';

/**
 * Admin prompt only. When the model self-reports domain_overlap as "distant"
 * (the JD's core domain has no real overlap with the candidate's actual
 * background), send one follow-up asking it to review its own output for
 * three failure modes: false ownership of specialized work the candidate
 * couldn't defend in an interview, JD marketing/brand language leaking into
 * the resume's own words, and the hiring company's name leaking into the
 * candidate's own title. Falls back to the original generation (and its
 * tool_use block) if the review call fails, doesn't call the tool, or fails
 * schema validation, or if overlap isn't "distant" (no review needed for
 * same/adjacent domains).
 */
export async function reviewAuthenticity(
  client: Anthropic,
  systemPrompt: string,
  userPrompt: string,
  tool: Anthropic.Tool,
  previousToolUse: Anthropic.ToolUseBlock,
  generated: GeneratedResume,
  profileType: 'software' | 'other' | undefined
): Promise<{ generated: GeneratedResume; toolUse: Anthropic.ToolUseBlock }> {
  if (generated.domain_overlap !== 'distant') return { generated, toolUse: previousToolUse };

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
                content: `You flagged domain_overlap as "distant" — the JD's core domain has no real overlap with this candidate's actual background. Review the full output for three specific problems and fix any you find:

1. FALSE OWNERSHIP: for every bolded technology or claim in "experience_bullets", apply the 5-MINUTE TEST — could this candidate actually discuss it for 5 minutes in a live technical interview, using knowledge consistent with their real background? Rewrite any bullet that claims direct ownership or deep expertise the candidate couldn't defend, using DEFENSIBLE ADJACENT FRAMING instead (peripheral/adjacent involvement anchored in their real skills). If a PRIMARY STACK term is a deep specialist/hardware-locked technology with zero plausible connection to ANY of the candidate's real companies even under adjacent framing, remove it from "primary_stack" and from bullets entirely — leave it in the skills list only, or drop it altogether. A lower JD match is correct here; a fabricated claim is not.

2. JD LANGUAGE LEAKAGE: check "professional_summary" and every bullet for the hiring company's own trademarked product names or marketing/tagline phrasing copied from the JD (e.g. a branded product name, "join us in building the next generation of X" style language). Rewrite any instance in original words, and never claim the candidate contributed to a product at a company they never worked for.

3. COMPANY NAME IN TITLE: check "target_job_title" and "resume_file_name" — if the hiring company's name was baked into the JD's own title text (e.g. a posting titled "Cisco SDK Developer"), the hiring company's name must NOT appear in target_job_title (only the occupational title, e.g. "SDK Developer"). It legitimately DOES belong in resume_file_name's "{Company}" segment — that's a filename convention, not a title claim — so leave that part alone.

Call the tool again with the complete corrected resume, same schema including "primary_stack" and "domain_overlap".`,
              },
            ],
          },
        ],
      },
      { timeout: 120_000 }
    );

    return extractGeneratedResume(message, profileType);
  } catch (err) {
    console.error('[authenticityReview] Review call failed, keeping prior generation:', err);
    return { generated, toolUse: previousToolUse };
  }
}
