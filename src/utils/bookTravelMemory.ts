export interface BookTravelPlotMemory {
  summaryMemory: string;
  keyChoices: string[];
  unresolvedConflicts: string[];
  divergenceFromOutline: string;
}

export const emptyBookTravelPlotMemory = (): BookTravelPlotMemory => ({
  summaryMemory: '',
  keyChoices: [],
  unresolvedConflicts: [],
  divergenceFromOutline: '',
});

const asStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => String(item).trim()).filter(Boolean);
};

const asTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

export function parseBookTravelMemoryKeeperResult(raw: unknown): Partial<BookTravelPlotMemory> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const summaryMemory = asTrimmedString(record.summary ?? record.summaryMemory ?? record.summary_memory);
  const keyChoices = asStringArray(record.keyChoices ?? record.key_choices);
  const unresolvedConflicts = asStringArray(record.unresolvedConflicts ?? record.unresolved_conflicts);
  const divergenceFromOutline = asTrimmedString(
    record.divergenceFromOutline ?? record.divergence_from_outline,
  );

  if (
    summaryMemory === undefined &&
    keyChoices === undefined &&
    unresolvedConflicts === undefined &&
    divergenceFromOutline === undefined
  ) {
    return null;
  }

  return {
    ...(summaryMemory !== undefined ? { summaryMemory } : {}),
    ...(keyChoices !== undefined ? { keyChoices } : {}),
    ...(unresolvedConflicts !== undefined ? { unresolvedConflicts } : {}),
    ...(divergenceFromOutline !== undefined ? { divergenceFromOutline } : {}),
  };
}

export function getBookTravelPlotMemory(state: Partial<BookTravelPlotMemory> | null | undefined): BookTravelPlotMemory {
  return {
    summaryMemory: state?.summaryMemory?.trim() || '',
    keyChoices: Array.isArray(state?.keyChoices) ? state.keyChoices.filter((item) => item.trim()) : [],
    unresolvedConflicts: Array.isArray(state?.unresolvedConflicts)
      ? state.unresolvedConflicts.filter((item) => item.trim())
      : [],
    divergenceFromOutline: state?.divergenceFromOutline?.trim() || '',
  };
}
