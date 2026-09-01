import type { GeneratedResume } from '@/types/resume';

/**
 * Admin software prompt only. Position 0 (the most recent company, first
 * entry in experience_bullets) must have more than 8 bullets per the
 * Sentence distribution rule in adminPrompt.ts. Returns the actual count so
 * callers can decide whether a repair pass is needed.
 */
export function positionZeroBulletCount(generated: GeneratedResume): number {
  return generated.experience_bullets[0]?.bullets?.length ?? 0;
}
