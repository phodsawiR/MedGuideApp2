import React, { useState } from 'react';
import { Bone } from 'lucide-react';

export const CorrectedCaCalc = () => {
  const [ca, setCa] = useState('');
  const [alb, setAlb] = useState('');

  const calculateCorrectedCa = () => {
    const c = parseFloat(ca);
    const a = parseFloat(alb);
    if (isNaN(c) || isNaN(a) || c <= 0 || a <= 0) return null;
    return (c + 0.8 * (4.0 - a)).toFixed(2);
  };

  const correctedCa = calculateCorrectedCa();

  return (
    <div className="animate-in fade-in space-y-4 max-w-2xl mx-auto">
      <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl shadow-sm">
        <h4 className="font-bold text-purple-800 mb-1 flex items-center gap-2">
          <Bone size={18} /> Corrected Calcium
        </h4>
        <p className="text-xs text-purple-700 mb-4">สำหรับประเมินค่า Calcium ที่แท้จริงในภาวะ Hypoalbuminemia</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Measured Total Calcium (mg/dL)</label>
            <input type="number" step="0.1" value={ca} onChange={e => setCa(e.target.value)} className="w-full p-2.5 rounded-lg border-2 border-purple-200 focus:border-purple-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Serum Albumin (g/dL)</label>
            <input type="number" step="0.1" value={alb} onChange={e => setAlb(e.target.value)} className="w-full p-2.5 rounded-lg border-2 border-purple-200 focus:border-purple-500 outline-none" />
          </div>
        </div>
      </div>

      {correctedCa !== null && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
          <h5 className="text-gray-500 text-sm font-bold mb-2">Corrected Calcium</h5>
          <div className="text-4xl font-black text-purple-600">{correctedCa} <span className="text-lg text-gray-400">mg/dL</span></div>
          <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded">
            Normal range: 8.5 - 10.5 mg/dL
          </div>
        </div>
      )}
    </div>
  );
};
