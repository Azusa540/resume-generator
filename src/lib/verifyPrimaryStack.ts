import type { GeneratedResume } from '@/types/resume';

/**
 * Returns PRIMARY STACK terms (admin prompt only) that don't appear bolded in
 * at least `minCompanies` different companies' bullets. The software admin
 * prompt requires 3; the non-software admin prompt still requires 2 — callers
 * pass the threshold that matches whichever prompt actually generated this.
 */
export function findMissingPrimaryStack(generated: GeneratedResume, minCompanies = 2): string[] {
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

    if (companiesWithTerm.size < minCompanies) missing.push(term);
  }
  return missing;
}
