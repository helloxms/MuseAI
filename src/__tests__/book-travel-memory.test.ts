import { describe, expect, it } from 'vitest';
import { parseBookTravelMemoryKeeperResult, getBookTravelPlotMemory } from '../utils/bookTravelMemory';

describe('bookTravelMemory', () => {
  it('parses camelCase keeper output and ignores empty strings', () => {
    const parsed = parseBookTravelMemoryKeeperResult({
      summary: ' 林晚转入正厅。 ',
      keyChoices: ['主动去正厅', '  '],
      unresolvedConflicts: ['替嫁真相未明'],
      divergenceFromOutline: '偏离回避路线',
    });

    expect(parsed).toEqual({
      summaryMemory: '林晚转入正厅。',
      keyChoices: ['主动去正厅'],
      unresolvedConflicts: ['替嫁真相未明'],
      divergenceFromOutline: '偏离回避路线',
    });
  });

  it('accepts snake_case aliases and keeps omitted fields unset', () => {
    const parsed = parseBookTravelMemoryKeeperResult({
      summary_memory: '只更新摘要',
      key_choices: ['留下玉佩'],
    });

    expect(parsed).toEqual({
      summaryMemory: '只更新摘要',
      keyChoices: ['留下玉佩'],
    });
  });

  it('returns null for empty or invalid payloads', () => {
    expect(parseBookTravelMemoryKeeperResult(null)).toBeNull();
    expect(parseBookTravelMemoryKeeperResult('摘要')).toBeNull();
    expect(parseBookTravelMemoryKeeperResult({})).toBeNull();
  });

  it('normalizes store-like plot memory with fallbacks', () => {
    expect(getBookTravelPlotMemory(undefined)).toEqual({
      summaryMemory: '',
      keyChoices: [],
      unresolvedConflicts: [],
      divergenceFromOutline: '',
    });
    expect(getBookTravelPlotMemory({
      summaryMemory: ' 主线仍在沈府 ',
      keyChoices: ['留下', ''],
      unresolvedConflicts: undefined,
      divergenceFromOutline: ' 略偏 ',
    })).toEqual({
      summaryMemory: '主线仍在沈府',
      keyChoices: ['留下'],
      unresolvedConflicts: [],
      divergenceFromOutline: '略偏',
    });
  });
});
