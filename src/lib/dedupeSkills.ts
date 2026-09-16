import type { GeneratedResume, SkillCategories } from '@/types/resume';

function normalize(skill: string): string {
  return skill.trim().toLowerCase();
}

/**
 * The prompts already instruct the model to put each skill in exactly one
 * category (e.g. "Python" belongs in Languages only, never repeated in
 * Backend) — but this doesn't always get followed reliably. Enforce it
 * locally as a deterministic backstop: keep each exact-duplicate skill in
 * whichever category lists it FIRST and drop later repeats. Categories are
 * always emitted with "Languages" first per the schema, so a language
 * correctly wins over its framework category with no extra logic needed.
 *
 * This only catches exact (case-insensitive) string duplicates — e.g. the
 * same "Python" listed twice. It does not catch semantic duplicates worded
 * differently (e.g. "Postgres" in one category, "PostgreSQL" in another);
 * that class still relies on the prompt's own NO DUPLICATES rule.
 */
export function dedupeSkills(generated: GeneratedResume): GeneratedResume {
  if (Array.isArray(generated.skills)) {
    const seen = new Set<string>();
    const deduped = generated.skills.filter((skill) => {
      const key = normalize(skill);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { ...generated, skills: deduped };
  }

  const seen = new Set<string>();
  const deduped: SkillCategories = {};
  for (const [category, items] of Object.entries(generated.skills)) {
    deduped[category] = items.filter((skill) => {
      const key = normalize(skill);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  return { ...generated, skills: deduped };
}
