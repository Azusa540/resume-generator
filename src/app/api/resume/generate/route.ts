import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { connectDB } from '@/lib/mongodb';
import { getUser } from '@/lib/auth';
import Profile from '@/models/Profile';
import User from '@/models/User';
import { buildSystemPrompt, buildSystemPromptNonSoftware, buildUserPrompt } from '@/lib/prompts';
import { buildSystemPromptAdmin } from '@/lib/adminPrompt';
import { buildSystemPromptAdminNonSoftware } from '@/lib/adminPromptNonSoftware';
import { repairPrimaryStackCoverage } from '@/lib/resumeRepair';
import { reviewAuthenticity } from '@/lib/authenticityReview';
import { buildResumeTool, extractGeneratedResume } from '@/lib/resumeSchema';
import type { GeneratedResume } from '@/types/resume';

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  const { profileId, title, company, jobDescription } = await req.json();
  if (!profileId || !title || !company || !jobDescription) {
    return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
  }

  await connectDB();
  const [profile, dbUser] = await Promise.all([
    Profile.findOne({ _id: profileId, userId: user.id }),
    User.findById(user.id, { anthropicApiKey: 1 }),
  ]);
  if (!profile) return NextResponse.json({ message: 'Profile not found.' }, { status: 404 });
  if (profile.employment.length === 0) {
    return NextResponse.json(
      { message: 'This profile has no work experience yet. Add at least one job before generating a resume.' },
      { status: 400 }
    );
  }
  if (!dbUser?.anthropicApiKey) {
    return NextResponse.json(
      { message: 'No Claude API key configured for your account. Ask an admin to set one.' },
      { status: 400 }
    );
  }
  const client = new Anthropic({ apiKey: dbUser.anthropicApiKey });

  const systemPrompt = user.isAdmin
    ? profile.profileType === 'other'
      ? buildSystemPromptAdminNonSoftware()
      : buildSystemPromptAdmin()
    : profile.profileType === 'other'
    ? buildSystemPromptNonSoftware()
    : buildSystemPrompt();
  const userPrompt = buildUserPrompt(profile, title, company, jobDescription, profile.customPrompt, profile.profileType);
  const tool = buildResumeTool(profile.profileType, user.isAdmin);

  let message;
  try {
    message = await client.messages.create(
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 16000,
        system: systemPrompt,
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
        messages: [
          { role: 'user', content: userPrompt },
        ],
      },
      // Cap the upstream call so a stalled/slow generation fails cleanly instead of hanging forever.
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
    return NextResponse.json({ message: errorMessage }, { status: 502 });
  }

  // The model may stop at max_tokens; surface that as a clear error rather than a parse failure.
  if (message.stop_reason === 'max_tokens') {
    return NextResponse.json(
      { message: 'The resume was too long to finish generating. Try a shorter job description.' },
      { status: 502 }
    );
  }

  let generated: GeneratedResume;
  let toolUse: Anthropic.ToolUseBlock;
  try {
    ({ generated, toolUse } = extractGeneratedResume(message, profile.profileType));
  } catch (err) {
    console.error('[generate] Failed to extract/validate resume tool output:', err, {
      profileFullName: profile.fullName,
      employmentCount: profile.employment.length,
      title,
      company,
      jobDescriptionLen: jobDescription.length,
      stopReason: message.stop_reason,
      rawContent: JSON.stringify(message.content),
    });
    return NextResponse.json({ message: 'Failed to parse response as JSON.' }, { status: 500 });
  }

  ({ generated, toolUse } = await repairPrimaryStackCoverage(
    client, systemPrompt, userPrompt, tool, toolUse, generated, profile.profileType
  ));
  ({ generated } = await reviewAuthenticity(
    client, systemPrompt, userPrompt, tool, toolUse, generated, profile.profileType
  ));

  return NextResponse.json({
    generated,
    profile: {
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
      linkedin: profile.linkedin,
    },
    pdfTemplate: profile.pdfTemplate ?? 'template1',
  });
}
