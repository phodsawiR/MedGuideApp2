import React, { useEffect, useMemo, useState } from 'react';
import bank from '../data/acPractice.json';
import './ACPractice.css';

const STORAGE_KEY = 'medguide.ped.ac-practice.v1';
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

function readProgress() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([, item]) =>
      item && LETTERS.includes(item.selected) && typeof item.revealed === 'boolean'
    ));
  } catch { return {}; }
}

function Question({ question, label, progress, onChange }) {
  const selected = progress?.selected;
  const revealed = progress?.revealed === true;
  return (
    <section className="ac-card" aria-label={label}>
      <h3>{label}</h3>
      <p className="ac-stem">{question.stem}</p>
      <div className="ac-options" role="group" aria-label={`ตัวเลือก${label}`}>
        {LETTERS.map(letter => (
          <button
            type="button" key={letter} aria-pressed={selected === letter}
            disabled={revealed}
            className={`ac-option ${selected === letter ? 'is-selected' : ''} ${revealed && question.answer === letter ? 'is-correct' : ''} ${revealed && selected === letter && selected !== question.answer ? 'is-wrong' : ''}`}
            onClick={() => onChange({ selected: letter, revealed: false })}
          >
            <strong>{letter}.</strong><span>{question.choices[letter]}</span>
          </button>
        ))}
      </div>
      {!revealed && <button type="button" className="ac-primary" disabled={!selected}
        onClick={() => onChange({ selected, revealed: true })}>ตรวจคำตอบและเปิดเฉลย</button>}
      {revealed && (
        <div className="ac-explanation" aria-live="polite">
          <p className="ac-result">{selected === question.answer ? '✓ ตอบถูก' : 'ลองทบทวนจุดตัดสินคำตอบ'} · เฉลย {question.answer}. {question.choices[question.answer]}</p>
          {question.changed_facts && <p><strong>จุดที่เปลี่ยน:</strong> {question.changed_facts.join(' / ')}</p>}
          <p>{question.explanation}</p>
          <h4>เหตุผลของตัวลวง</h4>
          {typeof question.distractors === 'string' ? <p>{question.distractors}</p> : (
            <ul>{Object.entries(question.distractors).map(([letter, text]) => <li key={letter}><strong>{letter}:</strong> {text}</li>)}</ul>
          )}
          <h4>นำไปใช้กับข้อสอบจริง</h4><p>{question.learning_point}</p>
        </div>
      )}
    </section>
  );
}

export default function ACPractice() {
  const [system, setSystem] = useState('all');
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState(bank.records[0]?.id);
  const [progress, setProgress] = useState(readProgress);
  const [storageWarning, setStorageWarning] = useState(false);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); setStorageWarning(false); }
    catch { setStorageWarning(true); }
  }, [progress]);
  const systems = useMemo(() => [...new Set(bank.records.flatMap(r => r.systems))].sort(), []);
  const pool = useMemo(() => bank.records.filter(r =>
    (system === 'all' || r.systems.includes(system)) &&
    `${r.id} ${r.main.stem} ${r.twist.stem}`.toLowerCase().includes(search.trim().toLowerCase())
  ), [system, search]);
  const index = Math.max(0, pool.findIndex(r => r.id === activeId));
  const current = pool[index];
  const completed = bank.records.reduce((sum, r) => sum + ['main', 'twist'].filter(k => progress[`${r.id}:${k}`]?.revealed).length, 0);
  const correct = bank.records.reduce((sum, r) => sum + ['main', 'twist'].filter(k => {
    const p = progress[`${r.id}:${k}`]; return p?.revealed && p.selected === r[k].answer;
  }).length, 0);
  const update = (key, value) => setProgress(prev => ({ ...prev, [key]: value }));
  function randomize() {
    const candidates = pool.filter(r => r.id !== current?.id);
    if (candidates.length) setActiveId(candidates[Math.floor(Math.random() * candidates.length)].id);
  }
  function resetPair() {
    setProgress(prev => {
      const next = { ...prev };
      delete next[`${current.id}:main`]; delete next[`${current.id}:twist`];
      return next;
    });
  }
  return (
    <div className="ac-practice">
      <header className="ac-heading">
        <p className="ac-eyebrow">PEDIATRICS · AC → USMLE</p>
        <h2>กุมารเวชศาสตร์ · ฝึกคิดและบิดโจทย์</h2>
        <p>{bank.records.length} คู่ · {bank.records.length * 2} โจทย์ พร้อมเฉลยและเหตุผล</p>
        <p className="ac-muted">โจทย์สร้างใหม่จากแนวคิดใน AC ไม่ใช่ข้อความหรือเฉลยข้อสอบเดิม ลองตอบทั้งสองแบบ แล้วหาข้อมูลที่ทำให้คำตอบเปลี่ยน</p>
        <p role="status">ทำแล้ว {completed}/{bank.records.length * 2} ข้อ · ถูก {correct} ข้อ</p>
        {storageWarning ? <p className="ac-muted">บันทึกความก้าวหน้าในเครื่องไม่ได้ คำตอบยังใช้ได้ระหว่างเปิดหน้านี้</p> : <p className="ac-muted ac-small">บันทึกคำตอบในเบราว์เซอร์นี้อัตโนมัติ</p>}
      </header>
      <div className="ac-controls">
        <label>ระบบ<select value={system} onChange={e => setSystem(e.target.value)}>
          <option value="all">ทุกระบบ</option>{systems.map(s => <option key={s} value={s}>{s}</option>)}
        </select></label>
        <label>ค้นหา<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="อาการ หรือ Q-ID" /></label>
        <button type="button" onClick={randomize} disabled={pool.length < 2}>สุ่มคู่โจทย์</button>
      </div>
      {!current ? <div className="ac-card"><p>ไม่พบโจทย์ที่ตรงกับตัวกรอง</p><button type="button" onClick={() => { setSystem('all'); setSearch(''); }}>ล้างตัวกรอง</button></div> : <>
        <nav className="ac-navigation" aria-label="เปลี่ยนคู่โจทย์">
          <button type="button" disabled={index === 0} onClick={() => setActiveId(pool[index - 1].id)}>← ก่อนหน้า</button>
          <label>คู่ที่<select aria-label="เลือกคู่โจทย์" value={current.id} onChange={e => setActiveId(e.target.value)}>
            {pool.map((r, i) => <option key={r.id} value={r.id}>{i + 1} / {pool.length}</option>)}
          </select></label>
          <button type="button" disabled={index === pool.length - 1} onClick={() => setActiveId(pool[index + 1].id)}>ถัดไป →</button>
        </nav>
        <div key={current.id}>
          <Question label="โจทย์หลัก" question={current.main} progress={progress[`${current.id}:main`]} onChange={v => update(`${current.id}:main`, v)} />
          <Question label="โจทย์บิด" question={current.twist} progress={progress[`${current.id}:twist`]} onChange={v => update(`${current.id}:twist`, v)} />
          <button type="button" onClick={resetPair}>ลองคู่นี้ใหม่</button>
          <details className="ac-sources"><summary>ต้นแบบและแหล่งอ้างอิง</summary>
            <p>Sources: [{current.id}] — {current.source_file} (ped)</p>
            <p><strong>แนวคิดจาก AC:</strong> {current.source_basis}</p>
            <p><strong>ส่วนที่สร้างเพิ่ม:</strong> {current.added_context}</p>
            <p><strong>เป้าหมายการฝึก:</strong> {current.learning_objective}</p>
            <ul>{current.clinical_sources.map((s, i) => <li key={`${s.url}-${i}`}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a> — {s.supports}</li>)}</ul>
          </details>
        </div>
      </>}
      <details className="ac-sources"><summary>ขอบเขตชุดฝึกและต้นแบบที่พักไว้</summary>
        <p>ต่อจากรายการงานค้างของ Claude: 197 การ์ด AC เมื่อตัด Q-ID ซ้ำข้ามระบบเหลือ 105 ต้นแบบ เป็นบางส่วนของคลัง AC</p>
        <ul>{bank.held.map(r => <li key={r.id}>{r.id} — {r.reason}</li>)}</ul>
      </details>
    </div>
  );
}
