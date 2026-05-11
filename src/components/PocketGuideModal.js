import React, { useState } from 'react';
import { X, Copy, CheckCircle, FileText, Zap, FlaskConical, ShieldAlert, HeartPulse } from 'lucide-react';

const PocketGuideModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('notes');
  const [copiedNote, setCopiedNote] = useState(null);

  if (!isOpen) return null;

  const notesTemplates = [
    {
      title: 'Progress Note (SOAP)',
      content: `S: 
- อาการทั่วไปวันนี้
- อาการที่ผู้ป่วยบ่นเพิ่มเติม

O: 
- V/S: T= , HR= , BP= , RR= , SpO2=
- I/O: 
- PE: (Focus on relevant systems)
- Labs/Inv: 

A: 
- (Diagnosis/Problem 1): Clinical progression
- (Diagnosis/Problem 2): Clinical progression

P: 
- 
- 
- 
- `
    },
    {
      title: 'Admission Note',
      content: `CC: 
PI: 
PMH: 
Allergy: 
Meds: 

PE:
- V/S: T= , HR= , BP= , RR= , SpO2=
- HEENT: 
- Heart: 
- Lungs: 
- Abdomen: 
- Neuro: 

Labs/Imaging: 

Impression/Problem list:
1. 
2. 

Management:
1. 
2. 
3. `
    },
    {
      title: 'Post-op Note',
      content: `Pre-op Dx: 
Post-op Dx: 
Operation: 
Surgeon/Asst: 
Anesthesia: 
Findings: 
EBL:  ml
Urine output:  ml
Specimen: 
Complications: None
Condition: Stable

Plan:
- V/S q 4 hr
- NPO / Diet:
- IV Fluid:
- Analgesic:
- Antibiotic:`
    }
  ];

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedNote(id);
    setTimeout(() => setCopiedNote(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 to-blue-800 p-4 flex justify-between items-center text-white">
          <h3 className="font-bold flex items-center gap-2">
            <HeartPulse size={22} /> Ward Pocket Guide
          </h3>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 p-2 overflow-x-auto custom-scrollbar border-b border-gray-200">
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'notes' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText size={16} /> Smart Note Templates
          </button>
          <button
            onClick={() => setActiveTab('drugs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'drugs' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Zap size={16} /> Emergency Drugs
          </button>
          <button
            onClick={() => setActiveTab('labs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'labs' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FlaskConical size={16} /> Quick Lab Ref
          </button>
          <button
            onClick={() => setActiveTab('abx')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'abx' ? 'bg-white shadow-sm text-amber-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ShieldAlert size={16} /> Antibiotic Guide
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50">
          
          {/* Note Templates */}
          {activeTab === 'notes' && (
            <div className="animate-in fade-in space-y-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notesTemplates.map((template, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
                  <div className="bg-blue-50 p-3 border-b border-blue-100 flex justify-between items-center">
                    <h4 className="font-bold text-blue-900 text-sm">{template.title}</h4>
                    <button 
                      onClick={() => handleCopy(template.content, idx)}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${copiedNote === idx ? 'bg-green-100 text-green-700 font-bold' : 'bg-white border text-blue-600 hover:bg-blue-100'}`}
                    >
                      {copiedNote === idx ? <><CheckCircle size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                    </button>
                  </div>
                  <div className="p-3 bg-gray-50/50 flex-1">
                    <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">{template.content}</pre>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Emergency Drugs */}
          {activeTab === 'drugs' && (
            <div className="animate-in fade-in space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                  <Zap size={18} /> ACLS & Emergency Drugs
                </h4>
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded-lg border border-red-100 shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <h5 className="font-bold text-gray-900">Adrenaline (Epinephrine)</h5>
                      <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold uppercase">Cardiac Arrest</span>
                    </div>
                    <p className="text-sm text-gray-700"><strong>Dose:</strong> 1 mg IV/IO push ทุก 3-5 นาที</p>
                    <p className="text-xs text-gray-500 mt-1">ผสม: 1 amp (1mg/1ml) ฉีดได้เลย แล้วตามด้วย NSS 20 ml flush และยกแขนสูง</p>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-red-100 shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <h5 className="font-bold text-gray-900">Amiodarone</h5>
                      <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold uppercase">VF / pVT</span>
                    </div>
                    <p className="text-sm text-gray-700"><strong>Dose 1:</strong> 300 mg IV/IO push</p>
                    <p className="text-sm text-gray-700"><strong>Dose 2:</strong> 150 mg IV/IO push (หากยังไม่ดีขึ้น)</p>
                    <p className="text-xs text-gray-500 mt-1">ผสม: 2 amps (300mg) ผสม 5%DW 20 ml (ห้ามผสม NSS)</p>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-red-100 shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <h5 className="font-bold text-gray-900">Atropine</h5>
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold uppercase">Bradycardia</span>
                    </div>
                    <p className="text-sm text-gray-700"><strong>Dose:</strong> 1 mg IV push ทุก 3-5 นาที (Max: 3 mg)</p>
                    <p className="text-xs text-gray-500 mt-1">ผสม: 1 amp (0.6mg/1ml) ฉีดเลย ระวังให้ช้าเกินไปอาจทำให้ paradoxial bradycardia</p>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-red-100 shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <h5 className="font-bold text-gray-900">Adenosine</h5>
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold uppercase">SVT</span>
                    </div>
                    <p className="text-sm text-gray-700"><strong>Dose:</strong> 6 mg IV push (รวดเร็ว) ตามด้วย 12 mg หากไม่ตอบสนอง</p>
                    <p className="text-xs text-gray-500 mt-1">ผสม: Rapid IV push ตามด้วย NSS 20 ml flush ดันเร็วๆ แล้วยกแขน (เตือนคนไข้ว่าอาจจะรู้สึกอึดอัดที่หน้าอก)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lab Reference */}
          {activeTab === 'labs' && (
            <div className="animate-in fade-in space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-purple-100 p-2 font-bold text-purple-900 text-sm text-center">CBC (Complete Blood Count)</div>
                  <table className="w-full text-sm text-left">
                    <tbody>
                      <tr className="border-b"><td className="p-2 font-semibold">Hb (Hemoglobin)</td><td className="p-2 text-gray-600">♂ 13-17 | ♀ 12-15 g/dL</td></tr>
                      <tr className="border-b"><td className="p-2 font-semibold">Hct (Hematocrit)</td><td className="p-2 text-gray-600">♂ 40-50% | ♀ 36-45%</td></tr>
                      <tr className="border-b"><td className="p-2 font-semibold">WBC</td><td className="p-2 text-gray-600">4,000 - 10,000 /µL</td></tr>
                      <tr><td className="p-2 font-semibold">Plt (Platelets)</td><td className="p-2 text-gray-600">150,000 - 400,000 /µL</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-blue-100 p-2 font-bold text-blue-900 text-sm text-center">Electrolytes & Renal</div>
                  <table className="w-full text-sm text-left">
                    <tbody>
                      <tr className="border-b"><td className="p-2 font-semibold">Sodium (Na)</td><td className="p-2 text-gray-600">135 - 145 mEq/L</td></tr>
                      <tr className="border-b"><td className="p-2 font-semibold">Potassium (K)</td><td className="p-2 text-gray-600">3.5 - 5.0 mEq/L</td></tr>
                      <tr className="border-b"><td className="p-2 font-semibold">Chloride (Cl)</td><td className="p-2 text-gray-600">98 - 106 mEq/L</td></tr>
                      <tr className="border-b"><td className="p-2 font-semibold">Bicarbonate (HCO3)</td><td className="p-2 text-gray-600">22 - 28 mEq/L</td></tr>
                      <tr className="border-b"><td className="p-2 font-semibold">BUN</td><td className="p-2 text-gray-600">7 - 20 mg/dL</td></tr>
                      <tr><td className="p-2 font-semibold">Creatinine (Cr)</td><td className="p-2 text-gray-600">0.6 - 1.2 mg/dL</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm md:col-span-2">
                  <div className="bg-pink-100 p-2 font-bold text-pink-900 text-sm text-center">ABG (Arterial Blood Gas)</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 text-center">
                    <div>
                      <div className="text-gray-500 text-xs font-bold">pH</div>
                      <div className="text-lg font-black text-gray-800">7.35 - 7.45</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs font-bold">PaCO2</div>
                      <div className="text-lg font-black text-gray-800">35 - 45 <span className="text-xs">mmHg</span></div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs font-bold">HCO3</div>
                      <div className="text-lg font-black text-gray-800">22 - 26 <span className="text-xs">mEq/L</span></div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs font-bold">PaO2</div>
                      <div className="text-lg font-black text-gray-800">80 - 100 <span className="text-xs">mmHg</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Antibiotics */}
          {activeTab === 'abx' && (
            <div className="animate-in fade-in space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                <h4 className="font-bold text-amber-800 mb-4 flex items-center gap-2">
                  <ShieldAlert size={18} /> Empiric Antibiotics Guide
                </h4>
                
                <div className="space-y-4">
                  <div className="bg-white rounded-lg border border-amber-100 shadow-sm overflow-hidden">
                    <div className="bg-amber-100 px-3 py-2 font-bold text-amber-900 text-sm">Community-Acquired Pneumonia (CAP)</div>
                    <div className="p-3 text-sm space-y-2">
                      <div><strong>Mild (Outpatient):</strong> Amoxicillin (1g) 1x3 <u>OR</u> Doxycycline (100mg) 1x2</div>
                      <div><strong>With Comorbidities:</strong> Amoxicillin-Clavulanate + Macrolide <u>OR</u> Respiratory Fluoroquinolone (Levofloxacin)</div>
                      <div><strong>Severe (Inpatient):</strong> Ceftriaxone (2g) IV OD + Azithromycin IV</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-amber-100 shadow-sm overflow-hidden">
                    <div className="bg-amber-100 px-3 py-2 font-bold text-amber-900 text-sm">Urinary Tract Infection (UTI)</div>
                    <div className="p-3 text-sm space-y-2">
                      <div><strong>Uncomplicated Cystitis:</strong> Fosfomycin 3g oral x1 <u>OR</u> Nitrofurantoin 100mg 1x2 x 5 days</div>
                      <div><strong>Acute Pyelonephritis (OPD):</strong> Ciprofloxacin 500mg 1x2 x 7 days <u>OR</u> Ceftriaxone 1g IV stat -&gt; oral beta-lactam</div>
                      <div><strong>Severe / Inpatient:</strong> Ceftriaxone 1-2g IV OD</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-amber-100 shadow-sm overflow-hidden">
                    <div className="bg-amber-100 px-3 py-2 font-bold text-amber-900 text-sm">Skin & Soft Tissue (Cellulitis/Abscess)</div>
                    <div className="p-3 text-sm space-y-2">
                      <div><strong>Non-purulent (Strep):</strong> Dicloxacillin <u>OR</u> Cephalexin 500mg 1x4</div>
                      <div><strong>Purulent / MRSA suspected:</strong> TMP-SMX (Bactrim) <u>OR</u> Clindamycin <u>OR</u> Doxycycline</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-xs text-amber-700 bg-white p-2 rounded border border-amber-100 text-center">
                  *ข้อมูลนี้เป็นแนวทางเบื้องต้น ควรปรับเปลี่ยนตาม Guideline ของโรงพยาบาลและผล Culture*
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export { PocketGuideModal };
