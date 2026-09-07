import { LETTERS, isOrder, shuffleOrder, relabelReferences } from './acChoiceOrder';
import bank from '../data/acPractice.json';
import references from '../data/acChoiceReferences.json';

test('shuffle preserves every original option and moves the answer on retry', () => {
  for (const answer of LETTERS) {
    for (const sample of [0, 0.25, 0.5, 0.75, 0.999]) {
      const next = shuffleOrder(LETTERS, answer, () => sample);
      expect(isOrder(next)).toBe(true);
      expect(next.indexOf(answer)).not.toBe(LETTERS.indexOf(answer));
    }
  }
});

test('audited annotations remain aligned with source prose for every question', () => {
  for (const r of bank.records) for (const kind of ['main', 'twist']) {
    for (const [field, refs] of Object.entries(references[`${r.id}:${kind}`] || {})) {
      const text = field.split('.').reduce((v, key) => v[key], r[kind]);
      for (const ref of refs) {
        const original = text.slice(ref.start, ref.end);
        expect(original).toMatch(/^[A-E](?:[–-][A-E])?$/);
        expect(ref.letters[0]).toBe(original[0]);
        expect(ref.letters[ref.letters.length - 1]).toBe(original[original.length - 1]);
      }
    }
  }
});

test('letters in clinical terms and English articles are never relabelled', () => {
  for (const [id, kind, field, term] of [
    ['Q2025_56', 'main', 'explanation', 'vitamin A'],
    ['Q2020_80', 'main', 'explanation', 'hemophilia A จาก B'],
    ['Q2025_87', 'main', 'explanation', 'infant A'],
    ['Q2019_14', 'twist', 'explanation', 'vitamin D'],
    ['Q2025_171', 'twist', 'learning_point', 'A mediastinal'],
  ]) {
    const q = bank.records.find(r => r.id === id)[kind];
    expect(relabelReferences(q[field], references[`${id}:${kind}`]?.[field], [...LETTERS].reverse())).toContain(term);
  }
});

test('choice ranges expand instead of giving misleading reordered ranges', () => {
  expect(relabelReferences('B–E ไม่เหมาะ', [{ start: 0, end: 3, letters: ['B', 'C', 'D', 'E'] }], ['B', 'E', 'A', 'D', 'C']))
    .toBe('A/E/D/B ไม่เหมาะ');
});
