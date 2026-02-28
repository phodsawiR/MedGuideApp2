import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Filter,
  Star,
  CheckCircle,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Menu,
  X,
  Heart,
  Droplet,
  Bone,
  Wind,
  Activity,
  Brain,
  Zap,
  Dna,
  Pill,
  Plus,
  Save,
  Trash2,
  Database,
  Utensils,
  RefreshCw,
  Download,
  Upload,
  AlertTriangle,
  Check,
  Baby,
  Bug,
  Shield,
  Atom,
  Smile,
  Moon,
  Sun,
  BarChart2,
  Pencil,
  Image as ImageIcon,
  Maximize2,
} from "lucide-react";
import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
import {
  getAuth,
  signInWithCustomToken,
  signInAnonymously,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  collection,
  onSnapshot,
  setDoc,
  addDoc,
  updateDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  writeBatch,
  where,
} from "firebase/firestore";
// --- 🛠️ Global Text Renderer (รองรับ Latex/Subscript/Superscript) ---
// ใช้สำหรับแปลง $Ca^{2+}$ -> Ca²⁺ หรือ **ตัวหนา** ในทุกส่วนของ App
const renderMath = (text) => {
  if (!text) return null;

  const latexMap = {
    "\\Delta": "Δ",
    "\\alpha": "α",
    "\\beta": "β",
    "\\gamma": "γ",
    "\\lambda": "λ",
    "\\theta": "θ",
    "\\mu": "μ",
    "\\pi": "π",
    "\\rightarrow": "→",
    "\\leftarrow": "←",
    "\\uparrow": "↑",
    "\\downarrow": "↓",
    "\\approx": "≈",
    "\\neq": "≠",
    "\\leq": "≤",
    "\\geq": "≥",
    "\\pm": "±",
    "\\infty": "∞",
    "\\ge": "≥",
    "\\le": "≤",
  };

  const supMap = {
    0: "⁰",
    1: "¹",
    2: "²",
    3: "³",
    4: "⁴",
    5: "⁵",
    6: "⁶",
    7: "⁷",
    8: "⁸",
    9: "⁹",
    "+": "⁺",
    "-": "⁻",
    "=": "⁼",
    "(": "⁽",
    ")": "⁾",
    n: "ⁿ",
  };

  const subMap = {
    0: "₀",
    1: "₁",
    2: "₂",
    3: "₃",
    4: "₄",
    5: "₅",
    6: "₆",
    7: "₇",
    8: "⁸",
    9: "₉",
    "+": "₊",
    "-": "₋",
    "=": "₌",
    "(": "₍",
    ")": "₎",
    a: "ₐ",
    e: "ₑ",
    o: "ₒ",
    x: "ₓ",
    y: "ᵧ",
    m: "ₘ",
  };

  // Clean HTML Tags
  let cleanText = text
    .replace(/<b>/g, "**")
    .replace(/<\/b>/g, "**")
    .replace(/<i>/g, "*")
    .replace(/<\/i>/g, "*");

  const parseLatex = (str) => {
    let res = str;
    // 1. Greek/Special
    Object.keys(latexMap).forEach((k) => {
      res = res.split(k).join(latexMap[k]);
    });

    // 2. Superscript (ตัวยก) เช่น ^{2+} หรือ ^2
    res = res.replace(/\^\{([^\}]+)\}/g, (_, m) =>
      m
        .split("")
        .map((c) => supMap[c] || c)
        .join("")
    );
    res = res.replace(/\^([0-9\+\-n])/g, (_, m) => supMap[m] || m);

    // 3. Subscript (ตัวห้อย) เช่น _{max} หรือ _2
    res = res.replace(/_\{([^\}]+)\}/g, (_, m) =>
      m
        .split("")
        .map((c) => subMap[c] || c)
        .join("")
    );
    res = res.replace(/_([0-9\+\-aeomx])/g, (_, m) => subMap[m] || m);

    return res;
  };

  // แยกส่วน $...$ (Latex), **...** (Bold), *...* (Italic)
  const parts = cleanText.split(/(\$.*?\$|\*\*.*?\*\*|\*.*?\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("$") && part.endsWith("$")) {
      return (
        <span
          key={index}
          className="font-serif italic px-0.5 text-indigo-700 font-bold"
        >
          {parseLatex(part.slice(1, -1))}
        </span>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-gray-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
};
// --- 🛠️ เครื่องมือแปลงลิงก์ Google Drive (สูตรใหม่: ใช้ Thumbnail แก้ปัญหาบล็อก) ---
const getImageUrl = (url) => {
  if (!url || typeof url !== "string") return null;
  if (!url.startsWith("http")) return url;

  // ถ้าเป็นลิงก์ Google Drive
  if (url.includes("drive.google.com") && url.includes("/file/d/")) {
    try {
      // 1. ดึง ID ออกมา
      const id = url.split("/file/d/")[1].split("/")[0];

      // 2. ใช้ลิงก์ Thumbnail แทน (Google ใจดี ปล่อยให้โชว์ง่ายกว่า)
      return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    } catch (e) {
      return url;
    }
  }
  return url;
};
// --- ส่วนเสริม: กล่องคอมเมนต์ (ฉบับปรับปรุง V2: แยกช่องลิงก์รูป) ---
const CommentSection = ({ db, appId, system, topic }) => {
  const [comments, setComments] = React.useState([]);
  const [newText, setNewText] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState(""); // 🟢 State ใหม่: เก็บลิงก์รูป
  const [attachment, setAttachment] = React.useState(null); // เก็บรูปจากไฟล์ (Upload)
  const [loading, setLoading] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const topicKey = `${system}-${topic}`.toLowerCase().trim();

  // 1. ดึงคอมเมนต์
  React.useEffect(() => {
    const q = query(
      collection(db, "artifacts", appId, "public", "data", "comments"),
      where("topicKey", "==", topicKey)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
      setComments(items);
    });
    return () => unsubscribe();
  }, [topicKey]);

  // ฟังก์ชันย่อรูป (Mini Compress)
  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const scale = 800 / Math.max(img.width, img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setAttachment(canvas.toDataURL("image/jpeg", 0.7));
        setImageUrl(""); // ถ้าเลือกรูปไฟล์ ให้ล้างช่องลิงก์ออกกันงง
      };
    };
  };

  // 2. โพสต์คอมเมนต์
  const handleSubmit = async () => {
    // ต้องมีข้อความ หรือ รูป (จากลิงก์ หรือ จากไฟล์) อย่างใดอย่างหนึ่ง
    if (!newText.trim() && !imageUrl.trim() && !attachment) return;

    setLoading(true);
    try {
      const colRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "comments"
      );

      // เลือกใช้รูปจาก: ลิงก์ที่วาง (ถ้ามี) หรือ รูปที่อัปโหลด
      const finalImage = imageUrl.trim() || attachment || null;

      const payload = {
        topicKey,
        text: newText,
        image: finalImage,
        createdAt: new Date().toISOString(),
      };

      if (editingId) {
        await updateDoc(doc(colRef, editingId), {
          text: newText,
          image: finalImage,
        });
        setEditingId(null);
      } else {
        await addDoc(colRef, payload);
      }
      // Reset Form
      setNewText("");
      setImageUrl("");
      setAttachment(null);
    } catch (e) {
      alert("Error: " + e.message);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("ลบข้อความนี้?")) return;
    await deleteDoc(
      doc(db, "artifacts", appId, "public", "data", "comments", id)
    );
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 bg-gray-50 rounded-lg p-3">
      <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        💬 Discussion ({comments.length})
      </h3>

      {/* List รายการคอมเมนต์ */}
      <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
        {comments.map((c) => {
          // Logic เดิมเพื่อรองรับข้อมูลเก่า
          const isLegacyImage =
            !c.image &&
            c.text.startsWith("http") &&
            (c.text.includes("drive.google.com") ||
              c.text.match(/\.(jpeg|jpg|gif|png)$/) != null);

          // รูปที่จะแสดง (แปลง Drive Link อัตโนมัติด้วย getImageUrl)
          const displayImage = c.image || (isLegacyImage ? c.text : null);
          const finalImageUrl = getImageUrl
            ? getImageUrl(displayImage)
            : displayImage;

          return (
            <div
              key={c.id}
              className="bg-white p-3 rounded-lg border border-gray-200 text-sm shadow-sm"
            >
              {/* ส่วนข้อความ */}
              {!isLegacyImage && c.text && (
                <div className="text-gray-800 text-sm whitespace-pre-wrap mb-2">
                  {c.text}
                </div>
              )}

              {/* ส่วนรูปภาพ */}
              {finalImageUrl && (
                <div className="mt-1">
                  <img
                    src={finalImageUrl}
                    alt="attachment"
                    referrerPolicy="no-referrer"
                    className="max-h-48 rounded-lg border border-gray-200 object-contain bg-gray-50"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                  {/* แสดงลิงก์เล็กๆ เผื่อรูปโหลดไม่ขึ้น */}
                  <a
                    href={displayImage}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-gray-400 underline mt-1 block truncate"
                  >
                    {displayImage}
                  </a>
                </div>
              )}

              {/* ปุ่มจัดการ */}
              <div className="flex justify-end gap-2 mt-2 pt-1 border-t border-gray-100 opacity-60 hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setEditingId(c.id);
                    setNewText(isLegacyImage ? "" : c.text);
                    // ถ้าเป็น URL ให้ใส่ช่อง URL, ถ้าเป็น Base64 (ยาวๆ) ให้ใส่ attachment
                    const img = c.image || (isLegacyImage ? c.text : "");
                    if (img && img.startsWith("data:")) {
                      setAttachment(img);
                      setImageUrl("");
                    } else {
                      setImageUrl(img || "");
                      setAttachment(null);
                    }
                  }}
                  className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                >
                  แก้ไข
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  ลบ
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- ส่วนกรอกข้อมูลใหม่ --- */}
      <div className="flex flex-col gap-2">
        {/* 1. ช่องข้อความ */}
        <textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="แสดงความคิดเห็น..."
          className="w-full p-2 text-sm border rounded-lg h-16 bg-white focus:ring-2 ring-blue-100 outline-none resize-none"
        />

        {/* 2. โซนแนบรูป (เลือกได้ว่าจะวางลิงก์ หรือ อัปโหลด) */}
        <div className="flex gap-2 items-center">
          {/* ช่องวางลิงก์ */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                setAttachment(null); // ถ้าพิมพ์ลิงก์ ให้เคลียร์รูปที่อัปโหลด
              }}
              disabled={!!attachment} // ถ้าอัปโหลดรูปอยู่ ให้ปิดช่องนี้
              placeholder="🔗 วางลิงก์รูป (Google Drive / URL)..."
              className={`w-full pl-8 pr-2 py-1.5 text-xs border rounded-lg outline-none focus:border-blue-500 ${
                attachment ? "bg-gray-100 text-gray-400" : "bg-white"
              }`}
            />
            <span className="absolute left-2.5 top-1.5 text-gray-400">🌐</span>
          </div>

          <span className="text-xs text-gray-400 font-bold">OR</span>

          {/* ปุ่มอัปโหลด */}
          <label
            className={`flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer border transition-colors ${
              attachment
                ? "bg-green-100 border-green-300 text-green-600"
                : "bg-white border-gray-300 hover:bg-gray-50 text-gray-500"
            }`}
            title="อัปโหลดรูปจากเครื่อง"
          >
            {attachment ? <Check size={16} /> : <ImageIcon size={16} />}
            <input
              type="file"
              accept="image/*"
              onChange={handleImage}
              className="hidden"
            />
          </label>

          {/* ปุ่มส่ง */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm whitespace-nowrap"
          >
            {loading ? "..." : editingId ? "Save" : "Send"}
          </button>
        </div>

        {/* Preview รูปที่กำลังจะส่ง (ไม่ว่าจะมาจาก Link หรือ Upload) */}
        {(imageUrl || attachment) && (
          <div className="mt-1 relative w-fit group">
            <span className="text-[10px] text-gray-400 mb-1 block">
              ตัวอย่างรูปที่จะส่ง:
            </span>
            <img
              src={attachment || getImageUrl(imageUrl)}
              alt="Preview"
              referrerPolicy="no-referrer"
              className="h-16 rounded border border-blue-200 shadow-sm object-contain bg-white"
              onError={(e) => (e.target.style.display = "none")}
            />
            <button
              onClick={() => {
                setImageUrl("");
                setAttachment(null);
              }}
              className="absolute top-4 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600"
            >
              <X size={10} />
            </button>
          </div>
        )}

        {editingId && (
          <button
            onClick={() => {
              setEditingId(null);
              setNewText("");
              setImageUrl("");
              setAttachment(null);
            }}
            className="text-xs text-gray-400 hover:text-gray-600 self-end"
          >
            ยกเลิกการแก้ไข
          </button>
        )}
      </div>
    </div>
  );
};

// --- Configuration & Seed Data ---
const MASTER_SEED_DATA = [
  // 1. NERVOUS SYSTEM
  {
    system: "Nervous System",
    topic: "Stroke Localization: MCA vs ACA",
    yield_score: 5,
    keywords: ["MCA", "ACA", "Hemiparesis", "Aphasia"],
    summary:
      "**MCA:** แขน/หน้า > ขา, Aphasia (Dominant), Gaze deviations. **ACA:** ขา > แขน, Personality change (Frontal).",
    exam_tip: "Homonymous hemianopia (มองไม่เห็นครึ่งซีก) มักเจอใน MCA",
  },
  {
    system: "Nervous System",
    topic: "Intracranial Hemorrhage",
    yield_score: 5,
    keywords: ["Epidural", "Subdural", "Lucid interval"],
    summary:
      "**Epidural:** Middle Meningeal A. tear, Lens shape, Lucid interval. **Subdural:** Bridging vein tear, Crescent shape, Elderly/Alcoholic.",
    exam_tip: "Lucid interval = สลบ -> ตื่น (ดูปกติ) -> สลบยาว",
  },
  {
    system: "Nervous System",
    topic: "CNS Infection: CSF Analysis",
    yield_score: 5,
    keywords: ["Meningitis", "Glucose", "Protein"],
    summary:
      "**Bacterial:** PMN สูง, Glu ต่ำมาก, Pro สูง. **Viral:** Lympho สูง, Glu ปกติ. **TB:** Lympho สูง, Glu ต่ำ, Pro สูงมาก (Cobweb).",
    exam_tip: "จำ: Bact กินน้ำตาล (Glu ต่ำ), TB โปรตีนสูงปรี๊ด",
  },
  {
    system: "Nervous System",
    topic: "Specific Pathogens (Meningitis)",
    yield_score: 4,
    keywords: ["S. suis", "N. meningitidis", "Cryptococcus"],
    summary:
      "**S. suis:** กินหมูดิบ -> หูดับ. **N. meningitidis:** ทหารเกณฑ์/ผื่น Purpura. **Crypto:** HIV, India ink positive.",
    exam_tip: "โจทย์ให้ 'หูดับ' (Hearing loss) มา = Streptococcus suis",
  },
  {
    system: "Nervous System",
    topic: "Respiratory Center (Physio)",
    yield_score: 4,
    keywords: ["Pre-Bötzinger", "Medulla", "Pacemaker"],
    summary:
      "**Pre-Bötzinger complex:** อยู่ที่ Medulla เป็น Pacemaker สร้างจังหวะหายใจ (Respiratory rhythm generator).",
    exam_tip: "ออกสอบซ้ำ 3 ปีติด! จำชื่อ Pre-Bötzinger ให้แม่น",
  },
  {
    system: "Nervous System",
    topic: "Sensory Tracts & Neglect",
    yield_score: 4,
    keywords: ["Spinothalamic", "Dorsal column", "Neglect"],
    summary:
      "**Spinothalamic:** Pain/Temp (ข้ามที่ Spine). **Dorsal Column:** Vib/Proprio (ข้ามที่ Medulla). **Neglect:** Non-dominant Parietal lobe lesion.",
    exam_tip: "Neglect: เมินซ้าย, วาดรูปครึ่งเดียว, ไม่โกนหนวดซ้าย",
  },
  {
    system: "Nervous System",
    topic: "Neuro-Degenerative Diseases",
    yield_score: 4,
    keywords: ["Alzheimer", "Parkinson", "Lewy body"],
    summary:
      "**Alzheimer:** Beta-amyloid, Tau, Hippocampus. **Parkinson:** Substantia nigra depigmentation, Lewy bodies (Alpha-synuclein), TRAP symptoms.",
    exam_tip: "Tremor ใน Parkinson คือ Resting tremor (สั่นตอนพัก)",
  },
  {
    system: "Nervous System",
    topic: "GBS vs Myasthenia Gravis",
    yield_score: 4,
    keywords: ["Ascending paralysis", "Ptosis", "Thymoma"],
    summary:
      "**GBS:** Ascending paralysis, Areflexia, post-diarrhea. **MG:** Ptosis, เย็นดี-บ่ายตก, Anti-AchR, Thymoma.",
    exam_tip: "GBS ระวัง Respiratory failure (ต้องประเมิน FVC/NIF)",
  },
  {
    system: "Nervous System",
    topic: "Neuro Toxins",
    yield_score: 4,
    keywords: ["Botulinum", "Tetrodotoxin", "Puffer fish"],
    summary:
      "**Botulinum:** Block Ach release (Pre-synaptic) -> Descending paralysis. **TTX (ปักเป้า):** Block Na+ channel.",
    exam_tip: "TTX ยับยั้ง Action potential โดยตรงที่ Na+ channel",
  },
  {
    system: "Nervous System",
    topic: "CNS Repair (Gliosis)",
    yield_score: 3,
    keywords: ["Astrocytes", "Glial scar"],
    summary:
      "เมื่อสมองบาดเจ็บ เซลล์ที่มาซ่อมแซมและสร้างแผลเป็น (Glial scar) คือ **Astrocytes** (Gliosis).",
    exam_tip: "ไม่ใช่ Fibroblast เหมือนที่อื่น แต่เป็น Astrocytes",
  }, // 2. GASTROINTESTINAL SYSTEM

  {
    system: "Gastrointestinal System",
    topic: "Congenital Pyloric Stenosis",
    yield_score: 5,
    keywords: ["Projectile vomiting", "Olive mass", "Non-bilious"],
    summary:
      "** อาการ:** Projectile vomiting (พุ่งแรง/ไม่มีน้ำดีปน). ตรวจร่างกาย: **Olive-shaped mass**. Risk: ชาย > หญิง.",
    exam_tip:
      "อาเจียน 'Non-bilious' คือ Keyword สำคัญ (ถ้า Bilious นึกถึง Volvulus)",
  },
  {
    system: "Gastrointestinal System",
    topic: "Peptic Ulcer (PUD) & H. pylori",
    yield_score: 5,
    keywords: ["Urease", "MALT Lymphoma", "Hunger pain"],
    summary:
      "**H. pylori:** ก่อโรค Gastritis, Ulcer, CA Stomach, MALT Lymphoma. Virulence: **Urease** (เปลี่ยน Urea->Ammonia).",
    exam_tip: "DU: Hunger pain (ปวดตอนหิว), GU: Postprandial pain (ปวดหลังกิน)",
  },
  {
    system: "Gastrointestinal System",
    topic: "Gastric Cancer",
    yield_score: 4,
    keywords: ["Signet ring cell", "Linitis plastica", "Virchow's node"],
    summary:
      "**Adenocarcinoma:** Most common. **Signet ring cell:** Linitis plastica (Leather bottle). Metastasis: **Virchow's node** (Lt. Supraclavicular).",
    exam_tip: "Virchow's node = GI Malignancy metastasis",
  },
  {
    system: "Gastrointestinal System",
    topic: "Meckel’s Diverticulum",
    yield_score: 5,
    keywords: ["Painless rectal bleeding", "Vitelline duct", "Pertechnetate"],
    summary:
      "**อาการ:** เด็กถ่ายเป็นเลือดสด 'ไม่เจ็บ' (Painless). Patho: **Vitelline duct remnant**. มีเนื้อเยื่อกระเพาะผิดที่ (Ectopic gastric mucosa).",
    exam_tip: "Dx: Meckel's scan (Technetium-99m pertechnetate)",
  },
  {
    system: "Gastrointestinal System",
    topic: "Colorectal CA Genetics",
    yield_score: 4,
    keywords: ["FAP", "APC gene", "HNPCC", "Lynch"],
    summary:
      "**FAP:** APC gene mut (Chr 5), ติ่งเนื้อเป็นร้อย. **HNPCC (Lynch):** DNA Mismatch Repair mut, เสี่ยง CA Endometrium/Ovary ด้วย.",
    exam_tip: "จำ Gene: FAP=APC, Lynch=MMR",
  },
  {
    system: "Gastrointestinal System",
    topic: "Pseudomembranous Colitis",
    yield_score: 4,
    keywords: ["C. difficile", "Antibiotic", "Vancomycin"],
    summary:
      "เกิดจากได้รับ Antibiotic นาน -> ฆ่าเชื้อดี -> **C. difficile** โต. อาการ: ถ่ายเหลว. Rx: Oral **Vancomycin** / Metronidazole.",
    exam_tip: "ประวัติ 'เพิ่งได้ยาฆ่าเชื้อ' มาไม่นาน คือ Keyword",
  },
  {
    system: "Gastrointestinal System",
    topic: "Jaundice: Gilbert Syndrome",
    yield_score: 4,
    keywords: ["Unconjugated bilirubin", "Stress", "UDP-glucuronyltransferase"],
    summary:
      "ชายวัยรุ่น เครียด/อดนอน -> ตาเหลืองนิดหน่อย. Lab: **Unconjugated Bilirubin สูง**. Defect enzyme UDP-glucuronyltransferase.",
    exam_tip: "สบายดีทุกอย่าง เหลืองเฉพาะตอนเครียด = Gilbert",
  },
  {
    system: "Gastrointestinal System",
    topic: "Hepatitis Profiles",
    yield_score: 4,
    keywords: ["Alcoholic hepatitis", "Viral hepatitis", "AST/ALT ratio"],
    summary:
      "**Alcoholic:** AST > ALT (Ratio > 2:1). **Viral:** ALT > AST. **Ischemic:** Enzymes > 1000.",
    exam_tip: "AST > ALT = Alcohol (Remember 'S' for Scotch)",
  },
  {
    system: "Gastrointestinal System",
    topic: "Ischemic Hepatitis (Shock Liver)",
    yield_score: 4,
    keywords: ["Shock", "AST/ALT > 1000"],
    summary:
      "คนไข้ Shock/Sepsis -> เลือดเลี้ยงตับไม่พอ. Lab: **AST/ALT พุ่งหลักพัน** ใน 1-2 วัน แล้วลงเร็วเมื่อแก้ Shock.",
    exam_tip:
      "ค่า Enzyme ขึ้นเร็วลงเร็ว (Pattern นี้มีแค่ Shock Liver กับ นิ่วอุดท่อ)",
  },
  {
    system: "Gastrointestinal System",
    topic: "Liver Abscess",
    yield_score: 3,
    keywords: ["Anchovy paste", "Entamoeba", "Pyogenic"],
    summary:
      "**Amoebic:** Entamoeba histolytica -> **Anchovy paste pus** (กะปิ). **Pyogenic:** แบคทีเรีย -> มักเกิดจากนิ่วอุดตัน.",
    exam_tip: "Amoebic ไม่ต้องผ่า/เจาะ ให้ Metronidazole ก็ยุบได้",
  },
  {
    system: "Gastrointestinal System",
    topic: "Gallstones & Cholangitis",
    yield_score: 4,
    keywords: [
      "Cholesterol stones",
      "Charcot's triad",
      "Ascending cholangitis",
    ],
    summary:
      "**Stones:** 4F (Fat, Female, Forty, Fertile). **Cholangitis:** Charcot's Triad (Fever, Jaundice, RUQ Pain).",
    exam_tip: "Charcot's Triad = Emergency (Needs drainage)",
  },
  {
    system: "Gastrointestinal System",
    topic: "Gut Rotation (Volvulus)",
    yield_score: 3,
    keywords: ["Midgut volvulus", "Corkscrew sign", "Bilious vomiting"],
    summary:
      "Small bowel twists around SMA. Signs: **Bilious vomiting** in infant. GI Study: **Corkscrew appearance**.",
    exam_tip: "Bilious vomiting in newborn = Volvulus until proven otherwise",
  },
  {
    system: "Gastrointestinal System",
    topic: "Abdominal Wall Defects",
    yield_score: 3,
    keywords: ["Omphalocele", "Gastroschisis"],
    summary:
      "**Omphalocele:** มีถุงหุ้ม, ออกสะดือ. **Gastroschisis:** ไม่มีถุงหุ้ม, ลอยในน้ำคร่ำ (ข้างสะดือขวา).",
    exam_tip: "Gastroschisis ลำไส้อักเสบมากกว่าเพราะโดนน้ำคร่ำกัด",
  },
  {
    system: "Gastrointestinal System",
    topic: "Food Poisoning (Toxicology)",
    yield_score: 4,
    keywords: ["S. aureus", "B. cereus", "Botulinum", "Eclair"],
    summary:
      "**S. aureus:** เอแคลร์/ไข่ -> อ้วกเร็ว <6ชม. **B. cereus:** ข้าวผัดค้างคืน. **Botulinum:** หน่อไม้ปี๊บ -> กล้ามเนื้ออ่อนแรง (Descending).",
    exam_tip: "โจทย์ถามเชื้อ หรือ Toxin? (พวกนี้เป็น Preformed Toxin)",
  }, // 3. HEMATOLOGY SYSTEM

  {
    system: "Hematology System",
    topic: "RBC: Thalassemia",
    yield_score: 5,
    keywords: ["Alpha", "Beta", "Hb E", "Target cell"],
    summary:
      "**Alpha:** Deletion. **Beta:** Mutation. **Hb E:** Common Thai. Smear: **Target cells**.",
    exam_tip: "Thal (MCV low, RDW normal) vs IDA (MCV low, RDW high)",
  },
  {
    system: "Hematology System",
    topic: "RBC: Iron Deficiency Anemia",
    yield_score: 4,
    keywords: ["Microcytic", "Ferritin", "Spoon nail"],
    summary:
      "Cause: Chronic bleed. Lab: **Iron low, Ferritin low, TIBC high**.",
    exam_tip: "ชาย/คนแก่ เป็น IDA ต้องหา CA Colon",
  },
  {
    system: "Hematology System",
    topic: "Leukemia: CML",
    yield_score: 5,
    keywords: ["CML", "t(9;22)", "BCR-ABL"],
    summary:
      "**CML:** Massive Splenomegaly. **t(9;22) Philadelphia** -> BCR-ABL.",
    exam_tip: "Rx: Imatinib",
  },
  {
    system: "Hematology System",
    topic: "Lymphoma: Hodgkin vs NHL",
    yield_score: 4,
    keywords: ["Reed-Sternberg", "B symptoms"],
    summary:
      "**Hodgkin:** Reed-Sternberg, Contiguous spread. **NHL:** Non-contiguous.",
    exam_tip: "B symptoms = Poor prognosis",
  },
  {
    system: "Hematology System",
    topic: "Multiple Myeloma (MM)",
    yield_score: 4,
    keywords: ["CRAB", "Bence Jones", "Rouleaux"],
    summary:
      "**CRAB**: Ca high, Renal fail, Anemia, Bone lytic. Smear: **Rouleaux**.",
    exam_tip: "คนแก่ปวดหลัง + ไตวาย + ซีด -> MM",
  },
  {
    system: "Hematology System",
    topic: "Bleeding: Hemophilia vs vWD",
    yield_score: 4,
    keywords: ["Factor VIII", "aPTT", "Bleeding time"],
    summary:
      "**Hemophilia:** Deep bleed, **aPTT prolong**. **vWD:** Mucosal bleed, **BT prolong**.",
    exam_tip: "Mixing study correct = Factor def",
  },
  {
    system: "Hematology System",
    topic: "Platelet: ITP vs TTP",
    yield_score: 3,
    keywords: ["Thrombocytopenia", "Pentad", "ADAMTS13"],
    summary:
      "**ITP:** Isolated low PLT. **TTP:** Pentad (Fever, Anemia, Low PLT, Renal, Neuro).",
    exam_tip: "TTP ห้ามให้เกล็ดเลือด",
  },
  {
    system: "Hematology System",
    topic: "Warfarin vs Heparin",
    yield_score: 5,
    keywords: ["PT", "INR", "aPTT"],
    summary:
      "**Warfarin:** Anti-Vit K, Monitor **PT/INR**. **Heparin:** Anti-ATIII, Monitor **aPTT**.",
    exam_tip: "Warfarin interaction เยอะ",
  },
  {
    system: "Hematology System",
    topic: "Transfusion Reactions",
    yield_score: 4,
    keywords: ["Febrile", "Acute hemolytic", "TRALI"],
    summary:
      "**Febrile:** Chills. **Acute hemolytic:** ABO mismatch. **TRALI:** Pulmonary edema.",
    exam_tip: "Stop transfusion immediately -> IV NSS",
  }, // 4. CARDIOVASCULAR SYSTEM

  {
    system: "Cardiovascular System",
    topic: "ACS: EKG & Management",
    yield_score: 5,
    keywords: ["Inferior", "Anterior", "MONA"],
    summary:
      "**Inferior:** II, III, aVF (RCA). **Anterior:** V1-V4 (LAD). Rx: **MONA**.",
    exam_tip: "Inferior MI + RV Infarct ห้าม Nitrates",
  },
  {
    system: "Cardiovascular System",
    topic: "HF: 4 Pillars GDMT",
    yield_score: 5,
    keywords: ["ARNI", "SGLT2i", "Beta-blocker"],
    summary: "Mortality benefit: 1.ARNI/ACEi 2.BB 3.MRA 4.SGLT2i.",
    exam_tip: "Lasix ลดแค่อาการ ไม่ลดตาย",
  },
  {
    system: "Cardiovascular System",
    topic: "HTN Drugs Side Effects",
    yield_score: 4,
    keywords: ["ACEi cough", "Angioedema"],
    summary: "**ACEi:** Cough. **CCB:** Leg edema. **Pregnancy:** Methyldopa.",
    exam_tip: "ACEi แล้ว Cr พุ่ง -> Renal Artery Stenosis",
  },
  {
    system: "Cardiovascular System",
    topic: "Valvular Heart Diseases",
    yield_score: 4,
    keywords: ["AS", "MR", "MS", "AR"],
    summary:
      "**AS:** Systolic -> Carotids. **MS:** Opening snap. **AR:** Water hammer.",
    exam_tip: "AS Triad: SAD (Syncope, Angina, Dyspnea)",
  },
  {
    system: "Cardiovascular System",
    topic: "CVS Physio: PV Loop",
    yield_score: 3,
    keywords: ["Preload", "Afterload", "Stroke Work"],
    summary: "**Preload up:** Loop right. **Afterload up:** Loop tall/narrow.",
    exam_tip: "วาดกราฟ MS/AS ใส่ PV Loop",
  },
  {
    system: "Cardiovascular System",
    topic: "Congenital Heart",
    yield_score: 4,
    keywords: ["TOF", "PDA", "Cyanotic"],
    summary:
      "**TOF:** Boot-shaped. **PDA:** Machine murmur. **Coarctation:** BP Arm>Leg.",
    exam_tip: "PDA Rx: Indomethacin(Close) vs PGE1(Open)",
  },
  {
    system: "Cardiovascular System",
    topic: "Arrhythmias: AF & Block",
    yield_score: 4,
    keywords: ["AF", "Heart Block"],
    summary:
      "**AF:** Irregularly irregular. **3rd Degree:** P wave march through.",
    exam_tip: "AF: CHADS2-VASc -> Anticoagulant",
  }, // 5. RESPIRATORY SYSTEM

  {
    system: "Respiratory System",
    topic: "PFT: Spirometry & ABG",
    yield_score: 5,
    keywords: ["Obstructive", "Restrictive", "Acidosis"],
    summary:
      "**Obstructive:** FEV1/FVC<0.7. **Restrictive:** Vol low. **ABG:** pH/CO2/HCO3.",
    exam_tip: "A-a gradient ดู Hypoxemia",
  },
  {
    system: "Respiratory System",
    topic: "Asthma vs COPD",
    yield_score: 5,
    keywords: ["Reversibility", "Emphysema"],
    summary:
      "**Asthma:** Reversible. **COPD:** Irreversible (Emphysema/Bronchitis).",
    exam_tip: "Reversibility Test คือ Key",
  },
  {
    system: "Respiratory System",
    topic: "Pneumonia: CAP & Aspiration",
    yield_score: 5,
    keywords: ["S. pneumoniae", "Mycoplasma", "Right Lower Lobe"],
    summary:
      "**CAP:** S. pneumo (Rust sputum). **Aspiration:** ลง Right Lower Lobe บ่อยสุด.",
    exam_tip: "Aspiration ลงขวาเสมอ (Right Main Bronchus ชันกว่า)",
  },
  {
    system: "Respiratory System",
    topic: "TB Drugs (RIPE)",
    yield_score: 4,
    keywords: ["Isoniazid", "Ethambutol"],
    summary:
      "**I**soniazid(Cha-B6), **R**ifampin(Orange), **E**thambutol(Eye).",
    exam_tip: "ตามัว=Ethambutol, มือชา=Isoniazid",
  },
  {
    system: "Respiratory System",
    topic: "Lung Cancer",
    yield_score: 4,
    keywords: ["Adeno", "Squamous", "Small cell"],
    summary:
      "**Adeno:** Female/Non-smoker. **Squamous:** HyperCa. **Small Cell:** Paraneoplastic.",
    exam_tip: "หญิง+ไม่สูบ = Adeno",
  },
  {
    system: "Respiratory System",
    topic: "Pediatric Infect: Croup/RSV",
    yield_score: 4,
    keywords: ["Croup", "Steeple sign", "RSV"],
    summary: "**Croup:** Barking cough, Steeple sign. **Bronchiolitis:** RSV.",
    exam_tip: "Croup vs Epiglottitis",
  },
  {
    system: "Respiratory System",
    topic: "Foreign Body Aspiration",
    yield_score: 4,
    keywords: ["Right bronchus", "Air trapping"],
    summary:
      "เด็กสำลัก. **Right Main Bronchus** (กว้าง/สั้น/ชัน). Film: Air trapping.",
    exam_tip: "ท่า Lateral Decubitus: ปอดข้างที่อุดจะไม่แฟบ",
  },
  {
    system: "Respiratory System",
    topic: "Environmental Lung",
    yield_score: 3,
    keywords: ["Asbestosis", "Silicosis"],
    summary: "**Asbestosis:** Construction. **Silicosis:** Mining.",
    exam_tip: "ดูอาชีพคนไข้",
  }, // 6. MUSCULOSKELETAL SYSTEM

  {
    system: "Musculoskeletal System",
    topic: "Nerve Injury: Upper Limb",
    yield_score: 5,
    keywords: ["Radial nerve", "Humerus fracture", "Wrist drop"],
    summary:
      "**Supracondylar:** ระวัง Brachial a. & Median n. // **Mid-shaft:** ระวัง Radial n. (Wrist drop)",
    exam_tip: "ระวังโจทย์หลอกตำแหน่งหัก Humerus",
  },
  {
    system: "Musculoskeletal System",
    topic: "Nerve Injury: Lower Limb",
    yield_score: 5,
    keywords: ["Common peroneal nerve", "Fibula fracture", "Foot drop"],
    summary:
      "**Fibular head fracture** กระทบ Common Peroneal Nerve -> Foot drop + Eversion ไม่ได้",
    exam_tip: "Bumper fracture (โดนชนข้างเข่า)",
  },
  {
    system: "Musculoskeletal System",
    topic: "Bone Tumor: Giant Cell vs Osteosarcoma",
    yield_score: 4,
    keywords: ["Giant cell", "Osteosarcoma", "Soap bubble"],
    summary:
      "**Giant Cell:** Epiphysis, Soap bubble. // **Osteosarcoma:** Metaphysis, Sunburst/Codman.",
    exam_tip: "จำตำแหน่ง Epiphysis vs Metaphysis",
  },
  {
    system: "Musculoskeletal System",
    topic: "Rheumatoid Arthritis (RA)",
    yield_score: 4,
    keywords: ["Autoimmune", "Pannus", "Anti-CCP"],
    summary:
      "Patho: **Pannus**. อาการ: Morning stiffness > 1h. Lab: **Anti-CCP**.",
    exam_tip: "RA เจ็บตอนพัก/ตื่นนอน vs OA เจ็บตอนใช้",
  }, // 7. ENDOCRINE SYSTEM

  {
    system: "Endocrine System",
    topic: "Hyperthyroidism: Graves' & Storm",
    yield_score: 5,
    keywords: ["Graves", "TSI", "Thyroid storm"],
    summary:
      "**Graves:** IgG stim TSH receptor. Triad: Goiter, Exophthalmos, Myxedema. **Storm:** ไข้สูง, หัวใจเต้นเร็ว, สับสน.",
    exam_tip: "Thyroid Storm Rx: PTU -> Beta-blocker -> Steroid",
  },
  {
    system: "Endocrine System",
    topic: "Hypothyroidism: Hashimoto's",
    yield_score: 5,
    keywords: ["Hashimoto", "Anti-TPO", "Hurthle cell"],
    summary:
      "**Hashimoto:** Autoimmune (Anti-TPO). Patho: Lymphocytic infiltration + **Hürthle cells**.",
    exam_tip: "Most common cause of Hypothyroid",
  },
  {
    system: "Endocrine System",
    topic: "Thyroid Cancer",
    yield_score: 4,
    keywords: ["Papillary", "Orphan Annie", "Medullary", "Calcitonin"],
    summary:
      "**Papillary:** Orphan Annie eyes, Psammoma bodies. **Medullary:** Parafollicular C-cells (Calcitonin), MEN 2.",
    exam_tip: "ตาขาวโพลน (Orphan Annie) = Papillary",
  },
  {
    system: "Endocrine System",
    topic: "DM Pharmacology",
    yield_score: 5,
    keywords: ["Metformin", "SGLT2i", "Sulfonylurea"],
    summary:
      "**Metformin:** First-line (Risk Lactic acidosis). **SGLT2i:** Cardio/Renal benefit (Risk UTI). **Sulfonylurea:** Hypoglycemia.",
    exam_tip: "คนไข้หัวใจวาย/ไตเสื่อม -> เชียร์ SGLT2i",
  },
  {
    system: "Endocrine System",
    topic: "Adrenal Cortex Pathology",
    yield_score: 4,
    keywords: ["Cushing", "Addison", "Conn"],
    summary:
      "**Cushing:** Cortisol สูง (Moon face). **Addison:** Cortisol/Aldo ต่ำ (ตัวดำ, Na ต่ำ K สูง). **Conn:** Aldo สูง (HTN, Hypokalemia).",
    exam_tip: "Addison: Hyperpigmentation จาก ACTH ที่สูงขึ้น",
  },
  {
    system: "Endocrine System",
    topic: "Pheochromocytoma",
    yield_score: 4,
    keywords: ["Chromaffin", "Catecholamine", "Triad"],
    summary:
      "Tumor of Chromaffin cells. **Triad:** Headache + Palpitations + Sweating (ร่วมกับความดันสูง).",
    exam_tip: "Rule of 10s (10% Malignant, 10% Bilateral)",
  },
  {
    system: "Endocrine System",
    topic: "Parathyroid: Calcium Homeostasis",
    yield_score: 4,
    keywords: ["Hyperparathyroidism", "Hypocalcemia", "Chvostek"],
    summary:
      "**HyperPTH:** Stones, Bones, Groans. **Hypocalcemia:** Chvostek/Trousseau signs (หลังตัด Thyroid).",
    exam_tip: "ตัด Thyroid แล้วมือจีบ = เผลอตัด Parathyroid",
  },
  {
    system: "Endocrine System",
    topic: "Pituitary Disorders",
    yield_score: 4,
    keywords: ["DI", "SIADH", "Prolactinoma"],
    summary:
      "**DI:** ขาด ADH (ฉี่จืด, Na สูง). **SIADH:** ADH เกิน (ฉี่ไม่ออก, Na ต่ำ). **Prolactinoma:** นมไหล, เมนส์ขาด.",
    exam_tip: "SIADH มักเกิดจาก Small Cell Lung Cancer",
  },
  {
    system: "Endocrine System",
    topic: "MEN Syndromes",
    yield_score: 3,
    keywords: ["MEN 1", "MEN 2A", "MEN 2B"],
    summary:
      "**MEN 1:** 3P (Pituitary, Parathyroid, Pancreas). **MEN 2A:** 2P+1M. **MEN 2B:** 1P+2M (Marfanoid, Mucosal neuroma).",
    exam_tip: "Medullary Thyroid CA เจอใน MEN 2 ทั้งคู่",
  }, // 8. REPRODUCTIVE SYSTEM

  {
    system: "Reproductive System",
    topic: "Uterine Bleeding & Mass",
    yield_score: 5,
    keywords: ["Leiomyoma", "Adenomyosis", "Endometriosis"],
    summary:
      "**Fibroids:** Whorled pattern. **Adenomyosis:** เยื่อบุเจาะเข้ากล้ามเนื้อ (Boggy uterus). **Endo:** Chocolate cyst.",
    exam_tip: "ปวดท้องเมนส์มาก + มดลูกโตนุ่ม = Adenomyosis",
  },
  {
    system: "Reproductive System",
    topic: "Cervical Cancer & HPV",
    yield_score: 5,
    keywords: ["HPV", "E6", "E7", "Pap smear"],
    summary:
      "**HPV 16/18:** E6 inhibit p53, E7 inhibit Rb. Screening: Pap smear (Fix 95% Ethanol).",
    exam_tip: "จำหน้าที่โปรตีน E6/E7 ให้แม่น",
  },
  {
    system: "Reproductive System",
    topic: "Penile Lesions",
    yield_score: 4,
    keywords: ["Bowen's disease", "SCC", "Leukoplakia"],
    summary:
      "**Bowen's:** CIS (Leukoplakia/Erythroplasia). **SCC:** แผลเรื้อรัง ก้อนงอก.",
    exam_tip: "Bowen's ยังไม่ทะลุ Basement membrane",
  },
  {
    system: "Reproductive System",
    topic: "Kartagener Syndrome",
    yield_score: 4,
    keywords: ["Cilia defect", "Dynein arm", "Situs inversus"],
    summary:
      "Defect Dynein arm of Cilia. Triad: **Infertility** + **Bronchiectasis** + **Situs Inversus**.",
    exam_tip: "ผู้ชายมีลูกยาก + ปอดอักเสบบ่อย -> สงสัยโรคนี้",
  },
  {
    system: "Reproductive System",
    topic: "Pregnancy Labs & Drugs",
    yield_score: 5,
    keywords: ["Hook effect", "Methyldopa", "Rh incompatibility"],
    summary:
      "**Hook effect:** hCG สูงเกิน -> False low. **HTN Drugs:** Methyldopa/Labetalol. **Rh:** แม่ Rh- ลูก Rh+.",
    exam_tip: "ห้ามใช้ ACEi/ARB และ Live vaccine ในคนท้อง",
  },
  {
    system: "Reproductive System",
    topic: "Embryology: Uterine Anomalies",
    yield_score: 4,
    keywords: ["Bicornuate", "Mullerian duct", "Incomplete fusion"],
    summary:
      "**Bicornuate Uterus:** มดลูกรูปหัวใจ เกิดจาก Paramesonephric (Mullerian) ducts เชื่อมกันไม่สมบูรณ์.",
    exam_tip: "Paramesonephric = หญิง, Mesonephric (Wolffian) = ชาย",
  },
  {
    system: "Reproductive System",
    topic: "Male Development",
    yield_score: 3,
    keywords: ["SRY gene", "Sertoli", "Leydig"],
    summary:
      "**SRY:** Y chr. **Sertoli:** สร้าง MIS (ฝ่อท่อหญิง). **Leydig:** สร้าง Testosterone (เจริญท่อชาย).",
    exam_tip: "ถ้าขาด MIS จะมีมดลูกในผู้ชายได้",
  },
  {
    system: "Reproductive System",
    topic: "Abortion Law & Ethics",
    yield_score: 3,
    keywords: ["Abortion", "12 weeks", "Medical necessity"],
    summary:
      "**<12 wk:** ทำได้เลย. **12-20 wk:** ต้องปรึกษา. **>20 wk:** เฉพาะจำเป็น (สุขภาพแม่/ลูกพิการ/ข่มขืน).",
    exam_tip: "เน้นเกณฑ์อายุครรภ์ 12 และ 20 สัปดาห์",
  }, // 9. RENAL & URINARY SYSTEM

  {
    system: "Renal & Urinary System",
    topic: "Nephrotic Syndrome: Membranous vs Minimal Change",
    yield_score: 5,
    keywords: ["Membranous", "Spike and Dome", "Podocyte effacement"],
    summary:
      "**Membranous:** ผู้ใหญ่, HBV/SLE, Silver stain: **Spike & Dome**. **Minimal Change:** เด็ก, บวมหลังติดเชื้อ, EM: **Podocyte effacement**.",
    exam_tip: "ผู้ใหญ่บวม = Membranous, เด็กบวม = Minimal Change",
  },
  {
    system: "Renal & Urinary System",
    topic: "Nephritic Syndrome: APSGN vs IgA",
    yield_score: 5,
    keywords: ["Hematuria", "C3 low", "ASO titer"],
    summary:
      "**APSGN:** เด็กเจ็บคอหายแล้ว 1-2 wk ค่อยฉี่แดง, **C3 ต่ำ**. **IgA:** เจ็บคอพร้อมฉี่แดง, **C3 ปกติ**.",
    exam_tip: "ดู C3 เป็นหลัก: ต่ำ = APSGN, ปกติ = IgA",
  },
  {
    system: "Renal & Urinary System",
    topic: "Acute Pyelonephritis",
    yield_score: 5,
    keywords: ["Fever", "CVA tenderness", "Klebsiella"],
    summary:
      "ไข้สูง หนาวสั่น ปวดเอว (**CVA Tenderness**). Most common: E. coli. **Klebsiella:** Pink mucoid colony.",
    exam_tip: "แยกกับ Cystitis (ไม่มีไข้สูง)",
  },
  {
    system: "Renal & Urinary System",
    topic: "Urolithiasis (Kidney Stones)",
    yield_score: 4,
    keywords: ["Calcium oxalate", "Struvite", "Coffin lid"],
    summary:
      "**Ca Oxalate:** Envelope shape. **Struvite:** Infection stone, **Coffin lid** shape, Alkaline urine.",
    exam_tip: "Coffin lid -> Proteus",
  },
  {
    system: "Renal & Urinary System",
    topic: "Hyperkalemia Management",
    yield_score: 4,
    keywords: ["Peaked T wave", "Sine wave", "Calcium gluconate"],
    summary:
      "EKG: **Tall peaked T**. Mx: **Calcium Gluconate** IV ทันที (Cardioprotection).",
    exam_tip: "EKG ผิดปกติ -> Ca Gluconate ก่อนเสมอ",
  },
  {
    system: "Renal & Urinary System",
    topic: "Tubulopathies: Bartter vs Gitelman",
    yield_score: 4,
    keywords: ["NKCC2", "Hypokalemia", "Calcium"],
    summary:
      "**Bartter (Loop):** เหมือนกิน Furosemide. **Gitelman (DCT):** เหมือนกิน Thiazide.",
    exam_tip: "Urine Ca: Bartter สูง, Gitelman ต่ำ",
  },
  {
    system: "Renal & Urinary System",
    topic: "Renal Artery Stenosis (RAS)",
    yield_score: 4,
    keywords: ["HTN", "ACEi", "Creatinine rise"],
    summary: "คนแก่ HTN หรือสาวอายุน้อย. ให้ยา ACEi แล้ว **Creatinine พุ่ง**.",
    exam_tip: "Contraindication ใน Bilateral RAS",
  },
  {
    system: "Renal & Urinary System",
    topic: "Benign Prostatic Hyperplasia (BPH)",
    yield_score: 4,
    keywords: ["Nocturia", "Transition zone", "Tamsulosin"],
    summary: "ฉี่ขัด. Patho: **Transition Zone**. Rx: Alpha-blocker, 5-ARI.",
    exam_tip: "Emergency Retention -> ใส่ Foley",
  },
  {
    system: "Renal & Urinary System",
    topic: "Bladder Cancer",
    yield_score: 4,
    keywords: ["Painless hematuria", "Smoking", "Aniline dye"],
    summary:
      "Risk: **Smoking**. อาการ: **Painless Hematuria** (ฉี่เลือดสด ไม่เจ็บ).",
    exam_tip: "คนแก่สูบ + ฉี่เลือด = Bladder CA",
  }, // 10. HEMATOLOGY SYSTEM

  {
    system: "Hematology System",
    topic: "RBC: Thalassemia",
    yield_score: 5,
    keywords: ["Alpha", "Beta", "Hb E", "Target cell"],
    summary:
      "**Alpha:** Deletion. **Beta:** Mutation. **Hb E:** Common Thai. Smear: **Target cells**.",
    exam_tip: "Thal (MCV low, RDW normal) vs IDA (MCV low, RDW high)",
  },
  {
    system: "Hematology System",
    topic: "RBC: Iron Deficiency Anemia",
    yield_score: 4,
    keywords: ["Microcytic", "Ferritin", "Spoon nail"],
    summary:
      "Cause: Chronic bleed. Lab: **Iron low, Ferritin low, TIBC high**.",
    exam_tip: "ชาย/คนแก่ เป็น IDA ต้องหา CA Colon",
  },
  {
    system: "Hematology System",
    topic: "Leukemia: CML",
    yield_score: 5,
    keywords: ["CML", "t(9;22)", "BCR-ABL"],
    summary:
      "**CML:** Massive Splenomegaly. **t(9;22) Philadelphia** -> BCR-ABL.",
    exam_tip: "Rx: Imatinib",
  },
  {
    system: "Hematology System",
    topic: "Lymphoma: Hodgkin vs NHL",
    yield_score: 4,
    keywords: ["Reed-Sternberg", "B symptoms"],
    summary:
      "**Hodgkin:** Reed-Sternberg, Contiguous spread. **NHL:** Non-contiguous.",
    exam_tip: "B symptoms = Poor prognosis",
  },
  {
    system: "Hematology System",
    topic: "Multiple Myeloma (MM)",
    yield_score: 4,
    keywords: ["CRAB", "Bence Jones", "Rouleaux"],
    summary:
      "**CRAB**: Ca high, Renal fail, Anemia, Bone lytic. Smear: **Rouleaux**.",
    exam_tip: "คนแก่ปวดหลัง + ไตวาย + ซีด -> MM",
  },
  {
    system: "Hematology System",
    topic: "Bleeding: Hemophilia vs vWD",
    yield_score: 4,
    keywords: ["Factor VIII", "aPTT", "Bleeding time"],
    summary:
      "**Hemophilia:** Deep bleed, **aPTT prolong**. **vWD:** Mucosal bleed, **BT prolong**.",
    exam_tip: "Mixing study correct = Factor def",
  },
  {
    system: "Hematology System",
    topic: "Platelet: ITP vs TTP",
    yield_score: 3,
    keywords: ["Thrombocytopenia", "Pentad", "ADAMTS13"],
    summary:
      "**ITP:** Isolated low PLT. **TTP:** Pentad (Fever, Anemia, Low PLT, Renal, Neuro).",
    exam_tip: "TTP ห้ามให้เกล็ดเลือด",
  },
  {
    system: "Hematology System",
    topic: "Warfarin vs Heparin",
    yield_score: 5,
    keywords: ["PT", "INR", "aPTT"],
    summary:
      "**Warfarin:** Anti-Vit K, Monitor **PT/INR**. **Heparin:** Anti-ATIII, Monitor **aPTT**.",
    exam_tip: "Warfarin interaction เยอะ",
  },
  {
    system: "Hematology System",
    topic: "Transfusion Reactions",
    yield_score: 4,
    keywords: ["Febrile", "Acute hemolytic", "TRALI"],
    summary:
      "**Febrile:** Chills. **Acute hemolytic:** ABO mismatch. **TRALI:** Pulmonary edema.",
    exam_tip: "Stop transfusion immediately -> IV NSS",
  },

  // 11. INFECTIOUS DISEASES
  {
    system: "Infectious Diseases",
    topic: "Hepatitis B Serology",
    yield_score: 5,
    keywords: ["HBsAg", "Anti-HBs", "Window period"],
    summary:
      "**Chronic:** HBsAg (+) > 6mo. **Immune:** Anti-HBs (+) only. **Window Period:** Anti-HBc IgM (+) only.",
    exam_tip: "Window period ตรวจไม่เจอ HBsAg และ Anti-HBs",
  },
  {
    system: "Infectious Diseases",
    topic: "Meningitis CSF Profiles",
    yield_score: 5,
    keywords: ["Bacterial", "Viral", "TB"],
    summary:
      "**Bact:** PMN, Glu <40, Pro >100. **Viral:** Lympho, Glu Normal. **TB:** Lympho, Glu Low, Pro High (Cobweb).",
    exam_tip: "Glucose ต่ำมาก = Bacteria/TB",
  },
  {
    system: "Infectious Diseases",
    topic: "Streptococcus suis",
    yield_score: 5,
    keywords: ["Hearing loss", "Raw pork"],
    summary:
      "History: กินหมูดิบ/เลือดแปลง. Clinical: Sepsis + **Hearing loss** (หูดับ).",
    exam_tip: "หูดับ = Suis",
  },
  {
    system: "Infectious Diseases",
    topic: "TB Immunology & Stain",
    yield_score: 4,
    keywords: ["TNF-alpha", "Granuloma", "AFB"],
    summary:
      "Immune: Th1 (IFN-g) & Macrophage (TNF-a) สร้าง Granuloma. Stain: **Acid-Fast Bacilli (AFB)**.",
    exam_tip: "Anti-TNF drug ทำ TB กำเริบ",
  },
  {
    system: "Infectious Diseases",
    topic: "Klebsiella pneumoniae",
    yield_score: 4,
    keywords: ["Currant jelly", "Alcoholic", "Pink mucoid"],
    summary:
      "Pt: Alcoholic/Elderly. Sputum: **Currant jelly**. Lab: **Pink mucoid colony** on MacConkey.",
    exam_tip: "Pink mucoid = Klebsiella",
  },
  {
    system: "Infectious Diseases",
    topic: "Food Poisoning Toxins",
    yield_score: 4,
    keywords: ["S. aureus", "B. cereus", "Preformed toxin"],
    summary:
      "**S. aureus:** Eclair/Egg (<6hr). **B. cereus:** Fried rice. **Botulinum:** Canned food (Descending paralysis).",
    exam_tip: "อาการเร็ว (<6 ชม.) = Preformed Toxin",
  },
  {
    system: "Infectious Diseases",
    topic: "Antibiotic-Associated Diarrhea",
    yield_score: 4,
    keywords: ["C. difficile", "Pseudomembranous"],
    summary:
      "Post-Abx -> **C. difficile**. Colonoscopy: **Pseudomembranous colitis**. Rx: Oral Vancomycin.",
    exam_tip: "ประวัติได้ยาฆ่าเชื้อนานๆ",
  },
  {
    system: "Infectious Diseases",
    topic: "Urethritis: GC vs Non-GC",
    yield_score: 4,
    keywords: ["Gonorrhea", "Chlamydia", "Gram stain"],
    summary:
      "**Gonococcal:** Gram (-) diplococci in WBC. **Non-GC (Chlamydia):** ย้อมไม่เจอเชื้อ.",
    exam_tip: "ย้อมไม่เจอ = Chlamydia",
  },
  {
    system: "Infectious Diseases",
    topic: "Syphilis Serology",
    yield_score: 4,
    keywords: ["VDRL", "TPHA", "RPR"],
    summary:
      "**Screening:** VDRL/RPR (ติดตามผลรักษาได้). **Confirm:** TPHA/FTA-ABS (บวกตลอดชีวิต).",
    exam_tip: "ดูผลรักษาใช้ VDRL titer",
  },
  {
    system: "Infectious Diseases",
    topic: "Scrub Typhus",
    yield_score: 4,
    keywords: ["Eschar", "Chigger", "Doxycycline"],
    summary:
      "Vector: Chigger (ไรอ่อน). Sign: **Eschar** (แผลบุหรี่จี้). Rx: Doxycycline.",
    exam_tip: "หาแผล Eschar ให้เจอ",
  },
  {
    system: "Infectious Diseases",
    topic: "Leptospirosis",
    yield_score: 4,
    keywords: ["Calf pain", "Flood", "Jaundice"],
    summary:
      "Hx: ลุยน้ำท่วม. Sx: **Severe calf pain**, Fever, Jaundice, Renal failure.",
    exam_tip: "ปวดน่อง + ฉี่ไม่ออก",
  },
  {
    system: "Infectious Diseases",
    topic: "Dengue Hemorrhagic Fever",
    yield_score: 5,
    keywords: ["Plasma leakage", "Tourniquet", "Shock"],
    summary:
      "Critical phase: Fever drops -> **Shock** (Plasma leakage). Lab: Hct up, PLT down.",
    exam_tip: "ระวัง Shock ตอนไข้ลง",
  },
  {
    system: "Infectious Diseases",
    topic: "Biofilm: S. epidermidis",
    yield_score: 3,
    keywords: ["Indwelling device", "Catheter"],
    summary:
      "Coagulase negative Staph. ชอบเกาะวัสดุเทียม (Valve, Cath) สร้าง **Biofilm** ดื้อยา.",
    exam_tip: "ติดเชื้อสายสวน = S. epidermidis",
  },
  {
    system: "Infectious Diseases",
    topic: "GBS in Pregnancy",
    yield_score: 4,
    keywords: ["Group B Strep", "Sepsis", "Penicillin"],
    summary:
      "Screening at 35-37 wk. If (+), give **Intrapartum Penicillin** to prevent neonatal sepsis.",
    exam_tip: "GBS = Streptococcus agalactiae",
  }, // 12. IMMUNOLOGY SYSTEM

  {
    system: "Immunology System",
    topic: "Hypersensitivity Type I-IV",
    yield_score: 5,
    keywords: ["IgE", "Immune complex", "T-cell"],
    summary:
      "**I:** IgE (Anaphylaxis). **II:** Cytotoxic (AIHA, Graves). **III:** Immune Complex (SLE). **IV:** Delayed T-cell (TB skin test).",
    exam_tip: "Graves' disease = Type II",
  },
  {
    system: "Immunology System",
    topic: "SLE Antibodies",
    yield_score: 5,
    keywords: ["ANA", "Anti-dsDNA", "Anti-Smith"],
    summary:
      "**ANA:** Sensitive (Screening). **Anti-dsDNA:** Specific (Renal/Activity). **Anti-Smith:** Most Specific.",
    exam_tip: "Anti-dsDNA สัมพันธ์กับโรคไต",
  },
  {
    system: "Immunology System",
    topic: "Lupus Nephritis",
    yield_score: 4,
    keywords: ["Full house", "Wire loop"],
    summary:
      "IF: **Full house** pattern. Class IV: Diffuse proliferative (Most severe/Wire loop).",
    exam_tip: "Full house IF = SLE",
  },
  {
    system: "Immunology System",
    topic: "Rheumatoid Arthritis (RA)",
    yield_score: 4,
    keywords: ["Anti-CCP", "Pannus"],
    summary: "Patho: Pannus. Lab: **Anti-CCP** (Specific > RF).",
    exam_tip: "Anti-CCP แม่นกว่า RF",
  },
  {
    system: "Immunology System",
    topic: "Psoriasis Pathophysiology",
    yield_score: 4,
    keywords: ["Th17", "IL-17", "Silver scale"],
    summary:
      "Driven by **Th17 cells** (IL-17, IL-23). Sx: Silvery scales plaque.",
    exam_tip: "Biologics target IL-17",
  },
  {
    system: "Immunology System",
    topic: "Opsonization",
    yield_score: 4,
    keywords: ["Encapsulated bacteria", "C3b", "IgG"],
    summary:
      "Defense against **Encapsulated bacteria** (S. pneumo). Use C3b/IgG to coat for phagocytosis.",
    exam_tip: "ตัดม้าม -> เสีย Opsonization -> ติด S. pneumo ง่าย",
  },
  {
    system: "Immunology System",
    topic: "TB Granuloma Formation",
    yield_score: 4,
    keywords: ["IFN-gamma", "TNF-alpha", "Macrophage"],
    summary:
      "Interaction: Macrophage (IL-12) <-> Th1 (IFN-gamma). TNF-alpha maintains granuloma.",
    exam_tip: "IL-12 / IFN-gamma axis",
  },
  {
    system: "Immunology System",
    topic: "Transplant Rejection",
    yield_score: 4,
    keywords: ["Hyperacute", "Acute", "Preformed Ab"],
    summary:
      "**Hyperacute:** Preformed Ab (mins). **Acute:** T-cell mediated (weeks).",
    exam_tip: "Hyperacute เกิดในห้องผ่าตัดเลย",
  },
  {
    system: "Immunology System",
    topic: "Graft-versus-Host (GVHD)",
    yield_score: 4,
    keywords: ["Bone marrow", "Donor T-cell"],
    summary:
      "In Bone Marrow Transplant. **Donor T-cells** attack Host. Sx: Rash, Diarrhea, Jaundice.",
    exam_tip: "Donor กัด Host",
  },
  {
    system: "Immunology System",
    topic: "Vaccines: Live vs Inactivated",
    yield_score: 4,
    keywords: ["Pregnancy", "MMR", "Varicella"],
    summary:
      "**Live (MMR, Varicella, BCG):** ห้ามฉีดในคนท้อง/Immunocompromised.",
    exam_tip: "คนท้องห้าม Live vaccine",
  },
  {
    system: "Immunology System",
    topic: "Bruton's Agammaglobulinemia",
    yield_score: 3,
    keywords: ["X-linked", "BTK gene", "B-cell"],
    summary:
      "Defect **BTK gene**. No B-cells/Ig. Recurrent bacterial infections in boys >6mo.",
    exam_tip: "ทอนซิลหาย/ต่อมน้ำเหลืองยุบ",
  },
  {
    system: "Immunology System",
    topic: "DiGeorge Syndrome",
    yield_score: 3,
    keywords: ["Thymus", "Hypocalcemia", "CATCH-22"],
    summary:
      "**No Thymus** (Low T-cell) + **No Parathyroid** (Low Ca). 22q11 deletion.",
    exam_tip: "Tetany + Recurrent viral/fungal",
  }, // 13. CELL BIOLOGY & BIOCHEMISTRY

  {
    system: "Cell Biology & Biochemistry",
    topic: "Microtubules & Drugs",
    yield_score: 5,
    keywords: ["Colchicine", "Vinca", "Gout"],
    summary:
      "**Function:** Cilia, Spindle. **Drugs:** Colchicine (Gout) inhibit polymerization. Vinca/Taxanes (Chemo) inhibit mitosis.",
    exam_tip: "Colchicine ยับยั้ง Neutrophil เดิน",
  },
  {
    system: "Cell Biology & Biochemistry",
    topic: "Kartagener Syndrome",
    yield_score: 4,
    keywords: ["Cilia defect", "Dynein", "Situs inversus"],
    summary:
      "Defect **Dynein arm**. Triad: Sinusitis/Bronchiectasis + Infertility + Situs Inversus.",
    exam_tip: "Sperm หางไม่ขยับ + หัวใจกลับข้าง",
  },
  {
    system: "Cell Biology & Biochemistry",
    topic: "Glycogen Storage Disease Type I",
    yield_score: 5,
    keywords: ["Von Gierke", "Glucose-6-phosphatase", "Hypoglycemia"],
    summary:
      "**Von Gierke:** Defect Glucose-6-Phosphatase. Sx: Severe Hypoglycemia, Hepatomegaly, Gout, Lactic acidosis.",
    exam_tip: "น้ำตาลต่ำรุนแรง + ตับโต + ยูริกสูง",
  },
  {
    system: "Cell Biology & Biochemistry",
    topic: "Obesity: Leptin",
    yield_score: 4,
    keywords: ["Leptin", "LEPR gene", "Obesity"],
    summary:
      "**Leptin:** ฮอร์โมนอิ่ม. Mutation LEPR gene -> เด็กอ้วนมาก คุมกินไม่ได้.",
    exam_tip: "Leptin = Satiety hormone",
  },
  {
    system: "Cell Biology & Biochemistry",
    topic: "Methanol Poisoning",
    yield_score: 4,
    keywords: ["Blindness", "Formic acid", "ADH"],
    summary:
      "เหล้าเถื่อน -> **Formic acid** -> ตาบอด/Acidosis. Rx: Inhibit Alcohol Dehydrogenase (ADH).",
    exam_tip: "เหล้าเถื่อน = ตาบอด",
  },
  {
    system: "Cell Biology & Biochemistry",
    topic: "Cell Cycle Checkpoints",
    yield_score: 4,
    keywords: ["p53", "Rb", "G1/S"],
    summary:
      "**G1/S Checkpoint:** p53 & Rb ตรวจสอบ DNA. ถ้าพัง -> หยุด Cell cycle หรือ Apoptosis.",
    exam_tip: "p53 = Guardian of the genome",
  },
  {
    system: "Cell Biology & Biochemistry",
    topic: "DNA Repair Defects",
    yield_score: 4,
    keywords: ["Lynch", "Xeroderma", "Mismatch repair"],
    summary:
      "**Lynch (HNPCC):** Mismatch repair defect. **Xeroderma Pigmentosum:** NER defect (แพ้ UV).",
    exam_tip: "แพ้แสง UV = Xeroderma",
  },
  {
    system: "Cell Biology & Biochemistry",
    topic: "Vitamin B Deficiencies",
    yield_score: 3,
    keywords: ["B1", "B3", "Pellagra"],
    summary:
      "**B1 (Thiamine):** Wernicke (Alcoholic). **B3 (Niacin):** Pellagra (4D: Dermatitis, Diarrhea, Dementia, Death).",
    exam_tip: "ขี้เมา เดินเซ ตาเหล่ = B1",
  }, // 14. GENETICS & EMBRYOLOGY

  {
    system: "Genetics & Embryology",
    topic: "Down Syndrome Mechanisms",
    yield_score: 5,
    keywords: ["Trisomy 21", "Nondisjunction", "Translocation"],
    summary:
      "**Nondisjunction:** แม่แก่ (Risk สูง). **Robertsonian Translocation:** พ่อแม่เป็น Carrier (มีโอกาสเกิดซ้ำในท้องหน้า).",
    exam_tip: "Translocation เสี่ยงเกิดซ้ำสูงกว่า",
  },
  {
    system: "Genetics & Embryology",
    topic: "Sex Chromosome Disorders",
    yield_score: 5,
    keywords: ["Klinefelter", "Turner", "Amenorrhea"],
    summary:
      "**Klinefelter (47,XXY):** ชายสูง นมโต เป็นหมัน. **Turner (45,XO):** หญิงเตี้ย คอแผง Amenorrhea.",
    exam_tip: "คอแผง (Webbed neck) = Turner",
  },
  {
    system: "Genetics & Embryology",
    topic: "Pedigree Analysis",
    yield_score: 5,
    keywords: ["Autosomal Dominant", "Recessive", "X-linked"],
    summary:
      "**AD:** เป็นทุกรุ่น. **AR:** ข้ามรุ่น. **XR:** ชายล้วน แม่พาหะ (ลูกชาย 50% เป็น).",
    exam_tip: "Duchenne MD = XR",
  },
  {
    system: "Genetics & Embryology",
    topic: "Imprinting Disorders",
    yield_score: 4,
    keywords: ["Prader-Willi", "Angelman", "Chr 15"],
    summary:
      "Deletion Chr 15. **Prader-Willi:** ขาดจาก Pather (อ้วน). **Angelman:** ขาดจาก Mother (Happy puppet).",
    exam_tip: "Pather = Prader, Mother = Angelman",
  },
  {
    system: "Genetics & Embryology",
    topic: "Cancer Genetics",
    yield_score: 4,
    keywords: ["Tumor suppressor", "Oncogene", "Rb", "p53"],
    summary:
      "**Tumor Suppressor:** Rb (Retinoblastoma), p53, APC (FAP). **Oncogene:** K-Ras (Colon/Lung), Bcr-Abl.",
    exam_tip: "Li-Fraumeni = p53 defect",
  },
  {
    system: "Genetics & Embryology",
    topic: "DiGeorge Syndrome",
    yield_score: 4,
    keywords: ["Pharyngeal pouch", "CATCH-22", "Thymus"],
    summary:
      "Defect 3rd/4th Pharyngeal pouches. **CATCH-22:** Cardiac, Abnormal face, Thymic aplasia, Cleft, Hypocalcemia.",
    exam_tip: "ไม่มี Thymus + Ca ต่ำ",
  },
  {
    system: "Genetics & Embryology",
    topic: "Urogenital Development",
    yield_score: 3,
    keywords: ["Hypospadias", "Bicornuate"],
    summary:
      "**Hypospadias:** รูเปิดล่าง (Ventral). **Bicornuate:** Paramesonephric fusion defect.",
    exam_tip: "Hypospadias ห้ามขริบ (ต้องเก็บหนังไว้ซ่อม)",
  },
  {
    system: "Genetics & Embryology",
    topic: "Teratogens",
    yield_score: 4,
    keywords: ["Isotretinoin", "Folic acid", "Alcohol"],
    summary:
      "**Vit A (Isotretinoin):** หู/หน้าผิดปกติ. **Folic def:** Neural tube defect. **Alcohol:** Microcephaly.",
    exam_tip: "คนท้องเป็นสิว ห้ามกิน Vit A",
  },
  {
    system: "Genetics & Embryology",
    topic: "Fragile X Syndrome",
    yield_score: 3,
    keywords: ["CGG repeat", "Macroorchidism"],
    summary:
      "CGG repeat. ชายปัญญาอ่อน หน้ายาว หูใหญ่ **อัณฑะใหญ่** (Macroorchidism).",
    exam_tip: "อัณฑะใหญ่ = Fragile X",
  }, // 15. PHARMACOLOGY & TOXICOLOGY

  {
    system: "Pharmacology & Toxicology",
    topic: "Bioavailability & Kinetics",
    yield_score: 4,
    keywords: ["Bioavailability", "Zero order", "AUC"],
    summary:
      "**Bioavailability (F):** Area Under Curve (IV = 100%). **Zero Order:** Rate คงที่ (Alcohol). **First Order:** Rate แปรผันตามความเข้มข้น.",
    exam_tip: "Alcohol = Zero Order Kinetics",
  },
  {
    system: "Pharmacology & Toxicology",
    topic: "Toxicology: Alcohols & Drugs",
    yield_score: 5,
    keywords: ["Methanol", "Cannabis", "Antidote"],
    summary:
      "**Methanol:** เหล้าเถื่อน -> ตาบอด/Acidosis -> Rx: Ethanol/Fomepizole. **Cannabis:** ตาเยิ้ม ขำ อารมณ์ดี -> Delta-9-THC.",
    exam_tip: "เหล้าเถื่อน = Formic acid = ตาบอด",
  },
  {
    system: "Pharmacology & Toxicology",
    topic: "Common Antidotes",
    yield_score: 5,
    keywords: ["Paracetamol", "Organophosphate", "Opioid"],
    summary:
      "**Para:** N-acetylcysteine. **Organophosphate:** Atropine + Pralidoxime. **Opioid:** Naloxone.",
    exam_tip: "จำคู่ Antidote ให้แม่น",
  },
  {
    system: "Pharmacology & Toxicology",
    topic: "Chemotherapy & Targeted",
    yield_score: 5,
    keywords: ["Doxorubicin", "Methotrexate", "Imatinib"],
    summary:
      "**Doxorubicin:** Cardiotoxicity. **MTX:** Anti-Folate. **Imatinib:** Bcr-Abl (CML). **Trastuzumab:** HER2.",
    exam_tip: "Doxorubicin = Heart Failure",
  },
  {
    system: "Pharmacology & Toxicology",
    topic: "Rational Drug Use (RDU)",
    yield_score: 4,
    keywords: ["Pregnancy", "Occupation", "Side effects"],
    summary:
      "**Pregnancy:** Avoid Warfarin, ACEi, Live vax. **Occupation:** นักบินห้ามกิน CPM (ง่วง) -> ให้ Fexofenadine.",
    exam_tip: "คนท้องห้าม Live vaccine",
  }, // 16. PSYCHIATRY

  {
    system: "Psychiatry",
    topic: "Alcohol Withdrawal & Wernicke",
    yield_score: 5,
    keywords: ["Delirium Tremens", "Thiamine", "Ataxia"],
    summary:
      "**DTs:** สั่น สับสน HRเร็ว (ตายได้). **Wernicke:** Ataxia, Confusion, Ophthalmoplegia (ขาด B1).",
    exam_tip: "Triad of Wernicke: เดินเซ ตาเหล่ สับสน",
  },
  {
    system: "Psychiatry",
    topic: "Schizophrenia: Dopamine Pathways",
    yield_score: 5,
    keywords: ["Mesolimbic", "Nigrostriatal", "Galactorrhea"],
    summary:
      "**Mesolimbic:** High DA -> Positive sx. **Nigrostriatal:** Block -> EPS. **Tuberoinfundibular:** Block -> Galactorrhea.",
    exam_tip: "Block Tubero -> นมไหล",
  },
  {
    system: "Psychiatry",
    topic: "Ethics: Empathy vs Sympathy",
    yield_score: 5,
    keywords: ["Empathy", "Suicide", "Emergency"],
    summary:
      "**Empathy:** เข้าใจความรู้สึก (ไม่ร้องไห้ตาม). **Suicide:** ถ้าหมดสติ -> Resuscitate ทันที (Life saving first).",
    exam_tip: "หมอเข้าใจว่าคุณเหนื่อย = Empathy",
  },
  {
    system: "Psychiatry",
    topic: "Mood Disorders",
    yield_score: 4,
    keywords: ["Depression", "Bipolar", "Lithium"],
    summary:
      "**Depression:** Low Serotonin/NE/DA. **Bipolar:** Mania (ไม่นอน/พูดเร็ว/ใช้เงิน) -> Rx: Lithium.",
    exam_tip: "Lithium ระวังไต/ไทรอยด์",
  },
  {
    system: "Psychiatry",
    topic: "Child Psych: ADHD",
    yield_score: 4,
    keywords: ["Inattention", "Hyperactivity", "2 settings"],
    summary:
      "วอกแวก อยู่นิ่งไม่ได้. ต้องเกิดใน **2 สถานที่ขึ้นไป** (บ้าน+โรงเรียน). Patho: Low DA/NE at Frontal.",
    exam_tip: "เป็นที่เดียว ไม่ใช่ ADHD",
  }, // 17. EPIDEMIOLOGY & STATISTICS

  {
    system: "Epidemiology & Statistics",
    topic: "Study Designs: RCT/Cohort/Case-Control",
    yield_score: 5,
    keywords: ["Randomization", "Relative Risk", "Odds Ratio"],
    summary:
      "**RCT:** Randomization (Best for Rx). **Cohort:** Exposure -> Outcome (RR). **Case-Control:** Outcome -> Exposure (OR).",
    exam_tip: "Rare disease ใช้ Case-Control",
  },
  {
    system: "Epidemiology & Statistics",
    topic: "Diagnostic Tests: Sens/Spec",
    yield_score: 5,
    keywords: ["Screening", "Confirmation", "SnNout", "SpPin"],
    summary:
      "**Sensitivity:** Screening (SnNout). **Specificity:** Confirm (SpPin).",
    exam_tip: "ไม่อยากให้หลุด (Screen) ใช้ Sensitivity สูงๆ",
  },
  {
    system: "Epidemiology & Statistics",
    topic: "PPV & NPV",
    yield_score: 4,
    keywords: ["Prevalence", "Positive predictive value"],
    summary:
      "**PPV:** โอกาสเป็นโรคจริงเมื่อผลบวก. **NPV:** โอกาสไม่เป็นโรคเมื่อผลลบ. *แปรผันตาม Prevalence*.",
    exam_tip: "Prevalence สูง -> PPV สูง",
  },
  {
    system: "Epidemiology & Statistics",
    topic: "Measures of Risk: RR vs NNT",
    yield_score: 4,
    keywords: ["Relative risk", "Number needed to treat"],
    summary:
      "**RR:** Risk exposed / Risk unexposed. **NNT:** 1 / ARR (Absolute Risk Reduction).",
    exam_tip: "NNT ยิ่งน้อยยิ่งดี (รักษาน้อยคนแต่ได้ผลเยอะ)",
  },
  {
    system: "Epidemiology & Statistics",
    topic: "Statistical Errors: Type I vs II",
    yield_score: 4,
    keywords: ["Alpha", "Beta", "False positive"],
    summary:
      "**Type I (Alpha):** False Positive (ตื่นตูม). **Type II (Beta):** False Negative (พลาดเป้า).",
    exam_tip: "P-value < 0.05 คือยอมรับ Type I error < 5%",
  },
  {
    system: "Epidemiology & Statistics",
    topic: "Statistical Tests Selection",
    yield_score: 4,
    keywords: ["Chi-square", "T-test", "ANOVA"],
    summary:
      "**Chi-square:** Cat vs Cat. **T-test:** Mean 2 groups. **ANOVA:** Mean >2 groups.",
    exam_tip: "ชาย/หญิง กับ หาย/ไม่หาย = Chi-square",
  },
  {
    system: "Epidemiology & Statistics",
    topic: "Bias & Confounding",
    yield_score: 3,
    keywords: ["Selection bias", "Confounder"],
    summary:
      "**Confounder:** ปัจจัยกวน (เช่น บุหรี่ในคนกินกาแฟ). **Selection bias:** เลือกกลุ่มตัวอย่างไม่ดี.",
    exam_tip: "แก้ Confounder ด้วย Randomization หรือ Matching",
  },
];

// ... (ต่อจาก MASTER_SEED_DATA fe]; )

// --- Firebase Setup ---
const firebaseConfig = {
  apiKey: "AIzaSyA1PauDwTDzJ4UfeWjlIBU9IZqL6r67WvI",
  authDomain: "medguide-34566.firebaseapp.com",
  projectId: "medguide-34566",
  storageBucket: "medguide-34566.firebasestorage.app",
  messagingSenderId: "187681965230",
  appId: "1:187681965230:web:e286aeea916f1d8a93d93f",
  measurementId: "G-D37103BBWQ",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
export const analytics =
  typeof window !== "undefined" ? getAnalytics(app) : null;
const appId = typeof __app_id !== "undefined" ? __app_id : "medguide-master-db";

// --- 1. SystemIcon (Global Component) ---
const SystemIcon = ({ name }) => {
  if (name.includes("Cardio"))
    return <Heart size={14} className="text-pink-500" />;
  if (name.includes("Hema"))
    return <Droplet size={14} className="text-red-500" />;
  if (name.includes("Musculo"))
    return <Bone size={14} className="text-amber-600" />;
  if (name.includes("Resp")) return <Wind size={14} className="text-sky-500" />;
  if (name.includes("Gastro"))
    return <Utensils size={14} className="text-orange-500" />;
  if (name.includes("Renal"))
    return <Activity size={14} className="text-yellow-500" />;
  if (name.includes("Nervous"))
    return <Brain size={14} className="text-purple-500" />;
  if (name.includes("Endocrine"))
    return <Zap size={14} className="text-yellow-500" />;
  if (name.includes("Repro"))
    return <Baby size={14} className="text-rose-500" />;
  if (name.includes("Infectious"))
    return <Bug size={14} className="text-emerald-500" />;
  if (name.includes("Immuno"))
    return <Shield size={14} className="text-indigo-500" />;
  if (name.includes("Cell") || name.includes("Bio"))
    return <Atom size={14} className="text-teal-500" />;
  if (name.includes("Genetics"))
    return <Dna size={14} className="text-violet-500" />;
  if (name.includes("Pharm"))
    return <Pill size={14} className="text-teal-500" />;
  if (name.includes("Psych"))
    return <Smile size={14} className="text-fuchsia-500" />;
  if (name.includes("Epidemiology"))
    return <BarChart2 size={14} className="text-gray-500" />;
  return <Stethoscope size={14} className="text-blue-500" />;
};

// --- 2. TopicCard (Global Component) ---
const TopicCard = ({
  item,
  isRead,
  onToggle,
  onZoom,
  showAdmin,
  onEdit,
  onDelete,
  expanded, // 👈 รับค่าสถานะเปิด/ปิด
  onExpand, // 👈 รับฟังก์ชันกดปุ่ม
  onGenerateSpecific,
}) => {
  // ✂️ ลบ const [expanded, setExpanded] = React.useState(false); ออกไปแล้ว

  // 🟢 1. ตั้งค่าตัวแปลงสัญลักษณ์ (Latex Map)
  const latexMap = {
    "\\Delta": "Δ",
    "\\alpha": "α",
    "\\beta": "β",
    "\\gamma": "γ",
    "\\lambda": "λ",
    "\\theta": "θ",
    "\\mu": "μ",
    "\\pi": "π",
    "\\rightarrow": "→",
    "\\leftarrow": "←",
    "\\uparrow": "↑",
    "\\downarrow": "↓",
    "\\approx": "≈",
    "\\neq": "≠",
    "\\leq": "≤",
    "\\geq": "≥",
    "\\pm": "±",
    "\\infty": "∞",
    "^o": "°",
    K_m: "Kₘ",
    "V_{max}": "Vₘₐₓ",
    "_{max}": "ₘₐₓ",
    CO_2: "CO₂",
    H_2O: "H₂O",
    "\\ge": "≥", // รองรับ \ge
    "\\le": "≤", // รองรับ \le (แถมให้)
  };

  // 🟢 2. เครื่องมือแปลงข้อความอัจฉริยะ (ใช้ได้ทุกที่: Topic, Tip, Content)
  const renderInlineContent = (
    text,
    boldClass = "text-blue-700 font-semibold"
  ) => {
    if (!text) return null;
    // ✅ เพิ่ม replace <i> ให้เป็น * (ตัวเอียง)
    const cleanText = text
      .replace(/^[\s]*\*\s/g, "• ")
      .replace(/<b>/g, "**")
      .replace(/<\/b>/g, "**")
      .replace(/<i>/g, "*")
      .replace(/<\/i>/g, "*");

    const parseLatex = (str) => {
      let res = str;
      Object.keys(latexMap).forEach(
        (k) => (res = res.split(k).join(latexMap[k]))
      );
      return res;
    };

    const parts = cleanText.split(/(\$.*?\$|\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("$") && part.endsWith("$")) {
        return (
          <span
            key={index}
            className="font-serif italic px-1 rounded bg-slate-100/50"
          >
            {parseLatex(part.slice(1, -1))}
          </span>
        );
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className={boldClass}>
            {renderInlineContent(part.slice(2, -2), boldClass)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={index} className="text-gray-600 italic">
            {renderInlineContent(part.slice(1, -1), boldClass)}
          </em>
        );
      }
      return part;
    });
  };

  // 🟢 ฟังก์ชัน renderSummary แบบรองรับ "หลายตาราง" (Multi-Table Support)
  const renderSummary = (text) => {
    if (!text) return null;
    let fixedText = text || "";
    // Clean Text (เหมือนเดิม)
    fixedText = fixedText
      .replace(/\\n/g, "\n")
      .replace(/\*n\*\|/g, "\n|")
      .replace(/([:)>}])\s*n\s*\|/g, "$1\n|")
      .replace(/\|\s*n\s*\|/g, "|\n|")
      .replace(/([^a-zA-Z0-9])n\|/g, "$1\n|")
      .replace(/_n_/g, "\n")
      .replace(/ n /g, "\n")
      .replace(/<br\s*\/?>/gi, "\n");

    const lines = fixedText.split("\n");
    const blocks = [];
    let currentBlock = [];
    let isTableMode = false;

    // 🔄 Loop แยกส่วน Text กับ Table (กี่ตารางก็ได้)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // เช็คว่าเป็นตารางไหม? (ต้องมี | และบรรทัดถัดไปเป็นเส้นคั่น |---|)
      const hasPipe = line.includes("|");
      const nextLineIsSeparator =
        lines[i + 1] &&
        lines[i + 1].includes("---|") &&
        lines[i + 1].includes("|");
      const isTableStart = !isTableMode && hasPipe && nextLineIsSeparator;

      if (isTableMode) {
        if (hasPipe) {
          currentBlock.push(line);
        } else {
          // จบตาราง -> บันทึก Block ตาราง
          blocks.push({ type: "table", content: currentBlock });
          currentBlock = [line]; // เริ่ม Block ข้อความใหม่ทันที
          isTableMode = false;
        }
      } else {
        if (isTableStart) {
          // เจอจุดเริ่มตาราง -> บันทึก Block ข้อความก่อนหน้านี้เก็บไว้ก่อน
          if (currentBlock.length > 0)
            blocks.push({ type: "text", content: currentBlock });
          currentBlock = [line]; // เริ่มเก็บข้อมูลตาราง
          isTableMode = true;
        } else {
          currentBlock.push(line);
        }
      }
    }
    // เก็บตก Block สุดท้าย
    if (currentBlock.length > 0)
      blocks.push({
        type: isTableMode ? "table" : "text",
        content: currentBlock,
      });

    // 🎨 ส่วนแสดงผล (Render)
    return (
      <div className="text-sm text-gray-700 leading-relaxed space-y-4">
        {blocks.map((block, idx) => {
          // กรณีเป็นตาราง
          if (block.type === "table") {
            const tableLines = block.content;
            const TableNode = (
              <table className="min-w-full divide-y divide-gray-200 text-sm my-2">
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableLines.map((row, rIdx) => {
                    if (row.trim().includes("---") || !row.includes("|"))
                      return null;
                    const cells = row.split("|").filter((c) => c.trim() !== "");
                    return (
                      <tr
                        key={rIdx}
                        className={
                          rIdx === 0
                            ? "bg-blue-50 font-bold text-blue-900"
                            : "hover:bg-gray-50"
                        }
                      >
                        {cells.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className="px-4 py-2 border-r last:border-0 border-gray-200 whitespace-pre-wrap"
                          >
                            {renderInlineContent(cell.trim())}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
            return (
              <div
                key={idx}
                className="relative group border border-gray-200 rounded-lg shadow-sm overflow-hidden"
              >
                <div className="flex justify-end bg-gray-50 px-2 py-1 border-b border-gray-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onZoom && onZoom(TableNode);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Maximize2 size={12} /> ขยาย
                  </button>
                </div>
                <div className="overflow-x-auto max-h-64">{TableNode}</div>
              </div>
            );
          }
          // กรณีเป็นข้อความปกติ
          else {
            return (
              <div key={idx} className="space-y-1">
                {block.content.map((line, lIdx) => (
                  <div key={lIdx} className="min-h-[1.2em]">
                    {renderInlineContent(line)}
                  </div>
                ))}
              </div>
            );
          }
        })}
      </div>
    );
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border transition-all duration-200 ${
        isRead
          ? "border-green-200 bg-green-50/30"
          : "border-gray-200 hover:shadow-md"
      }`}
    >
      <div
        className="p-4 cursor-pointer"
        onClick={onExpand} // 👈 เปลี่ยนเป็น onExpand
      >
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <SystemIcon name={item.system} /> {item.system}
              </span>
              {isRead && (
                <span className="text-xs flex items-center gap-1 font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                  <CheckCircle size={10} /> เน้น
                </span>
              )}
            </div>
            {/* 🟢 แก้ตรงนี้: ใช้ renderInlineContent กับหัวข้อ Topic */}
            <h3 className="text-lg font-bold text-gray-800 leading-tight">
              {renderInlineContent(item.topic)}
            </h3>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Yield:</span>
              <div className="flex space-x-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={`${
                      i < item.yield_score
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* --- 🟢 ปุ่มใหม่: สร้างโจทย์เจาะจง --- */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // กันไม่ให้การ์ดขยาย
                onGenerateSpecific(item);
              }}
              className="flex items-center gap-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2 py-1 rounded text-xs font-bold transition-colors mr-2"
              title="สร้างโจทย์จากหัวข้อนี้"
            >
              <Zap size={14} /> โจทย์
            </button>
            {/* ---------------------------------- */}

            {showAdmin && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(item);
                  }}
                  className="text-blue-400 hover:text-blue-600 p-1"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
            <div className="text-gray-400 hover:text-gray-600">
              {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl animate-in fade-in slide-in-from-top-2 duration-200">
          {item.image && (
            <div className="mb-4 rounded-lg overflow-hidden border border-gray-200 bg-white">
              <img
                src={getImageUrl(item.image)}
                alt={item.topic}
                referrerPolicy="no-referrer"
                className="w-full h-auto"
              />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-800 mb-2">
                <FileText size={16} /> สรุป High-Yield
              </h4>
              {renderSummary(item.summary)}
            </div>
            <div className="flex flex-col justify-between gap-4">
              <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-800 mb-2">
                  <AlertCircle size={16} /> ข้อควรระวัง / เก็งข้อสอบ
                </h4>
                {/* 🟢 แก้ตรงนี้: ใช้ renderInlineContent กับ Exam Tip */}
                <div className="text-sm text-gray-700">
                  {renderInlineContent(
                    item.exam_tip,
                    "font-bold text-amber-900"
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(item.id);
                }}
                className={`w-full py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                  isRead
                    ? "bg-green-100 text-green-700 hover:bg-green-200 border border-green-200"
                    : "bg-gray-800 text-white hover:bg-gray-700 shadow-md hover:shadow-lg"
                }`}
              >
                {isRead ? (
                  <>
                    <CheckCircle size={18} /> เน้น
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/40" />{" "}
                    เน้น
                  </>
                )}
              </button>
              <CommentSection
                db={db}
                appId={appId}
                system={item.system}
                topic={item.topic}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- 🧠 AI Quiz Modal (Prompt + Target System Selector) ---
const AIQuizModal = ({
  isOpen,
  onClose,
  allData,
  savedQuizzes,
  externalQuizData,
}) => {
  const [keyword, setKeyword] = useState("");
  const [mode, setMode] = useState("case");
  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState(null);

  // 🟢 เพิ่มบรรทัดนี้ต่อท้ายครับ:
  const [error, setError] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);

  // State ใหม่: ล็อค System (Default = Auto)
  const [targetSystem, setTargetSystem] = useState("Auto");

  // ดึงรายชื่อ System ทั้งหมดที่มีในเนื้อหา มาทำ Dropdown
  const availableSystems = useMemo(() => {
    if (!allData) return [];
    const systems = new Set(allData.map((d) => d.system || "General"));
    return Array.from(systems).sort();
  }, [allData]);

  // State Preview
  const [isExpanded, setIsExpanded] = useState(false);
  const [previewAnswer, setPreviewAnswer] = useState(null);

  // State Reference
  const [examRef, setExamRef] = useState(
    () => localStorage.getItem("medGuide_examRef") || ""
  );

  useEffect(() => localStorage.setItem("medGuide_examRef", examRef), [examRef]);
  useEffect(() => {
    if (isOpen && externalQuizData) {
      setQuizData(externalQuizData);
    }
  }, [isOpen, externalQuizData]);

  const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
  useEffect(() => {
    if (!isOpen) {
      setQuizData(null);
      setKeyword("");
      setTargetSystem("Auto"); // Reset เป็น Auto ทุกครั้งที่เปิดใหม่
    }
  }, [isOpen]);

  useEffect(() => {
    setIsExpanded(true);
    setPreviewAnswer(null);
  }, [quizData]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    // 🔒 Validation: ถ้าเป็น Auto (ไม่ระบุหมวด) และไม่พิมพ์อะไรเลย -> ห้ามไปต่อ
    if (!keyword.trim() && targetSystem === "Auto") {
      alert("กรุณาพิมพ์หัวข้อ หรือเลือกหมวดหมู่ก่อนครับ");
      return;
    }

    setLoading(true);
    setQuizData(null);

    let contextDocs = [];

    // 🎲 CASE 1: Random Mode (เลือกหมวด + ไม่พิมพ์ Keyword) -> สุ่มเนื้อหา
    if (!keyword.trim() && targetSystem !== "Auto") {
      console.log("Random Mode Activated for:", targetSystem);
      let systemDocs = (allData || []).filter((d) => d.system === targetSystem);

      if (systemDocs.length === 0) {
        alert(
          `ยังไม่มีเนื้อหาในหมวด ${targetSystem} เลยครับ AI ไม่รู้จะออกอะไร`
        );
        setLoading(false);
        return;
      }
      // Shuffle และหยิบมา 10 เรื่อง
      const shuffled = systemDocs.sort(() => 0.5 - Math.random());
      contextDocs = shuffled.slice(0, 3);
    }
    // 🔍 CASE 2: Search Mode (พิมพ์ Keyword) -> ค้นหาเนื้อหา
    else {
      let allDocs = allData || [];
      const scoredDocs = allDocs.map((doc) => {
        let score = 0;
        const text = (
          doc.topic +
          " " +
          doc.summary +
          " " +
          doc.system
        ).toLowerCase();
        const searchTerms = keyword.toLowerCase().split(/\s+/);
        searchTerms.forEach((term) => {
          if (term.length < 2) return;
          if (text.includes(term)) score += 1;
        });
        return { doc, score };
      });

      scoredDocs.sort((a, b) => b.score - a.score);
      contextDocs = scoredDocs.slice(0, 5).map((item) => item.doc);
      if (contextDocs.length === 0) contextDocs = allDocs.slice(0, 5);
    }

    const contextText = contextDocs
      .map((d) => `ID: ${d.id} | Topic: ${d.topic}\nContent: ${d.summary}`)
      .join("\n----------------\n");

    try {
      // 1. จัดการ User Request
      const userRequest = keyword.trim()
        ? `User Keyword: "${keyword}"`
        : `User Keyword: NONE (Randomly select a HIGH-YIELD topic from the provided context)`;

      // 2. จัดการ System (Auto หรือ Force)
      const systemInstruction =
        targetSystem === "Auto"
          ? "Classify this question into the most appropriate Medical System based on content."
          : `FORCE CLASSIFY this question as "${targetSystem}".`;

      // 3. จัดการ Mode (Case หรือ Rapid) 🟢 แยกโหมดชัดเจนเหมือนเดิม
      // 🟢 3. จัดการ Mode (เพิ่มโหมด Expert วิเคราะห์หลายชั้น)
      let modeInstruction = "";
      if (mode === "expert") {
        modeInstruction =
          "Create an EXPERT-LEVEL, Multi-step Clinical Vignette Question. Require deep analytical thinking, combining 2-3 medical concepts (e.g., diagnosis + pathophysiology + management). Mimic USMLE Step 3 / Board Exam difficulty. VERY CHALLENGING.";
      } else if (mode === "case") {
        modeInstruction =
          "Create a Clinical Vignette Question (Detailed Patient presentation: Age, Sex, CC, HPI, PE, Labs -> Question). Mimic NL1/USMLE Step 2 style.";
      } else {
        modeInstruction =
          "Create a Rapid Fire / Fact-Check Question (Short, direct question focusing on high-yield facts, triads, or specific treatments).";
      }

      const prompt = `
        Act as a Senior Thai Medical Professor.
        
        ${userRequest}
        TARGET SYSTEM: ${targetSystem} (${systemInstruction})
        MODE: ${
          mode === "expert"
            ? "Expert Multi-Step"
            : mode === "case"
            ? "Clinical Case"
            : "Rapid Fire"
        }
        
        DATABASE (Source of Truth):
        ${contextText}

        ${
          examRef
            ? `REFERENCE STYLE (Mimic this style/difficulty): \n${examRef}`
            : ""
        }

        TASK:
        1. Analyze the Context & Reference.
        2. ${modeInstruction}
        3. ${systemInstruction}
        4. Explanation in Thai (Focus on Mechanism/Pathophysiology).
        5. MUST provide exactly 5 options (A, B, C, D, E) and strictly RANDOMIZE the correct answer position so it is not always A or B.
        
        ⚠️ CRITICAL INSTRUCTION (Anti-Hallucination): 
        - DOUBLE CHECK that the "correctLetter" matches the actual correct option text.
        - In the "explanation", START by explicitly stating the correct answer (e.g., "ตอบข้อ A: เพราะ...").

        OUTPUT JSON format:
        {
          "question": "...",
          "options": ["Option A", "Option B", "Option C", "Option D", "Option E"],
          "correctLetter": "A",  // Use "A", "B", "C", "D", or "E" (Do NOT use Number Index)
          "explanation": "ตอบข้อ [Letter]: ...",
          "system": "${targetSystem === "Auto" ? "General" : targetSystem}" 
        }
      `;

      const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE",
          },
        ],
      };

      // 🟢 4. เลือกรุ่น AI: โหมดยากใช้ 2.5-pro (เน้นฉลาด) / โหมด Case & Rapid ใช้ 2.5-flash (เน้นเร็ว)
      const targetModel =
        mode === "expert" ? "gemini-2.5-pro" : "gemini-2.5-flash";

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      if (data.error) throw new Error(data.error.message);

      // 🟢 2. ดักจับและแสดงเหตุผลถ้าโดน AI บล็อก (จะได้รู้ตัว)
      if (data.promptFeedback && data.promptFeedback.blockReason) {
        throw new Error(
          "AI ปฏิเสธการตอบคำถามเนื่องจากติดเซ็นเซอร์: " +
            data.promptFeedback.blockReason
        );
      }
      if (data.candidates && data.candidates[0]?.finishReason === "SAFETY") {
        throw new Error(
          "AI สร้างโจทย์ไม่สำเร็จเนื่องจากคำศัพท์แพทย์ถูกมองว่าเป็นเนื้อหาไม่เหมาะสม (Safety)"
        );
      }
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error(
          "AI ไม่ตอบสนอง (Model อาจมีปัญหา หรือไม่รองรับชื่อรุ่นนี้)"
        );
      }

      const textResponse = data.candidates[0].content.parts[0].text;
      const match = textResponse.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI ไม่ได้ส่ง JSON กลับมา");
      const jsonString = match[0];
      const generatedQuiz = JSON.parse(jsonString);

      // 🟢 SELF-CORRECTION: แปลง Letter (A,B,C) -> Index (0,1,2) ให้ App เข้าใจ
      const letterMap = {
        A: 0,
        B: 1,
        C: 2,
        D: 3,
        E: 4,
        a: 0,
        b: 1,
        c: 2,
        d: 3,
        e: 4,
      };

      if (
        generatedQuiz.correctLetter &&
        letterMap[generatedQuiz.correctLetter] !== undefined
      ) {
        generatedQuiz.correctIndex = letterMap[generatedQuiz.correctLetter];
      } else if (generatedQuiz.correctIndex === undefined) {
        // Fallback: ถ้า AI ลืมส่งมาทั้งคู่ (ยากที่จะเกิด) ให้ default เป็น 0
        generatedQuiz.correctIndex = 0;
      }

      setQuizData(generatedQuiz);
    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 🆕 ฟังก์ชันใหม่: สร้างโจทย์เจาะจง + สั่ง AI ได้
  // ==========================================
  const handlecific = async (topicData) => {
    // 1. เด้งถาม User ก่อนว่าอยากเน้นอะไร? (ใช้ window.prompt ง่ายสุดครับ)
    const userFocus = window.prompt(
      `หัวข้อ: ${topicData.topic}\n\nคุณต้องการเน้นจุดไหนเป็นพิเศษไหม?\n(เช่น: การวินิจฉัย, ยารักษา, กลไกการเกิดโรค, Side Effect)`,
      "เน้นการวินิจฉัยและการแยกโรค (Diagnosis & DDx)" // ค่า Default
    );

    // ถ้ากด Cancel ก็ยกเลิกการทำรายการ
    if (userFocus === null) return;

    // 2. เปิดหน้า Loading
    setShowAIModal(true);
    setLoading(true);
    setQuizData(null);

    try {
      // --- เตรียมข้อมูล (Context) แค่ 1 อัน (ประหยัดสุดๆ) ---
      const contextText = `Topic: ${topicData.topic}\nSystem: ${topicData.system}\nContent: ${topicData.summary}`;

      // --- สร้างคำสั่ง (Prompt) ---
      // เอาสิ่งที่ User พิมพ์ (userFocus) ไปสั่ง AI โดยตรง
      const prompt = `
          Act as a Senior Medical Professor.
          Task: Create 1 multiple-choice question (Clinical Case/Vignette) specifically about "${topicData.topic}".
          
          Strictly use this context:
          ${contextText}

          YOUR INSTRUCTION:
          The user wants to focus on: "${userFocus}". 
          (Please create a question that tests this specific aspect).

          Requirements:
          - 5 Options (A-E).
          - Make it challenging suitable for medical students.
          - Explanation must explain why the correct answer is right and others are wrong.

          Output JSON format only:
          { "question": "...", "options": ["A","B","C","D","E"], "correctLetter": "A", "explanation": "...", "system": "${topicData.system}" }
        `;

      // 3. ยิง API (ใช้รุ่น 2.0 Flash หรือ 3 Flash ตามที่มี)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/modelsgemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      const data = await response.json();

      // ดัก Error
      if (data.error) throw new Error(data.error.message);
      if (!data.candidates || data.candidates.length === 0)
        throw new Error("AI No Response");

      // แปลงข้อมูล
      const textResponse = data.candidates[0].content.parts[0].text;
      const match = textResponse.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI ไม่ได้ส่ง JSON กลับมา");
      const jsonString = match[0];
      const generatedQuiz = JSON.parse(jsonString);

      // Map ตัวเลือก A->0
      const letterMap = { A: 0, B: 1, C: 2, D: 3, E: 4 };
      generatedQuiz.correctIndex = letterMap[generatedQuiz.correctLetter] ?? 0;

      setQuizData(generatedQuiz);
    } catch (err) {
      console.error("Error:", err);
      alert("เกิดข้อผิดพลาด: " + err.message);
      setShowAIModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!quizData) return;
    try {
      const db = getFirestore();
      // 🟢 ใช้ System จาก QuizData (ซึ่ง AI จะใส่ตามที่เรา Force ไปใน Prompt)
      const finalSystem = quizData.system || targetSystem || "General";

      await addDoc(collection(db, "quizzes"), {
        ...quizData,
        system: finalSystem,
        createdAt: new Date().toISOString(),
        mode: mode,
      });
      alert(`✅ บันทึกเข้าหมวด ${finalSystem} เรียบร้อย!`);
      onClose();
    } catch (err) {
      alert("บันทึกไม่สำเร็จ: " + err.message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex justify-between items-center text-white">
          <h3 className="font-bold flex items-center gap-2">
            <Brain /> AI Quiz Creator
          </h3>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
          {!quizData && (
            <div className="space-y-4 animate-in slide-in-from-bottom-2">
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setMode("case")}
                  className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
                    mode === "case"
                      ? "bg-white shadow text-indigo-600"
                      : "text-gray-500"
                  }`}
                >
                  Clinical Case
                </button>
                <button
                  onClick={() => setMode("rapid")}
                  className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
                    mode === "rapid"
                      ? "bg-white shadow text-pink-600"
                      : "text-gray-500"
                  }`}
                >
                  Rapid Fire
                </button>
                {/* 🟢 ปุ่มใหม่: โหมดยากพิเศษ */}
                <button
                  onClick={() => setMode("expert")}
                  className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
                    mode === "expert"
                      ? "bg-white shadow text-red-600 scale-105 border border-red-100"
                      : "text-gray-500"
                  }`}
                >
                  Super Hard 🔥
                </button>
              </div>

              {/* 🟢 System Selector (Target) */}
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                <label className="text-xs font-bold text-blue-600 mb-1 block">
                  ต้องการบันทึกในหมวดไหน?
                </label>
                <select
                  value={targetSystem}
                  onChange={(e) => setTargetSystem(e.target.value)}
                  className="w-full p-2 rounded-lg border-blue-200 focus:ring-2 focus:ring-blue-400 outline-none text-sm font-bold text-gray-700"
                >
                  <option value="Auto">✨ Auto (ให้ AI ตัดสินใจเอง)</option>
                  {availableSystems.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Input Prompt */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">
                  <Zap size={12} className="inline mr-1 text-yellow-500" />
                  คำสั่งสร้างโจทย์ (Prompt)
                </label>
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder={
                    targetSystem !== "Auto"
                      ? "ปล่อยว่างได้เลย (AI จะสุ่มเรื่องในหมวดนี้ให้) หรือพิมพ์เพื่อเจาะจง..."
                      : "พิมพ์หัวข้อที่ต้องการ..."
                  }
                  className="w-full border-2 p-3 rounded-xl focus:border-indigo-500 outline-none font-bold text-lg"
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  autoFocus
                />
              </div>

              {/* Reference Box */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-gray-500 flex items-center gap-1">
                    <FileText size={14} /> Reference / ข้อสอบเก่า
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">
                      {examRef.length.toLocaleString()} chars
                    </span>
                    {examRef && (
                      <button
                        onClick={() => setExamRef("")}
                        className="text-[10px] text-red-500 hover:bg-red-50 px-2 py-1 rounded"
                      >
                        ล้างค่า
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  value={examRef}
                  onChange={(e) => setExamRef(e.target.value)}
                  placeholder="วางข้อสอบเก่าที่นี่..."
                  className="w-full border p-3 rounded-lg focus:border-indigo-500 outline-none text-xs text-gray-600 font-mono h-20 transition-all focus:h-40"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading || (!keyword && targetSystem === "Auto")}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-lg flex justify-center items-center gap-2"
              >
                {loading ? (
                  <RefreshCw className="animate-spin" />
                ) : (
                  <Zap size={18} />
                )}
                {loading ? "AI กำลังทำงาน..." : "สร้างโจทย์"}
              </button>
              {/* 🟢 วางโค้ดแสดง Error ตรงนี้ครับ (ต่อจากปุ่มเลย) */}
              {error && (
                <div className="p-3 bg-red-100 text-red-700 text-sm rounded-lg border border-red-200 mt-2 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* Result Area */}
          {quizData && (
            <div className="animate-in fade-in space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-start gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                        Generated
                      </span>
                      <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                        {quizData.system || targetSystem}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800 text-sm md:text-base leading-relaxed">
                      {renderMath(quizData.question)}
                    </h3>
                  </div>
                  <div className="text-gray-400">
                    {isExpanded ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 animate-in slide-in-from-top-1 border-t border-gray-100 bg-gray-50/30">
                    <div className="space-y-2 mt-3">
                      {/* 🟢 แก้ไข: เช็คก่อนว่ามี options ไหม ค่อยวนลูป */}
                      {quizData.options && quizData.options.length > 0 ? (
                        quizData.options.map((opt, idx) => {
                          let btnClass =
                            "border-gray-200 bg-white hover:bg-gray-50 text-gray-600";
                          const isAnswered = previewAnswer !== null;

                          if (isAnswered) {
                            if (idx === quizData.correctIndex)
                              btnClass =
                                "bg-green-100 border-green-300 text-green-800 font-bold";
                            else if (
                              idx === previewAnswer &&
                              idx !== quizData.correctIndex
                            )
                              btnClass =
                                "bg-red-100 border-red-300 text-red-800";
                            else btnClass = "opacity-50";
                          }

                          return (
                            <button
                              key={idx}
                              disabled={isAnswered}
                              onClick={() => setPreviewAnswer(idx)}
                              className={`w-full text-left p-3 rounded-lg border transition-all text-sm flex items-center gap-3 ${btnClass}`}
                            >
                              <div
                                className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${
                                  isAnswered && idx === quizData.correctIndex
                                    ? "bg-green-500 border-green-500 text-white"
                                    : isAnswered && idx === previewAnswer
                                    ? "bg-red-500 border-red-500 text-white"
                                    : "bg-white border-gray-300 text-gray-500"
                                }`}
                              >
                                {String.fromCharCode(65 + idx)}
                              </div>
                              {renderMath(opt)}
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-red-500 bg-red-50 rounded-lg border border-red-200">
                          ⚠️ ข้อมูลตัวเลือกไม่ครบถ้วนจาก AI (กรุณากด "ทิ้ง"
                          แล้วสร้างใหม่)
                        </div>
                      )}
                    </div>
                    {previewAnswer !== null && (
                      <div className="mt-4 p-3 bg-blue-50 text-blue-900 text-sm rounded-lg border border-blue-100 animate-in fade-in">
                        <strong>💡 เฉลยละเอียด:</strong>{" "}
                        {renderMath(quizData.explanation)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setQuizData(null)}
                  className="flex-1 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-bold"
                >
                  ทิ้ง (ทำใหม่)
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-lg"
                >
                  บันทึก ({quizData.system || targetSystem})
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- 📚 Quiz Bank Component (Interactive V2) ---
// --- 📚 Quiz Bank Component (V3: Search & Filter & Interactive) ---
const QuizBank = ({ quizzes, db }) => {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});

  // 🟢 State ใหม่: สำหรับค้นหาและกรอง
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSystem, setFilterSystem] = useState("All Systems");

  // 🟢 State สำหรับโหมดสุ่มโจทย์
  const [randomQuiz, setRandomQuiz] = useState(null);
  const [randomAnswer, setRandomAnswer] = useState(null);

  // ฟังก์ชันสุ่มโจทย์จาก Pool ที่ถูก Filter แล้ว
  const handleRandomize = () => {
    if (filteredQuizzes.length === 0) {
      alert("ไม่มีโจทย์ในหมวดนี้ให้สุ่มครับ ลองเปลี่ยน Filter ดูนะ");
      return;
    }
    const randomIndex = Math.floor(Math.random() * filteredQuizzes.length);
    setRandomQuiz(filteredQuizzes[randomIndex]);
    setRandomAnswer(null); // รีเซ็ตคำตอบทุกครั้งที่สุ่มใหม่
  };

  // ดึงรายชื่อ System ทั้งหมดที่มีในคลังออกมา (ป้องกันปุ่มซ้ำ)
  const availableSystems = useMemo(() => {
    const systems = new Set(quizzes.map((q) => q.system || "General"));

    // 🟢 แก้ Bug: ลบชื่อ "All Systems" ออกจาก Set ก่อน (ถ้ามีหลงมา)
    // เพราะเราจะใส่ "All Systems" ไว้ตัวแรกสุดเองอยู่แล้ว
    systems.delete("All Systems");

    return ["All Systems", ...Array.from(systems).sort()];
  }, [quizzes]);

  // Logic การกรองโจทย์
  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch = (
      quiz.question +
      quiz.explanation +
      (quiz.topicKeyword || "")
    )
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesSystem =
      filterSystem === "All Systems" ||
      (quiz.system || "General") === filterSystem;
    return matchesSearch && matchesSystem;
  });

  const handleDelete = async (id) => {
    if (!confirm("ยืนยันลบโจทย์ข้อนี้?")) return;
    await deleteDoc(doc(db, "quizzes", id));
  };

  const startEdit = (quiz) => {
    setEditingId(quiz.id);
    setEditForm({ ...quiz });
  };

  const saveEdit = async () => {
    await updateDoc(doc(db, "quizzes", editingId), editForm);
    setEditingId(null);
  };

  const handleSelectAnswer = (quizId, optionIndex) => {
    if (userAnswers[quizId] !== undefined) return;
    setUserAnswers((prev) => ({ ...prev, [quizId]: optionIndex }));
  };

  const resetQuiz = (quizId, e) => {
    e.stopPropagation();
    setUserAnswers((prev) => {
      const newState = { ...prev };
      delete newState[quizId];
      return newState;
    });
  };

  if (quizzes.length === 0)
    return (
      <div className="text-center p-10 text-gray-400">
        <Brain size={48} className="mx-auto mb-3 opacity-20" />
        <p>ยังไม่มีโจทย์ในคลัง กดปุ่ม AI เพื่อสร้างเลย!</p>
      </div>
    );

  return (
    <div className="space-y-4 p-4 pb-20 max-w-3xl mx-auto">
      {/* 🟢 ส่วนควบคุมใหม่: Search & Filter */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 sticky top-0 z-10 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="ค้นหาโจทย์ (อาการ, โรค, keyword)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 text-sm"
            />
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          )}
        </div>
        {/* 🟢 ปุ่มสุ่มโจทย์ */}
        <button
          onClick={handleRandomize}
          className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          🎲 สุ่มทำโจทย์ 1 ข้อ (จาก {filteredQuizzes.length} ข้อ)
        </button>
        {/* Filter Tags (Pills) */}
        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {availableSystems.map((sys) => (
            <button
              key={sys}
              onClick={() => setFilterSystem(sys)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                filterSystem === sys
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {sys}
            </button>
          ))}
        </div>

        <div className="text-[10px] text-gray-400 font-bold text-right">
          แสดง {filteredQuizzes.length} จาก {quizzes.length} ข้อ
        </div>
      </div>

      {/* 🟢 List รายการโจทย์ (Loop จาก filteredQuizzes) */}
      {filteredQuizzes.length === 0 ? (
        <div className="text-center p-10 text-gray-400">
          <p>ไม่พบโจทย์ที่ค้นหา</p>
          {(searchTerm || filterSystem !== "All Systems") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setFilterSystem("All Systems");
              }}
              className="text-indigo-500 underline mt-2 text-sm"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      ) : (
        filteredQuizzes.map((quiz) => {
          const isAnswered = userAnswers[quiz.id] !== undefined;
          const userSelected = userAnswers[quiz.id];
          const isCorrect = userSelected === quiz.correctIndex;

          return (
            <div
              key={quiz.id}
              className={`bg-white border rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all ${
                isAnswered
                  ? isCorrect
                    ? "border-green-200 bg-green-50/20"
                    : "border-red-200 bg-red-50/20"
                  : "border-gray-200"
              }`}
            >
              {editingId === quiz.id ? (
                // --- Edit Mode (คงเดิม) ---
                <div className="p-4 space-y-3 bg-indigo-50">
                  <label className="text-xs font-bold text-indigo-600">
                    แก้ไขคำถาม:
                  </label>
                  <textarea
                    className="w-full p-2 border rounded"
                    value={editForm.question}
                    onChange={(e) =>
                      setEditForm({ ...editForm, question: e.target.value })
                    }
                  />
                  <div className="grid grid-cols-1 gap-2">
                    {editForm.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {/* 🟢 ปุ่มเลือกข้อถูก (Radio) */}
                        <button
                          onClick={() =>
                            setEditForm({ ...editForm, correctIndex: idx })
                          }
                          className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                            idx === editForm.correctIndex
                              ? "border-green-500 bg-green-500 text-white"
                              : "border-gray-300 text-gray-300 hover:border-gray-400"
                          }`}
                          title="คลิกเพื่อตั้งเป็นข้อถูก"
                        >
                          {idx === editForm.correctIndex ? (
                            <Check size={16} />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-gray-200" />
                          )}
                        </button>

                        {/* ช่องแก้ข้อความ */}
                        <input
                          className={`flex-1 p-2 border rounded ${
                            idx === editForm.correctIndex
                              ? "border-green-500 bg-green-50 font-bold text-green-800"
                              : "border-gray-300"
                          }`}
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...editForm.options];
                            newOpts[idx] = e.target.value;
                            setEditForm({ ...editForm, options: newOpts });
                          }}
                          placeholder={`ตัวเลือก ${String.fromCharCode(
                            65 + idx
                          )}`}
                        />
                      </div>
                    ))}
                  </div>
                  <label className="text-xs font-bold text-indigo-600">
                    เฉลยละเอียด:
                  </label>
                  <textarea
                    className="w-full p-2 border rounded text-sm"
                    value={editForm.explanation}
                    onChange={(e) =>
                      setEditForm({ ...editForm, explanation: e.target.value })
                    }
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 text-gray-500"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={saveEdit}
                      className="px-3 py-1 bg-indigo-600 text-white rounded"
                    >
                      บันทึก
                    </button>
                  </div>
                </div>
              ) : (
                // --- View / Play Mode (คงเดิม) ---
                <div
                  onClick={() =>
                    setExpandedId(expandedId === quiz.id ? null : quiz.id)
                  }
                  className="cursor-pointer"
                >
                  <div className="p-4 flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {/* System Badge */}
                        <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                          {quiz.system || "General"}
                        </span>
                        {/* Mode Badge */}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            quiz.mode === "case"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-pink-100 text-pink-700"
                          }`}
                        >
                          {quiz.mode || "Quiz"}
                        </span>
                        {/* Result Badge */}
                        {isAnswered && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              isCorrect
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {isCorrect ? "CORRECT" : "WRONG"}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-gray-800 text-sm md:text-base leading-relaxed">
                        {quiz.question}
                      </h3>
                    </div>
                    <div className="flex flex-col gap-1">
                      {isAnswered && (
                        <button
                          onClick={(e) => resetQuiz(quiz.id, e)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="ทำใหม่อีกครั้ง"
                        >
                          <RefreshCw size={16} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(quiz);
                        }}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(quiz.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Area */}
                  {expandedId === quiz.id && (
                    <div
                      className="px-4 pb-4 animate-in fade-in"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="space-y-2 mt-2 pl-0 md:pl-4 border-l-0 md:border-l-2 border-indigo-100">
                        {quiz.options.map((opt, idx) => {
                          let btnClass =
                            "border-gray-200 hover:bg-gray-50 text-gray-600";
                          if (isAnswered) {
                            if (idx === quiz.correctIndex)
                              btnClass =
                                "bg-green-100 border-green-300 text-green-800 font-bold";
                            else if (
                              idx === userSelected &&
                              idx !== quiz.correctIndex
                            )
                              btnClass =
                                "bg-red-100 border-red-300 text-red-800";
                            else btnClass = "opacity-50 border-gray-100";
                          }
                          return (
                            <button
                              key={idx}
                              disabled={isAnswered}
                              onClick={() => handleSelectAnswer(quiz.id, idx)}
                              className={`w-full text-left p-3 rounded-lg border transition-all text-sm mb-1 flex items-center gap-2 ${btnClass}`}
                            >
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${
                                  isAnswered && idx === quiz.correctIndex
                                    ? "bg-green-500 border-green-500 text-white"
                                    : isAnswered && idx === userSelected
                                    ? "bg-red-500 border-red-500 text-white"
                                    : "border-gray-300"
                                }`}
                              >
                                {String.fromCharCode(65 + idx)}
                              </div>
                              {opt}
                              {isAnswered && idx === quiz.correctIndex && (
                                <CheckCircle
                                  size={14}
                                  className="ml-auto text-green-600"
                                />
                              )}
                              {isAnswered &&
                                idx === userSelected &&
                                idx !== quiz.correctIndex && (
                                  <X
                                    size={14}
                                    className="ml-auto text-red-500"
                                  />
                                )}
                            </button>
                          );
                        })}
                        {isAnswered && (
                          <div className="mt-4 p-3 bg-blue-50/80 text-blue-900 text-sm rounded-lg leading-relaxed border border-blue-100 animate-in slide-in-from-top-1">
                            <strong className="flex items-center gap-1 mb-1">
                              💡 คำอธิบาย:
                            </strong>
                            {renderMath(quiz.explanation)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
      {/* 🟢 หน้าต่าง Pop-up สุ่มโจทย์ (Flashcard Mode) */}
      {randomQuiz && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setRandomQuiz(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold flex items-center gap-2">
                <Brain size={18} /> Practice Mode
              </h3>
              <button
                onClick={() => setRandomQuiz(null)}
                className="hover:bg-white/20 p-1 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[75vh] custom-scrollbar">
              <div className="flex gap-2 mb-3">
                <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-1 rounded uppercase font-bold">
                  {randomQuiz.system || "General"}
                </span>
                <span className="bg-pink-100 text-pink-700 text-[10px] px-2 py-1 rounded uppercase font-bold">
                  {randomQuiz.mode || "Quiz"}
                </span>
              </div>

              <h3 className="font-bold text-gray-800 text-lg leading-relaxed mb-6">
                {renderMath(randomQuiz.question)}
              </h3>

              <div className="space-y-2">
                {randomQuiz.options?.map((opt, idx) => {
                  const isAnswered = randomAnswer !== null;
                  const isCorrect = idx === randomQuiz.correctIndex;
                  const isSelected = idx === randomAnswer;

                  let btnClass =
                    "border-gray-200 bg-white hover:bg-gray-50 text-gray-700";
                  if (isAnswered) {
                    if (isCorrect)
                      btnClass =
                        "bg-green-100 border-green-400 text-green-900 font-bold shadow-sm";
                    else if (isSelected && !isCorrect)
                      btnClass = "bg-red-50 border-red-300 text-red-800";
                    else btnClass = "opacity-40 border-gray-100";
                  }

                  return (
                    <button
                      key={idx}
                      disabled={isAnswered}
                      onClick={() => setRandomAnswer(idx)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${btnClass}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm ${
                          isAnswered && isCorrect
                            ? "bg-green-500 text-white"
                            : isAnswered && isSelected
                            ? "bg-red-500 text-white"
                            : "bg-gray-100 text-gray-500 border border-gray-300"
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span className="text-sm">{renderMath(opt)}</span>
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {randomAnswer !== null && (
                <div className="mt-6 p-4 bg-blue-50 text-blue-900 text-sm rounded-xl border border-blue-100 animate-in slide-in-from-top-2">
                  <div className="font-bold mb-2 flex items-center gap-2">
                    {randomAnswer === randomQuiz.correctIndex ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle size={16} /> เก่งมาก! ตอบถูก
                      </span>
                    ) : (
                      <span className="text-red-500 flex items-center gap-1">
                        <X size={16} /> เสียใจด้วย ตอบผิด
                      </span>
                    )}
                  </div>
                  <strong className="text-blue-800 text-xs uppercase tracking-wider block mb-1">
                    💡 คำอธิบาย:
                  </strong>
                  {renderMath(randomQuiz.explanation)}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-2">
              <button
                onClick={() => setRandomQuiz(null)}
                className="flex-1 py-2.5 text-gray-500 hover:bg-gray-200 bg-gray-100 rounded-xl font-bold transition-colors"
              >
                ปิด
              </button>
              {randomAnswer !== null && (
                <button
                  onClick={handleRandomize}
                  className="flex-1 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-bold shadow-md transition-all flex justify-center items-center gap-2"
                >
                  🎲 ข้อต่อไป <ChevronUp className="rotate-90" size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// --- 3. Main App ---
export default function MedGuideApp() {
  // 🟢 1. Dark Mode Logic (วางบรรทัดแรกสุดของฟังก์ชัน)
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark"
  );

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);
  const [user, setUser] = useState(null);
  const [zoomContent, setZoomContent] = useState(null);
  const [showAIQuiz, setShowAIQuiz] = useState(false); // 🧠 State เปิดปิด AI Quiz Modal
  const [knowledgeBase, setKnowledgeBase] = useState([]);
  // --- 🆕 State สำหรับส่งข้อมูลโจทย์เจาะจงไปที่ Modal ---
  const [specificQuizData, setSpecificQuizData] = useState(null);

  // --- 🆕 ฟังก์ชันสร้างโจทย์เจาะจง (แบบไม่ซ้ำ) ---
  const handleGenerateSpecific = async (topicData) => {
    // 1. ดึงประวัติคำถามเก่าของหัวข้อนี้
    const previousQuestions = questionHistory[topicData.id] || [];

    // 2. ถาม User (Prompt)
    const defaultFocus = "Rapid Fire (ถามตรง-ตอบตรง เน้น Key Concept)";
    const userFocus = window.prompt(
      `หัวข้อ: ${topicData.topic}\n\nต้องการเน้นจุดไหนเป็นพิเศษไหม?`,
      defaultFocus
    );
    if (userFocus === null) return;

    setSpecificQuizData(null);

    setShowAIQuiz(true);

    try {
      const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

      const contextText = `Topic: ${topicData.topic}\nSystem: ${topicData.system}\nContent: ${topicData.summary}`;

      // 🚫 สร้างรายการ "ห้ามถาม" (ส่งไปแค่ 3 ข้อล่าสุดพอครับ เดี๋ยวเปลือง Token)
      const avoidList = previousQuestions
        .slice(-3)
        .map((q, i) => `${i + 1}. ${q}`)
        .join("\n");

      // 📝 Prompt แบบกันซ้ำ
      const prompt = `
      Act as a Senior Medical Professor.
      Task: Create 1 multiple-choice question in "Rapid Fire" style specifically about "${topicData.topic}".
      
      Style Guide:
      - Question should be direct and concise.
      - Focus on high-yield facts.
      
      MUST provide exactly 5 options (A, B, C, D, E) and strictly RANDOMIZE the correct answer position so it is not always A or B.
      
      ⛔ ANTI-REPETITION RULE (IMPORTANT):
      Do NOT ask about the same concepts as these previous questions:
      ${avoidList}
      (Please find a DIFFERENT angle, symptom, or treatment to ask about.)

      Context:
      ${contextText}

      USER FOCUS: "${userFocus}"

      Output JSON only:
      { "question": "...", "options": ["A","B","C","D","E"], "correctLetter": "<A, B, C, D, or E>", "explanation": "...", "system": "${topicData.system}" }
    `;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      const data = await response.json();
      if (!data.candidates) throw new Error("AI No Response");

      const textResponse = data.candidates[0].content.parts[0].text;
      const match = textResponse.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI ไม่ได้ส่ง JSON กลับมา");
      const jsonString = match[0];
      const generatedQuiz = JSON.parse(jsonString);

      const letterMap = { A: 0, B: 1, C: 2, D: 3, E: 4 };
      generatedQuiz.correctIndex = letterMap[generatedQuiz.correctLetter] ?? 0;

      // ✅ บันทึกคำถามใหม่ลงในประวัติ (เพื่อกันซ้ำรอบหน้า)
      setQuestionHistory((prev) => ({
        ...prev,
        [topicData.id]: [...(prev[topicData.id] || []), generatedQuiz.question],
      }));

      setSpecificQuizData(generatedQuiz);
      setShowAIQuiz(true);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };
  // 🧠 ความจำ: เก็บประวัติคำถามของแต่ละหัวข้อ { "TopicID": ["คำถาม1", "คำถาม2"] }
  const [questionHistory, setQuestionHistory] = useState({});
  const [readStatus, setReadStatus] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const [notification, setNotification] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [jsonText, setJsonText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSystem, setSelectedSystem] = useState("All Systems");
  const [minYield, setMinYield] = useState(3);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showHelp, setShowHelp] = React.useState(false);
  // --- 🧩 Quiz Bank State (ส่วนเพิ่มใหม่) ---
  const [activeTab, setActiveTab] = useState("knowledge"); // 'knowledge' = หน้าอ่านสรุป, 'quiz' = หน้าคลังข้อสอบ
  const [quizzes, setQuizzes] = useState([]); // ตัวแปรเก็บโจทย์ทั้งหมด
  // 🟢 State ใหม่: เก็บคำตอบตอน Preview (แก้ชื่อตัวแปร dependency เป็น quizzes)
  const [previewAnswers, setPreviewAnswers] = useState({});

  useEffect(() => {
    setPreviewAnswers({});
  }, [quizzes]);

  // โหลดโจทย์จาก Firebase (Realtime Update)
  useEffect(() => {
    // เช็คว่ามี db หรือยัง (ถ้า db ประกาศไว้นอก function App ก็ใช้ได้เลย)
    if (typeof db === "undefined" || !db) return;

    const q = query(collection(db, "quizzes"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const quizList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setQuizzes(quizList);
    });
    return () => unsubscribe();
  }, []);
  const [newTopic, setNewTopic] = useState({
    system: "Nervous System",
    topic: "",
    yield_score: 5,
    keywords: "",
    summary: "",
    exam_tip: "",
    image: "",
  });
  // 🟢 เพิ่ม State สำหรับเก็บ ID ของ Topic ที่เปิดอยู่ (เปิดได้ทีละอัน)
  const [expandedTopicId, setExpandedTopicId] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== "undefined" && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const showToast = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  useEffect(() => {
    if (!user) return;
    const topicsRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "topics"
    );
    const q = query(topicsRef, orderBy("system"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setKnowledgeBase(loadedData);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const syncAndCleanup = async () => {
      const topicsRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "topics"
      );
      const snapshot = await getDocs(topicsRef);
      const seen = new Set();
      const duplicatesToDelete = [];
      const existingTopics = new Set();

      snapshot.docs.forEach((doc) => {
        const d = doc.data();
        const key = `${d.system}-${d.topic}`.toLowerCase().trim();
        if (seen.has(key)) {
          duplicatesToDelete.push(doc.id);
        } else {
          seen.add(key);
          existingTopics.add(key);
        }
      });

      const batch = writeBatch(db);
      let hasChanges = false;

      if (duplicatesToDelete.length > 0) {
        console.log(
          `Auto-cleanup: Deleting ${duplicatesToDelete.length} duplicates...`
        );
        duplicatesToDelete.forEach((id) => batch.delete(doc(topicsRef, id)));
        hasChanges = true;
      }

      const toAdd = MASTER_SEED_DATA.filter(
        (seed) =>
          !existingTopics.has(
            `${seed.system}-${seed.topic}`.toLowerCase().trim()
          )
      );

      if (toAdd.length > 0) {
        console.log(`Seeding: Adding ${toAdd.length} new topics...`);
        toAdd.forEach((item) => {
          const newDocRef = doc(
            collection(db, "artifacts", appId, "public", "data", "topics")
          );
          batch.set(newDocRef, item);
        });
        hasChanges = true;
      }

      if (hasChanges) {
        try {
          await batch.commit();
          if (duplicatesToDelete.length > 0) {
            showToast(
              `ระบบลบข้อมูลซ้ำอัตโนมัติ ${duplicatesToDelete.length} รายการ`
            );
          }
        } catch (error) {
          console.error("Sync/Cleanup Failed", error);
        }
      }
    };
    syncAndCleanup();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const progressRef = doc(
      db,
      "artifacts",
      appId,
      "users",
      user.uid,
      "data",
      "progress"
    );
    const unsubscribe = onSnapshot(progressRef, (docSnap) => {
      if (docSnap.exists()) setReadStatus(docSnap.data());
      else setReadStatus({});
    });
    return () => unsubscribe();
  }, [user]);

  const toggleReadStatus = async (itemId) => {
    if (!user) return;
    const updatedStatus = { ...readStatus, [itemId]: !readStatus[itemId] };
    setReadStatus(updatedStatus);
    try {
      await setDoc(
        doc(db, "artifacts", appId, "users", user.uid, "data", "progress"),
        updatedStatus,
        { merge: true }
      );
    } catch (e) {}
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const base64 = await compressImage(file);
        setNewTopic({ ...newTopic, image: base64 });
      } catch (err) {
        showToast("เกิดข้อผิดพลาดในการโหลดรูป", "error");
      }
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setNewTopic({
      system: item.system,
      topic: item.topic,
      yield_score: item.yield_score,
      keywords: Array.isArray(item.keywords)
        ? item.keywords.join(", ")
        : item.keywords,
      summary: item.summary,
      exam_tip: item.exam_tip || "",
      image: item.image || "",
    });
    setShowAdmin(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewTopic({
      system: "Nervous System",
      topic: "",
      yield_score: 5,
      keywords: "",
      summary: "",
      exam_tip: "",
      image: "",
    });
  };

  const handleSubmitTopic = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      const keywordsArray =
        typeof newTopic.keywords === "string"
          ? newTopic.keywords.split(",").map((k) => k.trim())
          : newTopic.keywords;
      const topicData = { ...newTopic, keywords: keywordsArray };

      if (editingId) {
        await updateDoc(
          doc(db, "artifacts", appId, "public", "data", "topics", editingId),
          topicData
        );
        showToast("แก้ไขข้อมูลสำเร็จ!");
      } else {
        await addDoc(
          collection(db, "artifacts", appId, "public", "data", "topics"),
          topicData
        );
        showToast("เพิ่มหัวข้อสำเร็จ!");
      }
      handleCancelEdit();
    } catch (error) {
      console.error(error);
      showToast("เกิดข้อผิดพลาด (อาจเพราะรูปใหญ่เกิน 1MB)", "error");
    }
  };

  const handleDeleteTopic = (topicId) => {
    setConfirmModal({
      message: "ยืนยันการลบหัวข้อนี้?",
      onConfirm: async () => {
        try {
          await deleteDoc(
            doc(db, "artifacts", appId, "public", "data", "topics", topicId)
          );
          showToast("ลบเรียบร้อยแล้ว");
          if (editingId === topicId) handleCancelEdit();
        } catch (error) {
          showToast("ลบไม่สำเร็จ", "error");
        }
        setConfirmModal(null);
      },
    });
  };

  const handlePasteImport = async () => {
    try {
      if (!jsonText.trim()) {
        alert("กรุณาวางโค้ด JSON ลงในช่องก่อนครับ");
        return;
      }
      let importedData;
      try {
        const fixedText = jsonText
          .replace(/[\u0000-\u0019]+/g, "")
          .replace(/\\n/g, "\\n");
        importedData = JSON.parse(fixedText);
      } catch (e) {
        alert("JSON Format ไม่ถูกต้อง: เช็คปีกกา {} หรือลูกน้ำ , ให้ครบ");
        return;
      }
      const dataArray = Array.isArray(importedData)
        ? importedData
        : [importedData];
      const batch = writeBatch(db);
      const collectionRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "topics"
      );

      let count = 0;
      dataArray.forEach((item) => {
        let fixedSummary = item.summary || "";
        fixedSummary = fixedSummary.replace(/\\n/g, "\n");
        fixedSummary = fixedSummary
          .replace(/\|\s*n\s*\|/g, "|\n|")
          .replace(/(^|[\s\r\n>:)}])n\|/g, "$1\n|")
          .replace(/_n_/g, "\n");

        const newDocRef = doc(collectionRef);
        batch.set(newDocRef, {
          system: item.system || "Uncategorized",
          topic: item.topic || "Untitled",
          yield_score: item.yield_score || 1,
          keywords: item.keywords || "",
          summary: fixedSummary,
          exam_tip: item.exam_tip || "",
          image: item.image || "",
          createdAt: new Date().toISOString(),
        });
        count++;
      });
      await batch.commit();
      showToast(`✅ Import สำเร็จ! เพิ่มข้อมูล ${count} รายการ`, "success");
      setJsonText("");
      setShowAdmin(false);
    } catch (error) {
      console.error("Import Error:", error);
      showToast(`❌ เกิดข้อผิดพลาด: ${error.message}`, "error");
    }
  };

  const systems = useMemo(
    () => [
      "All Systems",
      ...Array.from(new Set(knowledgeBase.map((k) => k.system))).sort(),
    ],
    [knowledgeBase]
  );

  const filteredData = useMemo(() => {
    return knowledgeBase
      .filter((item) => {
        if (selectedSystem !== "All Systems" && item.system !== selectedSystem)
          return false;
        if (item.yield_score < minYield) return false;
        if (searchTerm) {
          const kw = Array.isArray(item.keywords)
            ? item.keywords.join(" ")
            : item.keywords;
          const content = [item.topic, item.summary, item.exam_tip, kw]
            .join(" ")
            .toLowerCase();
          if (!content.includes(searchTerm.toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (b.yield_score !== a.yield_score)
          return b.yield_score - a.yield_score;
        return a.topic.localeCompare(b.topic);
      });
  }, [selectedSystem, minYield, searchTerm, knowledgeBase]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 relative">
      {/* 🟢 2. Global Dark Mode Styles (สูตร V2: ปรับสีให้อ่านง่าย High Contrast) */}
      {isDarkMode && (
        <style>{`
        /* 1. พื้นหลังหลัก (ดำสนิท) */
        .min-h-screen, body, aside, main { 
          background-color: #020617 !important; 
          color: #e2e8f0 !important; 
        }
        
        /* 2. การ์ด Topic (เทาเข้ม) */
        .bg-white { 
          background-color: #0f172a !important; 
          border-color: #1e293b !important; 
        }
        /* แก้พื้นหลังสีเทาอ่อน */
        .bg-gray-50, .bg-slate-50 { background-color: #020617 !important; }

        /* 3. ✅✅✅ กล่อง Summary สีฟ้า (High-Yield) */
        div[class*="bg-blue-50"] {
          background-color: #0f172a !important; /* พื้นหลังมืด */
          border-color: #1e40af !important;     /* ขอบสีน้ำเงิน */
        }
        /* ⚪️ ตัวหนังสือธรรมดา -> สีขาว */
        div[class*="bg-blue-50"] .text-gray-700, 
        div[class*="bg-blue-50"] .text-sm { 
          color: #ffffff !important; 
        }
        /* 🔵 ตัวหนา/หัวข้อ -> สีฟ้าสว่าง */
        div[class*="bg-blue-50"] b, 
        div[class*="bg-blue-50"] strong,
        div[class*="bg-blue-50"] h4,
        div[class*="bg-blue-50"] .text-blue-800,
        div[class*="bg-blue-50"] .text-blue-900 {
          color: #60a5fa !important;
        }

        /* 4. ✅✅✅ กล่อง Caution สีส้ม (ข้อควรระวัง) */
        div[class*="bg-amber-50"] {
          background-color: #271c19 !important; /* พื้นหลังน้ำตาลมืด */
          border-color: #b45309 !important;     /* ขอบสีส้ม */
        }
        /* ⚪️ ตัวหนังสือธรรมดา -> สีขาว */
        div[class*="bg-amber-50"] .text-gray-700,
        div[class*="bg-amber-50"] .text-sm { 
          color: #ffffff !important; 
        }
        /* 🟡 ตัวหนา/หัวข้อ -> สีทองสว่าง */
        div[class*="bg-amber-50"] b, 
        div[class*="bg-amber-50"] strong,
        div[class*="bg-amber-50"] h4,
        div[class*="bg-amber-50"] .text-amber-800,
        div[class*="bg-amber-50"] .text-amber-900 {
          color: #fbbf24 !important;
        }

        /* 5. แก้กล่องสูตร Math (pH, Delta G) */
        span[class*="bg-slate-100"] {
           background-color: #1e293b !important; 
           color: #fbbf24 !important; /* สีทอง */
           border: 1px solid #475569;
           box-shadow: none !important;
        }

        /* 6. Input / Search Box */
        input, select, textarea {
          background-color: #1e293b !important;
          color: #ffffff !important;
          border-color: #334155 !important;
        }

        /* 7. ตาราง (Table) */
        table tbody tr { background-color: #0f172a !important; }
        table td { color: #cbd5e1 !important; border-color: #1e293b !important; }
        tr[class*="bg-blue-50"] { background-color: #172554 !important; }
        
        /* 8. Text General Override */
        h1, h2, h3, .text-gray-900, .text-gray-800 { color: #f8fafc !important; }
        .text-gray-600, .text-gray-500, .text-gray-700 { color: #94a3b8 !important; }
      `}</style>
      )}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-5 duration-300 ${
            notification.type === "error"
              ? "bg-red-500 text-white"
              : "bg-gray-800 text-white"
          }`}
        >
          {notification.type === "error" ? (
            <AlertTriangle size={20} />
          ) : (
            <CheckCircle size={20} />
          )}
          <span className="font-bold text-sm">{notification.message}</span>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-center mb-4 text-amber-500">
              <AlertCircle size={48} />
            </div>
            <h3 className="text-lg font-black text-center text-gray-800 mb-2">
              ยืนยัน?
            </h3>
            <p className="text-sm text-center text-gray-500 mb-6">
              {confirmModal.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <div className="flex items-center gap-2 text-blue-600">
              <Stethoscope size={28} />
              <span className="text-xl font-bold tracking-tight">MedGuide</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden text-gray-400"
            >
              <X size={24} />
            </button>
          </div>
          <div className="p-6 space-y-8 flex-1 overflow-y-auto">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Filter size={16} /> ระบบ (System)
              </label>
              <div className="relative">
                <select
                  value={selectedSystem}
                  onChange={(e) => setSelectedSystem(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 text-sm border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 appearance-none cursor-pointer"
                >
                  {systems.map((sys) => (
                    <option key={sys} value={sys}>
                      {sys}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-3 text-gray-400 pointer-events-none"
                  size={16}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Star size={16} /> ความสำคัญขั้นต่ำ
                </label>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {minYield} ดาว+
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={minYield}
                onChange={(e) => setMinYield(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col gap-2">
              <a
                href="https://gemini.google.com/gem/1WPakiMymn-lMY5epP8rjWvygRgFqWqw4?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2 text-sm text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg font-bold transition-all shadow-sm"
              >
                <Zap size={16} /> ถามAC (Gemini)
              </a>
              <a
                href="https://drive.google.com/drive/folders/1ZPSXyXyEys4IZ2_z-Ij1mzoDXyVLi_pP"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 py-2 text-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg font-bold transition-all shadow-sm"
              >
                <ImageIcon size={16} /> คลังรูปภาพ
              </a>
              <button
                onClick={() => setShowHelp(true)}
                className="flex items-center justify-center gap-2 py-2 text-sm text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg font-bold transition-all shadow-sm"
              >
                <span className="text-base">📖</span> คู่มือการใช้งาน
              </button>
              <button
                onClick={() => setShowAdmin(!showAdmin)}
                className={`flex items-center justify-center gap-2 py-2 text-sm border rounded-lg font-bold transition-all shadow-sm ${
                  showAdmin
                    ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                    : "bg-gray-800 text-white border-gray-800 hover:bg-gray-900"
                }`}
              >
                {showAdmin ? <X size={16} /> : <Database size={16} />}
                {showAdmin ? "ปิด Admin Mode" : "Admin Mode"}
              </button>
            </div>
          </div>
          <div className="p-4 border-t border-gray-100 text-center text-xs text-gray-400">
            MedGuide Navigator v14.0
          </div>
        </div>
      </aside>

      <main className="md:ml-72 min-h-screen">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-4 md:px-8">
          <div className="max-w-3xl mx-auto flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 md:hidden">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <Menu size={24} />
                </button>
                <span className="font-bold text-gray-800">MedGuide</span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="hidden md:block text-2xl font-bold text-gray-800">
                  Medical Knowledge Base 🧠
                </h1>
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`ml-3 p-2 rounded-full transition-colors border ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-yellow-400"
                      : "bg-white border-gray-200 text-gray-500"
                  }`}
                >
                  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                {/* 🧠 ปุ่ม AI Quiz (เพิ่มตรงนี้ครับ) */}
                <button
                  onClick={() => setShowAIQuiz(true)}
                  className={`ml-2 p-2 rounded-full border transition-all relative group ${
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-purple-400 hover:bg-gray-600"
                      : "bg-white border-gray-200 text-purple-600 hover:bg-purple-50"
                  }`}
                  title="AI Quiz Master"
                >
                  <Brain size={20} />
                  {/* เอฟเฟกต์จุดแดงเต้นๆ (Ping) */}
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                  </span>
                </button>
                {isSyncing && (
                  <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    <RefreshCw size={12} className="animate-spin" /> Syncing New
                    Topics...
                  </div>
                )}
              </div>
            </div>

            {/* --- Tab Switcher (Fixed Colors for Light/Dark) --- */}
            <div className="flex justify-center gap-4 mt-2 mb-1">
              <button
                onClick={() => setActiveTab("knowledge")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  activeTab === "knowledge"
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-600 dark:text-white shadow-md scale-105" // Active: ม่วงอ่อน(Light) / ม่วงเข้ม(Dark)
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800" // Inactive: เทาเข้ม(Light) / เทาจาง(Dark)
                }`}
              >
                <FileText size={16} /> สรุปเนื้อหา
              </button>
              <button
                onClick={() => setActiveTab("quiz")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  activeTab === "quiz"
                    ? "bg-pink-100 text-pink-700 dark:bg-pink-600 dark:text-white shadow-md scale-105" // Active: ชมพูอ่อน(Light) / ชมพูเข้ม(Dark)
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800" // Inactive: เทาเข้ม(Light) / เทาจาง(Dark)
                }`}
              >
                <Brain size={16} /> คลังข้อสอบ ({quizzes.length})
              </button>
            </div>
            <div className="relative w-full md:w-96">
              <input
                type="text"
                placeholder="🔍 ค้นหา (เช่น MI, Meckel, EKG)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm shadow-sm"
              />
              <Search
                className="absolute left-3 top-3 text-gray-400"
                size={18}
              />
            </div>
          </div>
        </header>
        {showAdmin && (
          <div className="bg-blue-50 border-b border-blue-200 p-4 md:px-8">
            <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow-sm border border-blue-100">
              <div className="mb-8 p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Import JSON from Gemini
                  </label>
                  <button
                    type="button"
                    onClick={() => setJsonText("")}
                    className="text-[10px] text-slate-400 hover:text-red-500 underline"
                  >
                    Clear
                  </button>
                </div>
                <textarea
                  className="w-full h-96 p-3 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-y mb-3 transition-all"
                  placeholder='วางโค้ดที่ได้จาก Gemini ตรงนี้... (เช่น [{"title": "...", ...}])'
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handlePasteImport}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all flex justify-center items-center gap-2"
                >
                  ✅ ยืนยัน Import Data
                </button>
              </div>

              <h3 className="flex items-center gap-2 text-lg font-bold text-blue-800 mb-4">
                {editingId ? (
                  <>
                    <Pencil size={20} /> แก้ไขหัวข้อเดิม
                  </>
                ) : (
                  <>
                    <Plus size={20} /> เพิ่มหัวข้อใหม่
                  </>
                )}
              </h3>
              <form onSubmit={handleSubmitTopic} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      System
                    </label>
                    <select
                      value={newTopic.system}
                      onChange={(e) =>
                        setNewTopic({ ...newTopic, system: e.target.value })
                      }
                      className="w-full p-2 border rounded-lg text-sm"
                    >
                      {systems
                        .filter((s) => s !== "All Systems")
                        .map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      <option value="New System">+ Add New System...</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Topic Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newTopic.topic}
                      onChange={(e) =>
                        setNewTopic({ ...newTopic, topic: e.target.value })
                      }
                      className="w-full p-2 border rounded-lg text-sm"
                      placeholder="Ex. Acute Pancreatitis"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    ความสำคัญ (Yield Score)
                  </label>
                  <select
                    value={newTopic.yield_score || 0}
                    onChange={(e) =>
                      setNewTopic({
                        ...newTopic,
                        yield_score: parseInt(e.target.value),
                      })
                    }
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value={0}>-- กรุณาให้คะแนนดาว --</option>
                    <option value={5}>
                      ⭐⭐⭐⭐⭐ (5 ดาว - ออกสอบบ่อยที่สุด!)
                    </option>
                    <option value={4}>⭐⭐⭐⭐ (4 ดาว - สำคัญมาก)</option>
                    <option value={3}>⭐⭐⭐ (3 ดาว - สำคัญปานกลาง)</option>
                    <option value={2}>⭐⭐ (2 ดาว - พอเจอได้บ้าง)</option>
                    <option value={1}>⭐ (1 ดาว - นานๆ เจอที/อ่านผ่านๆ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Summary (ใช้ **ตัวหนา** ได้)
                  </label>
                  <textarea
                    required
                    value={newTopic.summary}
                    onChange={(e) =>
                      setNewTopic({ ...newTopic, summary: e.target.value })
                    }
                    className="w-full p-3 border rounded-lg text-sm h-64 resize-y focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="สรุปเนื้อหาสำคัญ..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Exam Tip / ข้อควรระวัง
                    </label>
                    <input
                      type="text"
                      value={newTopic.exam_tip}
                      onChange={(e) =>
                        setNewTopic({ ...newTopic, exam_tip: e.target.value })
                      }
                      className="w-full p-2 border rounded-lg text-sm"
                      placeholder="จุดที่ชอบออกสอบ"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Keywords (คั่นด้วยจุลภาค)
                    </label>
                    <input
                      type="text"
                      value={newTopic.keywords}
                      onChange={(e) =>
                        setNewTopic({ ...newTopic, keywords: e.target.value })
                      }
                      className="w-full p-2 border rounded-lg text-sm"
                      placeholder="Ex. Pain, Amylase, Gallstone"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-500">
                      รูปภาพประกอบ
                    </label>
                    <a
                      href="https://drive.google.com/drive/folders/1ZPSXyXyEys4IZ2_z-Ij1mzoDXyVLi_pP"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold border border-blue-200 px-2 py-0.5 rounded hover:bg-blue-50 transition-colors"
                    >
                      📂 เปิดคลังรูป
                    </a>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="วางลิงก์รูปภาพ (URL) ที่นี่... (เช่น https://site.com/img.jpg)"
                      value={newTopic.image}
                      onChange={(e) =>
                        setNewTopic({ ...newTopic, image: e.target.value })
                      }
                      className="w-full p-2 border rounded-lg text-sm bg-gray-50 focus:bg-white transition-colors"
                    />
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">หรือ</span>
                      <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                        <ImageIcon size={16} /> อัปโหลดจากเครื่อง
                        <input
                          type="file"
                          ref={imageInputRef}
                          onChange={handleImageUpload}
                          className="hidden"
                          accept="image/*"
                        />
                      </label>
                    </div>
                    {newTopic.image && (
                      <div className="relative group w-fit mt-2">
                        <img
                          src={newTopic.image}
                          alt="Preview"
                          className="h-24 w-auto rounded-lg object-cover border border-gray-300 shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setNewTopic({ ...newTopic, image: "" })
                          }
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  {editingId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="bg-gray-100 text-gray-500 py-2 px-4 rounded-lg text-sm font-bold hover:bg-gray-200"
                    >
                      ยกเลิก
                    </button>
                  )}
                  <button
                    type="submit"
                    className={`text-white py-2 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 ${
                      editingId
                        ? "bg-orange-500 hover:bg-orange-600"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    <Save size={16} />{" "}
                    {editingId ? "บันทึกการแก้ไข" : "บันทึกข้อมูล"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 🟢 ส่วนแสดงผลหลัก (Main Content) ที่แก้ไขแล้ว */}
        <div className="max-w-3xl mx-auto px-4 py-8 md:px-8">
          {/* 🅰️ Tab 1: หน้าอ่านสรุป (เนื้อหาเดิมของคุณ) */}
          {activeTab === "knowledge" && (
            <div className="animate-in fade-in duration-300">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-700">
                  ผลการค้นหา ({filteredData.length})
                </h2>
                {selectedSystem !== "All Systems" && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-md">
                    {selectedSystem}
                  </span>
                )}
              </div>

              {/* 🟢 อัปเกรดเป็น Overlay โหลด ไม่เด้งกลับ */}
              {isLoading && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-white p-6 rounded-2xl flex flex-col items-center shadow-2xl animate-spin-slow">
                    <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="mt-4 font-bold text-gray-700">
                      กำลังโหลดฐานข้อมูลจาก Cloud...
                    </p>
                  </div>
                </div>
              )}

              {/* 🟢 แสดงเนื้อหาหลักเสมอ ไม่โดนถอดออกแล้ว */}
              {filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="bg-gray-100 p-4 rounded-full mb-4">
                    <Search size={32} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">
                    ไม่พบข้อมูลที่ค้นหา
                  </h3>
                  <p className="text-gray-500 mt-1">
                    ลองลดเงื่อนไข Filter หรือกด Admin Mode เพื่อเพิ่มเนื้อหาใหม่
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedSystem("All Systems");
                      setMinYield(1);
                    }}
                    className="mt-6 text-blue-600 font-medium hover:text-blue-700 text-sm"
                  >
                    ล้างตัวกรองทั้งหมด
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredData.map((item) => (
                    <TopicCard
                      key={item.id}
                      item={item}
                      isRead={!!readStatus[item.id]}
                      onToggle={toggleReadStatus}
                      onZoom={setZoomContent}
                      showAdmin={showAdmin}
                      onEdit={handleEditClick}
                      onDelete={handleDeleteTopic}
                      onGenerateSpecific={handleGenerateSpecific}
                      // ส่วนขยายการ์ดที่คุณทำไว้
                      expanded={expandedTopicId === item.id}
                      onExpand={() =>
                        setExpandedTopicId((prev) =>
                          prev === item.id ? null : item.id
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 🅱️ Tab 2: หน้าคลังข้อสอบ (เพิ่มใหม่) */}
          {activeTab === "quiz" && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <QuizBank quizzes={quizzes} db={db} />
            </div>
          )}
        </div>
      </main>

      {showHelp && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl "
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 z-20 bg-black/10 hover:bg-black/20 text-black rounded-full p-1 transition-colors"
            >
              <X size={24} />
            </button>
            <div className="max-w-3xl mx-auto px-4 pt-6 md:px-8">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                    👋 สวัสดีครับเพื่อนๆ! ยินดีต้อนรับสู่ MedGuide
                  </h2>
                  <p className="text-blue-100 text-sm leading-relaxed">
                    เว็บนี้ผมตั้งใจทำขึ้นมาเพื่อรวบรวมสรุป High-Yield
                    สำหรับเตรียมสอบ comprehensive โดยเน้นจุดที่ออกสอบบ่อย (Yield
                    5 ดาว) เป็นหลักครับ //กดเปิด adminmode เพิ่ม topic ได้
                    ถ้าที่เพิ่มเป็นคหสต.ว่ามีโอกาสออก ใส่ 1 ดาวไว้//
                    เพิ่มรูปเพิ่มตารางได้โดยใช้ prompt markdown table
                    แล้วเอาไปวางในช่อง summary // function ติ๊กว่าอ่านแล้แล้ว
                    มันนlinkกันทุกคน เพราะงั้นอย่ากดดีกว่า// ปุ่มgemini
                    ถ้าสั่งให้มันทำอะไร มันจะตอบมาเป็น code ก๊อบวางใน import เลย
                    <br />
                    <br />
                    📌 <strong>Update:</strong> ตอนนี้เพิ่มฟีเจอร์ Discussion
                    และตารางเปรียบเทียบแล้วนะครับ ใครมีข้อสงสัยตรงไหน
                    พิมพ์ถามทิ้งไว้ได้เลย! ขอให้ทุกคนโชคดีกับการสอบครับ ✌️{" "}
                    <strong>
                      ถ้าจะอัพรูปกดคลังรูป เอารูปขึ้น gg drive แล้วเอาลิงค์มาแปะ
                      อัพตรงๆเดี๋ยวเมมเต็ม
                    </strong>
                  </p>
                </div>
                <div className="absolute -right-6 -bottom-6 opacity-10 rotate-12">
                  <Stethoscope size={180} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {zoomContent && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setZoomContent(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <Maximize2 size={18} /> ดูแบบเต็มจอ
              </h3>
              <button
                onClick={() => setZoomContent(null)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-auto bg-white">
              <div className="min-w-full">
                <div className="[&_table]:w-full [&_table]:text-base [&_td]:p-4 [&_td]:border">
                  {zoomContent}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <AIQuizModal
        isOpen={showAIQuiz}
        onClose={() => setShowAIQuiz(false)}
        allData={knowledgeBase}
        savedQuizzes={quizzes} // 🟢 ส่งโจทย์เก่าเข้าไปด้วย เพื่อกันซ้ำ
        systems={systems}
        externalQuizData={specificQuizData}
      />
    </div>
  );
}
