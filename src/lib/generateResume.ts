import type Anthropic from '@anthropic-ai/sdk';
import type { IProfile } from '@/models/Profile';
import { buildSystemPrompt, buildSystemPromptNonSoftware, buildUserPrompt } from '@/lib/prompts';
import { buildSystemPromptAdmin } from '@/lib/adminPrompt';
import { buildSystemPromptAdminNonSoftware } from '@/lib/adminPromptNonSoftware';
import { repairPrimaryStackCoverage, repairPositionZeroBulletCount, repairMalformedSchema } from '@/lib/resumeRepair';
import { reviewAuthenticity } from '@/lib/authenticityReview';
import { buildResumeTool, validateGeneratedResume } from '@/lib/resumeSchema';
import { dedupeSkills } from '@/lib/dedupeSkills';
import type { GeneratedResume } from '@/types/resume';
import { ResumeGenerateError, type ResumeModelRunner } from '@/lib/resumeModel';

export { ResumeGenerateError };

export async function generateTailoredResume(opts: {
  model: ResumeModelRunner;
  profile: IProfile;
  isAdmin: boolean;
  title: string;
  company: string;
  jobDescription: string;
}): Promise<GeneratedResume> {
  const { model, profile, isAdmin, title, company, jobDescription } = opts;
  const systemPrompt = isAdmin
    ? profile.profileType === 'other'
      ? buildSystemPromptAdminNonSoftware()
      : buildSystemPromptAdmin()
    : profile.profileType === 'other'
    ? buildSystemPromptNonSoftware()
    : buildSystemPrompt();
  const userPrompt = buildUserPrompt(profile, title, company, jobDescription, profile.customPrompt, profile.profileType);
  const tool = buildResumeTool(profile.profileType, isAdmin);

  let first;
  try {
    first = await model.run(systemPrompt, userPrompt, tool);
  } catch (err) {
    if (err instanceof ResumeGenerateError) throw err;
    console.error('[generate] Model did not call the tool:', err, { profileFullName: profile.fullName });
    throw new ResumeGenerateError('Failed to parse response as JSON.', 500);
  }
  if (first.stopReason === 'max_tokens') {
    throw new ResumeGenerateError('The resume was too long to finish generating. Try a shorter job description.', 502);
  }

  let generated: GeneratedResume;
  let toolUse: Anthropic.ToolUseBlock = first.toolUse;
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
        model, systemPrompt, userPrompt, tool, toolUse, validationMessage, profile.profileType
      ));
    } catch (err2) {
      console.error('[generate] Corrective retry also failed:', err2);
      throw new ResumeGenerateError('Failed to parse response as JSON.', 500);
    }
  }

  ({ generated, toolUse } = await repairPrimaryStackCoverage(
    model, systemPrompt, userPrompt, tool, toolUse, generated, profile.profileType
  ));
  if (isAdmin && profile.profileType !== 'other') {
    ({ generated, toolUse } = await repairPositionZeroBulletCount(
      model, systemPrompt, userPrompt, tool, toolUse, generated, profile.profileType
    ));
  }
  ({ generated } = await reviewAuthenticity(
    model, systemPrompt, userPrompt, tool, toolUse, generated, profile.profileType
  ));
  return dedupeSkills(generated);
}
