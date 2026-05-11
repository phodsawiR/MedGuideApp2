import React, { useState } from 'react';
import { BrainCircuit } from 'lucide-react';

export const GCSCalc = () => {
  const [gcsEye, setGcsEye] = useState(4);
  const [gcsVerbal, setGcsVerbal] = useState(5);
  const [gcsMotor, setGcsMotor] = useState(6);

  const total = gcsEye + gcsVerbal + gcsMotor;

  return (
    <div className="animate-in fade-in space-y-4 max-w-2xl mx-auto">
      <div className="bg-pink-50 border border-pink-200 p-4 rounded-xl shadow-sm">
        <h4 className="font-bold text-pink-800 mb-1 flex items-center gap-2">
          <BrainCircuit size={18} /> Glasgow Coma Scale (GCS)
        </h4>
        
        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Eye Opening (E)</label>
            <div className="space-y-2">
              {[
                {v: 4, t: '4 - Spontaneous (ลืมตาเอง)'},
                {v: 3, t: '3 - To speech (เรียกแล้วลืมตา)'},
                {v: 2, t: '2 - To pain (เจ็บแล้วลืมตา)'},
                {v: 1, t: '1 - None (ไม่ลืมตาเลย)'}
              ].map(opt => (
                <button 
                  key={opt.v} onClick={() => setGcsEye(opt.v)}
                  className={`w-full text-left p-2.5 rounded-lg border text-sm transition-colors ${gcsEye === opt.v ? 'bg-pink-500 text-white border-pink-600 font-bold shadow-sm' : 'bg-white text-gray-600 border-pink-200 hover:bg-pink-50'}`}
                >
                  {opt.t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 mt-4">Verbal Response (V)</label>
            <div className="space-y-2">
              {[
                {v: 5, t: '5 - Oriented (ถามตอบรู้เรื่อง)'},
                {v: 4, t: '4 - Confused (สับสน)'},
                {v: 3, t: '3 - Inappropriate words (พูดเป็นคำๆ ไม่ปะติดปะต่อ)'},
                {v: 2, t: '2 - Incomprehensible sounds (ส่งเสียงคราง)'},
                {v: 1, t: '1 - None (ไม่ออกเสียงเลย)'}
              ].map(opt => (
                <button 
                  key={opt.v} onClick={() => setGcsVerbal(opt.v)}
                  className={`w-full text-left p-2.5 rounded-lg border text-sm transition-colors ${gcsVerbal === opt.v ? 'bg-pink-500 text-white border-pink-600 font-bold shadow-sm' : 'bg-white text-gray-600 border-pink-200 hover:bg-pink-50'}`}
                >
                  {opt.t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 mt-4">Motor Response (M)</label>
            <div className="space-y-2">
              {[
                {v: 6, t: '6 - Obeys commands (ทำตามสั่งได้)'},
                {v: 5, t: '5 - Localizes to pain (ปัดถูกตำแหน่งที่เจ็บ)'},
                {v: 4, t: '4 - Withdraws from pain (ชักหนีความเจ็บปวด)'},
                {v: 3, t: '3 - Abnormal flexion / Decorticate'},
                {v: 2, t: '2 - Abnormal extension / Decerebrate'},
                {v: 1, t: '1 - None (ไม่ขยับเลย)'}
              ].map(opt => (
                <button 
                  key={opt.v} onClick={() => setGcsMotor(opt.v)}
                  className={`w-full text-left p-2.5 rounded-lg border text-sm transition-colors ${gcsMotor === opt.v ? 'bg-pink-500 text-white border-pink-600 font-bold shadow-sm' : 'bg-white text-gray-600 border-pink-200 hover:bg-pink-50'}`}
                >
                  {opt.t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center sticky bottom-4 z-10 mt-4">
        <div className="flex justify-between items-center">
          <div className="text-left">
            <h5 className="text-gray-500 text-sm font-bold mb-1">Total Score</h5>
            <div className="text-xs text-pink-600 font-mono bg-pink-50 px-2 py-1 rounded border border-pink-100">E{gcsEye}V{gcsVerbal}M{gcsMotor}</div>
          </div>
          <div className="text-4xl font-black text-pink-600">{total} <span className="text-sm text-gray-400">/ 15</span></div>
        </div>
        {total <= 8 && (
           <div className="mt-3 text-xs text-red-600 font-bold bg-red-50 p-2 rounded-lg border border-red-100 text-center">
             GCS ≤ 8 : Severe head injury (พิจารณา Intubation)
           </div>
        )}
      </div>
    </div>
  );
};
