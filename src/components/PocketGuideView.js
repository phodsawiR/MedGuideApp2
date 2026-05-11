import React, { useState, useEffect } from 'react';
import { X, Copy, CheckCircle, FileText, Zap, FlaskConical, ShieldAlert, HeartPulse, Plus, Edit, Trash2, Save, Database } from 'lucide-react';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';

const PocketGuideView = ({ db, appId, showAdmin }) => {
  const [activeTab, setActiveTab] = useState('notes');
  const [copiedNote, setCopiedNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [guides, setGuides] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEdit, setCurrentEdit] = useState(null);
  const [formData, setFormData] = useState({ title: '', category: 'notes', content: '', tags: '' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !appId) return;
    const guidesRef = collection(db, "artifacts", appId, "public", "data", "pocket_guides");
    const q = query(guidesRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGuides(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [db, appId]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedNote(id);
    setTimeout(() => setCopiedNote(null), 2000);
  };

  const openAddForm = (category) => {
    setCurrentEdit(null);
    setFormData({ title: '', category: category, content: '', tags: '' });
    setIsEditing(true);
  };

  const openEditForm = (guide) => {
    setCurrentEdit(guide);
    setFormData({ title: guide.title, category: guide.category, content: guide.content, tags: guide.tags || '' });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!db || !appId) return;
    if (!formData.title || !formData.content) {
      alert("กรุณากรอกชื่อและเนื้อหาให้ครบถ้วน");
      return;
    }
    
    try {
      const guidesRef = collection(db, "artifacts", appId, "public", "data", "pocket_guides");
      if (currentEdit) {
        await updateDoc(doc(guidesRef, currentEdit.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(guidesRef, {
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      setIsEditing(false);
      setCurrentEdit(null);
    } catch (e) {
      alert("Error saving: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("คุณแน่ใจหรือไม่ที่จะลบเนื้อหานี้?")) return;
    try {
      await deleteDoc(doc(db, "artifacts", appId, "public", "data", "pocket_guides", id));
    } catch (e) {
      alert("Error deleting: " + e.message);
    }
  };

  const handleSeedData = async () => {
    if (!db || !appId || !window.confirm("ระบบจะทำการเพิ่มข้อมูลเริ่มต้นลงในฐานข้อมูล คุณแน่ใจหรือไม่?")) return;
    
    const seedGuides = [
      {
        title: 'Progress Note (SOAP)',
        category: 'notes',
        tags: 'soap progress ward',
        content: `S: \n- อาการทั่วไปวันนี้\n- อาการที่ผู้ป่วยบ่นเพิ่มเติม\n\nO: \n- V/S: T= , HR= , BP= , RR= , SpO2=\n- I/O: \n- PE: (Focus on relevant systems)\n- Labs/Inv: \n\nA: \n- (Diagnosis/Problem 1): Clinical progression\n- (Diagnosis/Problem 2): Clinical progression\n\nP: \n- \n- \n- `
      },
      {
        title: 'Admission Note',
        category: 'notes',
        tags: 'admission admit new',
        content: `CC: \nPI: \nPMH: \nAllergy: \nMeds: \n\nPE:\n- V/S: T= , HR= , BP= , RR= , SpO2=\n- HEENT: \n- Heart: \n- Lungs: \n- Abdomen: \n- Neuro: \n\nLabs/Imaging: \n\nImpression/Problem list:\n1. \n2. \n\nManagement:\n1. \n2. \n3. `
      },
      {
        title: 'Post-op Note',
        category: 'notes',
        tags: 'post op surgery operative',
        content: `Pre-op Dx: \nPost-op Dx: \nOperation: \nSurgeon/Asst: \nAnesthesia: \nFindings: \nEBL:  ml\nUrine output:  ml\nSpecimen: \nComplications: None\nCondition: Stable\n\nPlan:\n- V/S q 4 hr\n- NPO / Diet:\n- IV Fluid:\n- Analgesic:\n- Antibiotic:`
      },
      {
        title: 'Adrenaline (Epinephrine)',
        category: 'drugs',
        tags: 'adrenaline epinephrine cardiac arrest acls',
        content: `**Dose (Cardiac Arrest):** 1 mg IV/IO push ทุก 3-5 นาที\n\n**วิธีผสม:** 1 amp (1mg/1ml) ฉีดได้เลย แล้วตามด้วย NSS 20 ml flush และยกแขนสูง`
      },
      {
        title: 'Amiodarone',
        category: 'drugs',
        tags: 'amiodarone vf pvt acls',
        content: `**Dose 1 (VF / pVT):** 300 mg IV/IO push\n**Dose 2:** 150 mg IV/IO push (หากยังไม่ดีขึ้น)\n\n**วิธีผสม:** 2 amps (300mg) ผสม 5%DW 20 ml (ห้ามผสม NSS)`
      },
      {
        title: 'Atropine',
        category: 'drugs',
        tags: 'atropine bradycardia acls',
        content: `**Dose (Bradycardia):** 1 mg IV push ทุก 3-5 นาที (Max: 3 mg)\n\n**วิธีผสม:** 1 amp (0.6mg/1ml) ฉีดเลย ระวังให้ช้าเกินไปอาจทำให้ paradoxial bradycardia`
      },
      {
        title: 'Adenosine',
        category: 'drugs',
        tags: 'adenosine svt',
        content: `**Dose (SVT):** 6 mg IV push (รวดเร็ว) ตามด้วย 12 mg หากไม่ตอบสนอง\n\n**วิธีผสม:** Rapid IV push ตามด้วย NSS 20 ml flush ดันเร็วๆ แล้วยกแขน (เตือนคนไข้ว่าอาจจะรู้สึกอึดอัดที่หน้าอก)`
      },
      {
        title: 'CBC (Complete Blood Count)',
        category: 'labs',
        tags: 'cbc complete blood count hb hct wbc plt',
        content: `| Test | Normal Range |\n|---|---|\n| **Hb** | ♂ 13-17 \\| ♀ 12-15 g/dL |\n| **Hct** | ♂ 40-50% \\| ♀ 36-45% |\n| **WBC** | 4,000 - 10,000 /µL |\n| **Plt** | 150,000 - 400,000 /µL |`
      },
      {
        title: 'Electrolytes & Renal',
        category: 'labs',
        tags: 'electrolytes renal sodium potassium chloride bicarbonate bun creatinine na k cl hco3 cr',
        content: `| Test | Normal Range |\n|---|---|\n| **Na** | 135 - 145 mEq/L |\n| **K** | 3.5 - 5.0 mEq/L |\n| **Cl** | 98 - 106 mEq/L |\n| **HCO3** | 22 - 28 mEq/L |\n| **BUN** | 7 - 20 mg/dL |\n| **Cr** | 0.6 - 1.2 mg/dL |`
      },
      {
        title: 'Community-Acquired Pneumonia (CAP)',
        category: 'abx',
        tags: 'cap pneumonia amoxicillin doxycycline ceftriaxone azithromycin',
        content: `**Mild (Outpatient):**\nAmoxicillin (1g) 1x3 \n*OR* Doxycycline (100mg) 1x2\n\n**With Comorbidities:**\nAmoxicillin-Clavulanate + Macrolide \n*OR* Respiratory Fluoroquinolone (Levofloxacin)\n\n**Severe (Inpatient):**\nCeftriaxone (2g) IV OD + Azithromycin IV`
      },
      {
        title: 'Urinary Tract Infection (UTI)',
        category: 'abx',
        tags: 'uti urinary tract infection fosfomycin nitrofurantoin ciprofloxacin ceftriaxone',
        content: `**Uncomplicated Cystitis:**\nFosfomycin 3g oral x1 \n*OR* Nitrofurantoin 100mg 1x2 x 5 days\n\n**Acute Pyelonephritis (OPD):**\nCiprofloxacin 500mg 1x2 x 7 days \n*OR* Ceftriaxone 1g IV stat -> oral beta-lactam\n\n**Severe / Inpatient:**\nCeftriaxone 1-2g IV OD`
      }
    ];

    const guidesRef = collection(db, "artifacts", appId, "public", "data", "pocket_guides");
    for (const guide of seedGuides) {
      await addDoc(guidesRef, { ...guide, createdAt: serverTimestamp() });
    }
    alert("เพิ่มข้อมูลเริ่มต้นเรียบร้อยแล้ว!");
  };

  const filteredGuides = guides.filter(g => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (g.title?.toLowerCase().includes(q) || g.content?.toLowerCase().includes(q) || g.tags?.toLowerCase().includes(q));
  });

  const activeGuides = filteredGuides.filter(g => searchQuery ? true : g.category === activeTab);

  // Helper to render markdown-like tables or pre text
  const renderContent = (content) => {
    if (content.includes('|---|---|\n') || content.includes('| --- | --- |')) {
      // Very basic table renderer
      const lines = content.split('\n');
      const tableRows = lines.filter(l => l.trim().startsWith('|') && !l.includes('|---|---|') && !l.includes('| --- | --- |'));
      return (
        <table className="w-full text-sm text-left border-collapse">
          <tbody>
            {tableRows.map((row, i) => {
              const cells = row.split('|').filter(c => c.trim() !== '');
              return (
                <tr key={i} className="border-b">
                  {cells.map((cell, j) => (
                    <td key={j} className={`p-2 ${j===0 ? 'font-semibold' : 'text-gray-600'}`} dangerouslySetInnerHTML={{__html: cell.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}}></td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }
    // Convert **bold** to strong
    const boldedContent = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap" dangerouslySetInnerHTML={{__html: boldedContent}}></pre>;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="🔍 ค้นหาใน Ward Pocket Guide (เช่น SOAP, Adrenaline, CAP)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition-all text-sm shadow-sm"
          />
          <div className="absolute left-3 top-3.5 text-gray-400">
            <HeartPulse size={18} />
          </div>
        </div>
      </div>

      {isEditing && showAdmin && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-200 mb-6 animate-in fade-in zoom-in-95">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-blue-900">{currentEdit ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลใหม่'}</h3>
            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อเรื่อง (Title)</label>
                <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">หมวดหมู่ (Category)</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none">
                  <option value="notes">Smart Note Templates</option>
                  <option value="drugs">Emergency Drugs</option>
                  <option value="labs">Quick Lab Ref</option>
                  <option value="abx">Antibiotic Guide</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Tags สำหรับค้นหา (คั่นด้วยช่องว่าง)</label>
              <input type="text" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} placeholder="เช่น soap admit cbc cap" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">เนื้อหา (Content)</label>
              <textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} rows="6" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-200 outline-none font-mono text-sm"></textarea>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200">ยกเลิก</button>
              <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700"><Save size={16}/> บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {showAdmin && guides.length === 0 && !isLoading && (
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-2xl shadow-sm text-center">
          <Database size={40} className="mx-auto text-yellow-500 mb-3" />
          <h3 className="font-bold text-yellow-800 text-lg mb-2">ยังไม่มีข้อมูลใน Database</h3>
          <p className="text-yellow-700 text-sm mb-4">คลิกปุ่มด้านล่างเพื่อเพิ่มข้อมูลเริ่มต้น (Initial Seed Data) อัตโนมัติ</p>
          <button onClick={handleSeedData} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-lg shadow-sm transition-colors">
            Seed Initial Data
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Tabs - hidden when searching */}
        {!searchQuery && (
          <div className="flex flex-col bg-gray-50 p-3 border-b md:border-b-0 md:border-r border-gray-200 md:w-64 shrink-0 space-y-2">
            <div className="flex justify-between items-center px-2 mb-2">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pocket Guides</h4>
            </div>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${
                activeTab === 'notes' ? 'bg-white shadow-sm text-blue-700 border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FileText size={18} /> <span>Smart Note Templates</span>
            </button>
            <button
              onClick={() => setActiveTab('drugs')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${
                activeTab === 'drugs' ? 'bg-white shadow-sm text-red-600 border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Zap size={18} /> <span>Emergency Drugs</span>
            </button>
            <button
              onClick={() => setActiveTab('labs')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${
                activeTab === 'labs' ? 'bg-white shadow-sm text-purple-600 border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FlaskConical size={18} /> <span>Quick Lab Ref</span>
            </button>
            <button
              onClick={() => setActiveTab('abx')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${
                activeTab === 'abx' ? 'bg-white shadow-sm text-amber-600 border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ShieldAlert size={18} /> <span>Antibiotic Guide</span>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-4 md:p-6 bg-slate-50 min-h-[500px] flex-1 flex flex-col">
          
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-700">
              {searchQuery ? `ผลการค้นหา: "${searchQuery}"` : 
                activeTab === 'notes' ? 'Smart Note Templates' : 
                activeTab === 'drugs' ? 'Emergency Drugs' :
                activeTab === 'labs' ? 'Quick Lab Ref' : 'Antibiotic Guide'
              }
            </h3>
            {showAdmin && !searchQuery && (
              <button 
                onClick={() => openAddForm(activeTab)}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <Plus size={14} /> เพิ่มเนื้อหา
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex-1 flex justify-center items-center text-gray-400">กำลังโหลดข้อมูล...</div>
          ) : activeGuides.length === 0 ? (
            <div className="flex-1 flex justify-center items-center text-gray-400">
              {searchQuery ? 'ไม่พบเนื้อหาที่ตรงกับการค้นหา' : 'ยังไม่มีข้อมูลในหมวดหมู่นี้'}
            </div>
          ) : (
            <div className={`animate-in fade-in grid gap-4 ${searchQuery ? 'grid-cols-1 md:grid-cols-2' : (activeTab === 'notes' || activeTab === 'labs') ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-2xl'}`}>
              {activeGuides.map((guide) => (
                <div key={guide.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm group">
                  <div className={`p-3 border-b flex justify-between items-center ${
                    guide.category === 'notes' ? 'bg-blue-50 border-blue-100' :
                    guide.category === 'drugs' ? 'bg-red-50 border-red-100' :
                    guide.category === 'labs' ? 'bg-purple-50 border-purple-100' : 'bg-amber-50 border-amber-100'
                  }`}>
                    <h4 className={`font-bold text-sm ${
                      guide.category === 'notes' ? 'text-blue-900' :
                      guide.category === 'drugs' ? 'text-red-900' :
                      guide.category === 'labs' ? 'text-purple-900' : 'text-amber-900'
                    }`}>
                      {guide.title}
                    </h4>
                    
                    <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      {showAdmin && (
                        <>
                          <button onClick={() => openEditForm(guide)} className="p-1.5 rounded bg-white border text-gray-500 hover:bg-gray-100"><Edit size={12}/></button>
                          <button onClick={() => handleDelete(guide.id)} className="p-1.5 rounded bg-white border text-red-500 hover:bg-red-50"><Trash2 size={12}/></button>
                        </>
                      )}
                      {guide.category === 'notes' && (
                        <button 
                          onClick={() => handleCopy(guide.content, guide.id)}
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${copiedNote === guide.id ? 'bg-green-100 text-green-700 font-bold border-transparent' : 'bg-white border text-blue-600 hover:bg-blue-100'}`}
                        >
                          {copiedNote === guide.id ? <><CheckCircle size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50/50 flex-1 overflow-x-auto">
                    {renderContent(guide.content)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { PocketGuideView };
