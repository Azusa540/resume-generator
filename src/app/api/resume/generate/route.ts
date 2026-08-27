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

  let message;
  try {
    message = await client.messages.create(
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 16000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt },
        ],
      },
      // Cap the upstream call so a stalled/slow generation fails cleanly instead of hanging forever.
      { timeout: 120_000 }
    );
  } catch (err) {
    const status = (err as { status?: number })?.status;
    const errorMessage =
      status === 429
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

  const rawText = message.content[0]?.type === 'text' ? message.content[0].text : '';
  // Strip markdown fences and extract only the JSON object (model may append a plain-text note after the closing brace)
  const stripped = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  const jsonEnd = stripped.lastIndexOf('}');
  const raw = jsonEnd !== -1 ? stripped.slice(0, jsonEnd + 1) : stripped;

  let generated: GeneratedResume;
  try {
    generated = JSON.parse(raw) as GeneratedResume;
  } catch {
    return NextResponse.json(
      { message: 'Failed to parse response as JSON.', raw: rawText },
      { status: 500 }
    );
  }

  generated = await repairPrimaryStackCoverage(client, systemPrompt, userPrompt, raw, generated);
  generated = await reviewAuthenticity(client, systemPrompt, userPrompt, JSON.stringify(generated), generated);

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
