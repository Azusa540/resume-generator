import Anthropic from '@anthropic-ai/sdk';
import type { IProfile } from '@/models/Profile';
import { buildSystemPrompt, buildSystemPromptNonSoftware, buildUserPrompt } from '@/lib/prompts';
import { buildSystemPromptAdmin } from '@/lib/adminPrompt';
import { buildSystemPromptAdminNonSoftware } from '@/lib/adminPromptNonSoftware';
import { repairPrimaryStackCoverage, repairPositionZeroBulletCount, repairMalformedSchema } from '@/lib/resumeRepair';
import { reviewAuthenticity } from '@/lib/authenticityReview';
import { buildResumeTool, findToolUse, validateGeneratedResume, cachedText } from '@/lib/resumeSchema';
import { dedupeSkills } from '@/lib/dedupeSkills';
import type { GeneratedResume } from '@/types/resume';

export class ResumeGenerateError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function generateTailoredResume(opts: {
  client: Anthropic;
  profile: IProfile;
  isAdmin: boolean;
  title: string;
  company: string;
  jobDescription: string;
}): Promise<GeneratedResume> {
  const { client, profile, isAdmin, title, company, jobDescription } = opts;
  const systemPrompt = isAdmin
    ? profile.profileType === 'other'
      ? buildSystemPromptAdminNonSoftware()
      : buildSystemPromptAdmin()
    : profile.profileType === 'other'
    ? buildSystemPromptNonSoftware()
    : buildSystemPrompt();
  const userPrompt = buildUserPrompt(profile, title, company, jobDescription, profile.customPrompt, profile.profileType);
  const tool = buildResumeTool(profile.profileType, isAdmin);

  let message;
  try {
    message = await client.messages.create(
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 16000,
        system: [cachedText(systemPrompt)],
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
        messages: [
          { role: 'user', content: [cachedText(userPrompt)] },
        ],
      },
      { timeout: 120_000 }
    );
  } catch (err) {
    const status = (err as { status?: number })?.status;
    const anthropicMessage =
      (err as { error?: { error?: { message?: string } } })?.error?.error?.message || '';
    const errorMessage = /credit balance/i.test(anthropicMessage)
      ? 'This account has run out of Claude API credits. Ask an admin to add credits or set a different key in Settings.'
      : status === 429
      ? 'The AI service is rate-limited right now. Please wait a moment and try again.'
      : status === 401
      ? 'AI service authentication failed. Your Claude API key may be invalid — ask an admin to check it.'
      : 'The AI service timed out or is unavailable. Please try again.';
    console.error('Anthropic generate failed:', err);
    throw new ResumeGenerateError(errorMessage, 502);
  }

  if (message.stop_reason === 'max_tokens') {
    throw new ResumeGenerateError('The resume was too long to finish generating. Try a shorter job description.', 502);
  }

  let generated: GeneratedResume;
  let toolUse: Anthropic.ToolUseBlock;
  try {
    toolUse = findToolUse(message);
  } catch (err) {
    console.error('[generate] Model did not call the tool:', err, {
      profileFullName: profile.fullName,
      stopReason: message.stop_reason,
      rawContent: JSON.stringify(message.content),
    });
    throw new ResumeGenerateError('Failed to parse response as JSON.', 500);
  }
  try {
    generated = validateGeneratedResume(toolUse.input, profile.profileType);
  } catch (err) {
    console.error('[generate] Initial tool output failed schema validation, attempting one corrective retry:', err, {
      profileFullName: profile.fullName,
      employmentCount: profile.employment.length,
      title,
      company,
      jobDescriptionLen: jobDescription.length,
      rawInput: JSON.stringify(toolUse.input),
    });
    try {
      const validationMessage = err instanceof Error ? err.message : String(err);
      ({ generated, toolUse } = await repairMalformedSchema(
        client, systemPrompt, userPrompt, tool, toolUse, validationMessage, profile.profileType
      ));
    } catch (err2) {
      console.error('[generate] Corrective retry also failed:', err2);
      throw new ResumeGenerateError('Failed to parse response as JSON.', 500);
    }
  }

  ({ generated, toolUse } = await repairPrimaryStackCoverage(
    client, systemPrompt, userPrompt, tool, toolUse, generated, profile.profileType
  ));
  if (isAdmin && profile.profileType !== 'other') {
    ({ generated, toolUse } = await repairPositionZeroBulletCount(
      client, systemPrompt, userPrompt, tool, toolUse, generated, profile.profileType
    ));
  }
  ({ generated } = await reviewAuthenticity(
    client, systemPrompt, userPrompt, tool, toolUse, generated, profile.profileType
  ));
  return dedupeSkills(generated);
}
