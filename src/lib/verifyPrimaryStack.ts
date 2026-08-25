import type { GeneratedResume } from '@/types/resume';

/** Returns PRIMARY STACK terms (admin prompt only) that don't appear bolded in at least 2 different companies' bullets. */
export function findMissingPrimaryStack(generated: GeneratedResume): string[] {
  const primaryStack = generated.primary_stack;
  if (!primaryStack || primaryStack.length === 0) return [];

  const missing: string[] = [];
  for (const term of primaryStack) {
    const normalized = term.trim().toLowerCase();
    if (!normalized) continue;

    const companiesWithTerm = new Set<string>();
    for (const exp of generated.experience_bullets) {
      const hasBoldedTerm = exp.bullets.some((bullet) => {
        const boldMatches = bullet.match(/\*\*(.+?)\*\*/g) ?? [];
        return boldMatches.some((m) => m.slice(2, -2).toLowerCase().includes(normalized));
      });
      if (hasBoldedTerm) companiesWithTerm.add(exp.company);
    }

    if (companiesWithTerm.size < 2) missing.push(term);
  }
  return missing;
}
