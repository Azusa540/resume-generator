import { z } from 'zod';
import type Anthropic from '@anthropic-ai/sdk';
import type { GeneratedResume } from '@/types/resume';

/**
 * Single source of truth for the resume generation output shape, used two ways:
 * 1. As an Anthropic tool `input_schema` — the API constrains the model's tool
 *    call to valid JSON matching this shape server-side, replacing the old
 *    "ask nicely for JSON, then regex it out of free text" approach.
 * 2. As a Zod schema — a second, local validation pass on top of that (the
 *    same idea as Pydantic in Python: parse into a runtime-checked model, not
 *    just a type-asserted blob), catching anything Anthropic's schema
 *    enforcement doesn't (e.g. an empty required array).
 */

export const TOOL_NAME = 'output_resume';

const EDUCATION_ITEM_JSON_SCHEMA = {
  type: 'object',
  properties: {
    education_id: { type: 'string' },
    degree: { type: 'string' },
    university: { type: 'string' },
    period: { type: 'string' },
  },
  required: ['education_id', 'degree', 'university', 'period'],
};

const EXPERIENCE_ITEM_JSON_SCHEMA = {
  type: 'object',
  properties: {
    experience_id: { type: 'string' },
    company: { type: 'string' },
    job_title: { type: 'string' },
    period: { type: 'string' },
    bullets: { type: 'array', items: { type: 'string' } },
  },
  required: ['experience_id', 'company', 'job_title', 'period', 'bullets'],
};

const SOFTWARE_SKILLS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    Languages: { type: 'array', items: { type: 'string' } },
    Database: { type: 'array', items: { type: 'string' } },
    Testing: { type: 'array', items: { type: 'string' } },
    'Cloud & DevOps': { type: 'array', items: { type: 'string' } },
    Others: { type: 'array', items: { type: 'string' } },
  },
  required: ['Languages', 'Database', 'Testing', 'Cloud & DevOps', 'Others'],
  additionalProperties: { type: 'array', items: { type: 'string' } },
};

const NON_SOFTWARE_SKILLS_JSON_SCHEMA = {
  type: 'array',
  items: { type: 'string' },
};

function isSoftware(profileType: 'software' | 'other' | undefined): boolean {
  return profileType !== 'other';
}

/**
 * Builds the forced tool definition for a given profile. `admin` adds
 * "primary_stack" and "domain_overlap" as required fields — those only
 * apply to admin-owned profiles, whose prompts ask the model to self-report
 * them for the repair/authenticity verification passes.
 */
export function buildResumeTool(profileType: 'software' | 'other' | undefined, admin: boolean): Anthropic.Tool {
  const skillsSchema = isSoftware(profileType) ? SOFTWARE_SKILLS_JSON_SCHEMA : NON_SOFTWARE_SKILLS_JSON_SCHEMA;

  const properties: Record<string, unknown> = {
    resume_file_name: { type: 'string' },
    target_job_title: { type: 'string' },
    professional_summary: { type: 'string' },
    skills: skillsSchema,
    education: { type: 'array', items: EDUCATION_ITEM_JSON_SCHEMA },
    experience_bullets: { type: 'array', items: EXPERIENCE_ITEM_JSON_SCHEMA, minItems: 1 },
  };
  const required = [
    'resume_file_name',
    'target_job_title',
    'professional_summary',
    'skills',
    'education',
    'experience_bullets',
  ];

  if (admin) {
    properties.primary_stack = { type: 'array', items: { type: 'string' }, minItems: 1 };
    properties.domain_overlap = { type: 'string', enum: ['same', 'adjacent', 'distant'] };
    required.push('primary_stack', 'domain_overlap');
  }

  return {
    name: TOOL_NAME,
    description:
      'Outputs the complete generated resume content. Always call this tool exactly once with the full resume as its arguments — never respond with plain text.',
    input_schema: {
      type: 'object',
      properties,
      required,
    },
  };
}

const educationSchema = z.object({
  education_id: z.string(),
  degree: z.string(),
  university: z.string(),
  period: z.string(),
});

const experienceBulletSchema = z.object({
  experience_id: z.string(),
  company: z.string(),
  job_title: z.string(),
  period: z.string(),
  bullets: z.array(z.string()),
});

const baseFields = {
  resume_file_name: z.string().min(1),
  target_job_title: z.string().min(1),
  professional_summary: z.string().min(1),
  education: z.array(educationSchema),
  experience_bullets: z.array(experienceBulletSchema).min(1),
  primary_stack: z.array(z.string()).optional(),
  domain_overlap: z.enum(['same', 'adjacent', 'distant']).optional(),
};

const softwareResumeSchema = z.object({
  ...baseFields,
  skills: z.record(z.string(), z.array(z.string())),
});

const nonSoftwareResumeSchema = z.object({
  ...baseFields,
  skills: z.array(z.string()),
});

/**
 * Validates a tool call's raw `input` against the schema for this profile
 * type. Throws a ZodError (with a readable `.message`) on any mismatch —
 * callers should treat that exactly like a JSON parse failure.
 */
export function validateGeneratedResume(input: unknown, profileType: 'software' | 'other' | undefined): GeneratedResume {
  const schema = isSoftware(profileType) ? softwareResumeSchema : nonSoftwareResumeSchema;
  return schema.parse(input) as unknown as GeneratedResume;
}

/**
 * Pulls the tool_use block out of a Claude response and validates it.
 * Throws with a descriptive message on any failure (no tool call, or a
 * tool call that fails schema validation) — callers should log the error
 * and the raw message content, then return a clean user-facing failure.
 */
export function extractGeneratedResume(
  message: Anthropic.Message,
  profileType: 'software' | 'other' | undefined
): { generated: GeneratedResume; toolUse: Anthropic.ToolUseBlock } {
  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
  );
  if (!toolUse) {
    throw new Error(`Model did not call the "${TOOL_NAME}" tool (stop_reason: ${message.stop_reason}).`);
  }
  const generated = validateGeneratedResume(toolUse.input, profileType);
  return { generated, toolUse };
}
