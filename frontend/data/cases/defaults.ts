import type { CompletionRules } from "@/types/case";

export function completionRules(overrides: Partial<CompletionRules> = {}): CompletionRules {
  return {
    minEvidenceForWarrant: 3,
    minCitedEvidence: 2,
    maxWarrantAttempts: 3,
    warrantTimeCost: 30,
    wrongWarrantTimePenalty: 60,
    captureTimeCost: 20,
    wrongCaptureTimePenalty: 45,
    maxCaptureAttempts: 3,
    ...overrides,
  };
}
