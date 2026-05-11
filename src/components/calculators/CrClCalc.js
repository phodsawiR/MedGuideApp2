import React, { useState } from 'react';
import { Activity, Info } from 'lucide-react';

export const CrClCalc = () => {
  const [crclAge, setCrclAge] = useState('');
  const [crclWeight, setCrclWeight] = useState('');
  const [crclCr, setCrclCr] = useState('');
  const [crclGender, setCrclGender] = useState('male');

  const calculateCrCl = () => {
    const a = parseFloat(crclAge);
    const w = parseFloat(crclWeight);
    const cr = parseFloat(crclCr);
    if (isNaN(a) || isNaN(w) || isNaN(cr) || a <= 0 || w <= 0 || cr <= 0) return null;
    let crcl = ((140 - a) * w) / (72 * cr);
    if (crclGender === 'female') crcl *= 0.85;
    return crcl.toFixed(1);
  };

  const crcl = calculateCrCl();

  return (
    <div className="animate-in fade-in space-y-4 max-w-2xl mx-auto">
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-sm">
        <h4 className="font-bold text-amber-800 mb-1 flex items-center gap-2">
          <Activity size={18} /> Creatinine Clearance (Cockcroft-Gault)
        </h4>
        <p className="text-xs text-amber-700 mb-4">ใช้สำหรับประเมินการทำงานของไต และปรับขนาดยา</p>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-1">เพศ (Gender)</label>
            <div className="flex bg-white rounded-lg border overflow-hidden shadow-sm">
              <button 
                onClick={() => setCrclGender('male')}
                className={`flex-1 py-2 text-sm font-bold transition-colors ${crclGender === 'male' ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >ชาย</button>
              <button 
                onClick={() => setCrclGender('female')}
                className={`flex-1 py-2 text-sm font-bold transition-colors ${crclGender === 'female' ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >หญิง</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">อายุ (ปี)</label>
            <input type="number" value={crclAge} onChange={e => setCrclAge(e.target.value)} className="w-full p-2.5 rounded-lg border-2 border-amber-200 focus:border-amber-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">น้ำหนัก (kg)</label>
            <input type="number" value={crclWeight} onChange={e => setCrclWeight(e.target.value)} className="w-full p-2.5 rounded-lg border-2 border-amber-200 focus:border-amber-500 outline-none" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-1">Serum Creatinine (mg/dL)</label>
            <input type="number" step="0.01" value={crclCr} onChange={e => setCrclCr(e.target.value)} className="w-full p-2.5 rounded-lg border-2 border-amber-200 focus:border-amber-500 outline-none" />
          </div>
        </div>
      </div>

      {crcl !== null && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
          <h5 className="text-gray-500 text-sm font-bold mb-2">Estimated CrCl</h5>
          <div className="text-4xl font-black text-amber-600">{crcl} <span className="text-lg text-gray-400">ml/min</span></div>
          {parseFloat(crcl) < 30 && (
            <div className="mt-3 text-xs text-red-600 font-bold bg-red-50 p-2 rounded flex items-center justify-center gap-1">
              <Info size={14} /> Severe renal impairment (พิจารณาปรับขนาดยา)
            </div>
          )}
        </div>
      )}
    </div>
  );
};
