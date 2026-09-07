import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ACPractice from './ACPractice';
import bank from '../data/acPractice.json';

let container, root;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  container = document.createElement('div'); document.body.append(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
const render = () => act(() => root.render(<ACPractice />));
const click = node => act(() => node.click());

test('all 206 questions retain answers, changed-answer twists, provenance and sources', () => {
  expect(bank.records).toHaveLength(103);
  expect(new Set(bank.records.map(r => r.id)).size).toBe(103);
  expect(bank.held).toHaveLength(2);
  for (const r of bank.records) {
    expect(r.source_file).toBeTruthy(); expect(r.systems.length).toBeGreaterThan(0);
    expect(r.clinical_sources.length).toBeGreaterThan(0);
    for (const q of [r.main, r.twist]) {
      expect(Object.keys(q.choices).sort()).toEqual(['A', 'B', 'C', 'D', 'E']);
      expect(q.choices[q.answer]).toBeTruthy(); expect(q.explanation).toBeTruthy();
    }
    expect(r.twist.choices[r.twist.answer]).not.toBe(r.main.choices[r.main.answer]);
  }
});

test('grading is explicit, independent for main/twist, and resets just the current pair', () => {
  render();
  const cards = container.querySelectorAll('section');
  expect(cards[0].querySelector('.ac-explanation')).toBeNull();
  expect(cards[0].querySelector('.ac-primary').disabled).toBe(true);
  click(cards[0].querySelectorAll('.ac-option')['ABCDE'.indexOf(bank.records[0].main.answer)]);
  click(cards[0].querySelector('.ac-primary'));
  expect(cards[0].textContent).toContain('✓ ตอบถูก');
  expect(cards[1].querySelector('.ac-explanation')).toBeNull();
  expect(container.querySelector('[role="status"]').textContent).toContain('ทำแล้ว 1/206');
  expect(JSON.parse(localStorage.getItem('medguide.ped.ac-practice.v1'))[`${bank.records[0].id}:main`].revealed).toBe(true);
  click([...container.querySelectorAll('button')].find(b => b.textContent === 'ลองคู่นี้ใหม่'));
  expect(container.querySelector('.ac-explanation')).toBeNull();
  expect(container.querySelector('[role="status"]').textContent).toContain('ทำแล้ว 0/206');
});

test('navigation retains answers and filters handle empty results without losing progress', () => {
  render(); click(container.querySelector('.ac-option')); click(container.querySelector('.ac-primary'));
  click([...container.querySelectorAll('button')].find(b => b.textContent === 'ถัดไป →'));
  expect(container.querySelector('.ac-explanation')).toBeNull();
  click([...container.querySelectorAll('button')].find(b => b.textContent === '← ก่อนหน้า'));
  expect(container.querySelector('.ac-explanation')).not.toBeNull();
  const input = container.querySelector('input[type="search"]');
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'zzzz-no-such-case');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(container.textContent).toContain('ไม่พบโจทย์ที่ตรงกับตัวกรอง');
  click([...container.querySelectorAll('button')].find(b => b.textContent === 'ล้างตัวกรอง'));
  expect(container.querySelector('.ac-explanation')).not.toBeNull();
});

test('unavailable or malformed local storage does not prevent practicing', () => {
  localStorage.setItem('medguide.ped.ac-practice.v1', '{broken');
  const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  try {
    render(); expect(container.querySelectorAll('.ac-option')).toHaveLength(10);
    expect(container.textContent).toContain('บันทึกความก้าวหน้าในเครื่องไม่ได้');
    click(container.querySelector('.ac-option')); click(container.querySelector('.ac-primary'));
    expect(container.querySelector('.ac-explanation')).not.toBeNull();
  } finally { spy.mockRestore(); }
});
