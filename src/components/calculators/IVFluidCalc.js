import React, { useState } from 'react';
import { Droplet } from 'lucide-react';

export const IVFluidCalc = () => {
  const [weight, setWeight] = useState('');

  const calculateIVFluid = () => {
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) return null;
    let rate = 0;
    if (w <= 10) rate = w * 4;
    else if (w <= 20) rate = 40 + (w - 10) * 2;
    else rate = 60 + (w - 20) * 1;
    return rate;
  };

  const rate = calculateIVFluid();

  return (
    <div className="animate-in fade-in space-y-4 max-w-2xl mx-auto">
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl shadow-sm">
        <h4 className="font-bold text-blue-800 mb-1 flex items-center gap-2">
          <Droplet size={18} /> Maintenance IV Fluid Rate
        </h4>
        <p className="text-xs text-blue-600 mb-4">สูตร 4-2-1 Rule สำหรับคำนวณ Maintenance Rate (ml/hr)</p>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">น้ำหนักผู้ป่วย (kg)</label>
            <input 
              type="number" 
              value={weight} 
              onChange={e => setWeight(e.target.value)} 
              placeholder="e.g., 50"
              className="w-full p-3 rounded-lg border-2 border-blue-200 focus:border-blue-500 outline-none text-lg"
            />
          </div>
        </div>
      </div>

      {rate !== null && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
          <h5 className="text-gray-500 text-sm font-bold mb-2">Maintenance Rate</h5>
          <div className="text-4xl font-black text-blue-600">{rate} <span className="text-lg text-gray-400">ml/hr</span></div>
          <div className="mt-3 text-xs text-gray-400 bg-gray-50 p-2 rounded">
            = {(rate * 24).toLocaleString()} ml/day
          </div>
        </div>
      )}
    </div>
  );
};
