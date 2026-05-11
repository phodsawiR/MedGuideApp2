import React, { useState } from 'react';
import { X, Calculator, Droplet, Activity, Bone, BrainCircuit, Info } from 'lucide-react';

const ClinicalCalculatorView = () => {
  const [activeTab, setActiveTab] = useState('iv');
  const [searchQuery, setSearchQuery] = useState('');

  // State for IV Fluids
  const [weight, setWeight] = useState('');

  // State for CrCl
  const [crclAge, setCrclAge] = useState('');
  const [crclWeight, setCrclWeight] = useState('');
  const [crclCr, setCrclCr] = useState('');
  const [crclGender, setCrclGender] = useState('male');

  // State for Corrected Ca
  const [ca, setCa] = useState('');
  const [alb, setAlb] = useState('');

  // State for GCS
  const [gcsEye, setGcsEye] = useState(4);
  const [gcsVerbal, setGcsVerbal] = useState(5);
  const [gcsMotor, setGcsMotor] = useState(6);

  const calculateIVFluid = () => {
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) return null;
    let rate = 0;
    if (w <= 10) rate = w * 4;
    else if (w <= 20) rate = 40 + (w - 10) * 2;
    else rate = 60 + (w - 20) * 1;
    return rate;
  };

  const calculateCrCl = () => {
    const a = parseFloat(crclAge);
    const w = parseFloat(crclWeight);
    const cr = parseFloat(crclCr);
    if (isNaN(a) || isNaN(w) || isNaN(cr) || a <= 0 || w <= 0 || cr <= 0) return null;
    let crcl = ((140 - a) * w) / (72 * cr);
    if (crclGender === 'female') crcl *= 0.85;
    return crcl.toFixed(1);
  };

  const calculateCorrectedCa = () => {
    const c = parseFloat(ca);
    const a = parseFloat(alb);
    if (isNaN(c) || isNaN(a) || c <= 0 || a <= 0) return null;
    return (c + 0.8 * (4.0 - a)).toFixed(2);
  };

  const showIV = !searchQuery || 'iv fluid maintenance 4-2-1 water'.includes(searchQuery.toLowerCase());
  const showCrCl = !searchQuery || 'crcl creatinine clearance kidney ckd egfr cockcroft gault'.includes(searchQuery.toLowerCase());
  const showCa = !searchQuery || 'ca calcium corrected albumin hypoalbuminemia'.includes(searchQuery.toLowerCase());
  const showGCS = !searchQuery || 'gcs glasgow coma scale neuro brain head'.includes(searchQuery.toLowerCase());

  // If there's a search query, we show all matching calculators rather than using activeTab
  const isSearchMode = searchQuery.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Search Bar for Clinical Calculator */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="🔍 ค้นหาใน Clinical Calculator (เช่น Fluid, CrCl, GCS)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all text-sm shadow-sm"
          />
          <div className="absolute left-3 top-3.5 text-gray-400">
            <Calculator size={18} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row">
        {/* Tabs - Only show when not searching */}
        {!isSearchMode && (
          <div className="flex flex-col bg-gray-50 p-3 border-b md:border-b-0 md:border-r border-gray-200 md:w-64 shrink-0 space-y-2">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">Calculators</h4>
            <button
              onClick={() => setActiveTab('iv')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${
                activeTab === 'iv' ? 'bg-white shadow-sm text-blue-600 border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Droplet size={18} /> <span>IV Fluid (4-2-1)</span>
            </button>
            <button
              onClick={() => setActiveTab('crcl')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${
                activeTab === 'crcl' ? 'bg-white shadow-sm text-amber-600 border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Activity size={18} /> <span>CrCl (Cockcroft-Gault)</span>
            </button>
            <button
              onClick={() => setActiveTab('ca')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${
                activeTab === 'ca' ? 'bg-white shadow-sm text-purple-600 border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Bone size={18} /> <span>Corrected Calcium</span>
            </button>
            <button
              onClick={() => setActiveTab('gcs')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${
                activeTab === 'gcs' ? 'bg-white shadow-sm text-pink-600 border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BrainCircuit size={18} /> <span>GCS Score</span>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-4 md:p-6 bg-slate-50 min-h-[500px] flex-1 space-y-8">
          
          {/* Empty State */}
          {isSearchMode && !showIV && !showCrCl && !showCa && !showGCS && (
            <div className="text-center py-10 text-gray-400">
              ไม่พบเครื่องคิดเลขที่ตรงกับการค้นหา "{searchQuery}"
            </div>
          )}

          {/* IV Fluid Calculator */}
          {(showIV && (isSearchMode || activeTab === 'iv')) && (
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

              {calculateIVFluid() !== null && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
                  <h5 className="text-gray-500 text-sm font-bold mb-2">Maintenance Rate</h5>
                  <div className="text-4xl font-black text-blue-600">{calculateIVFluid()} <span className="text-lg text-gray-400">ml/hr</span></div>
                  <div className="mt-3 text-xs text-gray-400 bg-gray-50 p-2 rounded">
                    = {(calculateIVFluid() * 24).toLocaleString()} ml/day
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CrCl Calculator */}
          {(showCrCl && (isSearchMode || activeTab === 'crcl')) && (
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

              {calculateCrCl() !== null && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
                  <h5 className="text-gray-500 text-sm font-bold mb-2">Estimated CrCl</h5>
                  <div className="text-4xl font-black text-amber-600">{calculateCrCl()} <span className="text-lg text-gray-400">ml/min</span></div>
                  {parseFloat(calculateCrCl()) < 30 && (
                    <div className="mt-3 text-xs text-red-600 font-bold bg-red-50 p-2 rounded flex items-center justify-center gap-1">
                      <Info size={14} /> Severe renal impairment (พิจารณาปรับขนาดยา)
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Corrected Ca Calculator */}
          {(showCa && (isSearchMode || activeTab === 'ca')) && (
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

              {calculateCorrectedCa() !== null && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
                  <h5 className="text-gray-500 text-sm font-bold mb-2">Corrected Calcium</h5>
                  <div className="text-4xl font-black text-purple-600">{calculateCorrectedCa()} <span className="text-lg text-gray-400">mg/dL</span></div>
                  <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    Normal range: 8.5 - 10.5 mg/dL
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GCS Calculator */}
          {(showGCS && (isSearchMode || activeTab === 'gcs')) && (
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
                  <div className="text-4xl font-black text-pink-600">{gcsEye + gcsVerbal + gcsMotor} <span className="text-sm text-gray-400">/ 15</span></div>
                </div>
                {(gcsEye + gcsVerbal + gcsMotor) <= 8 && (
                   <div className="mt-3 text-xs text-red-600 font-bold bg-red-50 p-2 rounded-lg border border-red-100 text-center">
                     GCS ≤ 8 : Severe head injury (พิจารณา Intubation)
                   </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export { ClinicalCalculatorView };
