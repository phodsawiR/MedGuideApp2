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
  BarChart2,
  Pencil,
  Image as ImageIcon,
} from "lucide-react";
import { initializeApp } from "firebase/app";
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
} from "firebase/firestore";
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
const appId = typeof __app_id !== "undefined" ? __app_id : "medguide-master-db";

export default function MedGuideApp() {
  const [user, setUser] = useState(null);
  const [knowledgeBase, setKnowledgeBase] = useState([]);
  const [readStatus, setReadStatus] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null); // Notification, Modal, & Edit State
  const [notification, setNotification] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [editingId, setEditingId] = useState(null); // UI States

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSystem, setSelectedSystem] = useState("All Systems");
  const [minYield, setMinYield] = useState(3);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Admin Mode State
  const [showAdmin, setShowAdmin] = useState(false);
  const [newTopic, setNewTopic] = useState({
    system: "Nervous System",
    topic: "",
    yield_score: 5,
    keywords: "",
    summary: "",
    exam_tip: "",
    image: "",
  }); // --- Auth & Data Loading ---

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
  }; // --- Helper: Compress Image to Base64 ---

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800; // Limit width to 800px to save space
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.7)); // Compress to 70% quality
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  }; // --- 1. Real-time Listener ---

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

  // --- 2. Smart Sync & Auto-Cleanup (แก้ปัญหาตัวซ้ำถาวร) ---
  useEffect(() => {
    if (!user) return;

    const syncAndCleanup = async () => {
      // 1. ดึงข้อมูลทั้งหมดที่มีตอนนี้มาดูก่อน
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

      // 2. วนลูปเช็คตัวซ้ำ (Deduplicate Logic)
      snapshot.docs.forEach((doc) => {
        const d = doc.data();
        // สร้างกุญแจเช็คจาก "ชื่อระบบ + ชื่อเรื่อง"
        const key = `${d.system}-${d.topic}`.toLowerCase().trim();

        if (seen.has(key)) {
          // ถ้าเคยเจอ key นี้แล้ว แสดงว่าเป็น "ตัวซ้ำ" -> เก็บ ID ไว้ลบ
          duplicatesToDelete.push(doc.id);
        } else {
          // ถ้าเพิ่งเจอครั้งแรก -> เก็บไว้เป็น "ตัวจริง"
          seen.add(key);
          existingTopics.add(key);
        }
      });

      const batch = writeBatch(db);
      let hasChanges = false;

      // 3. สั่งลบตัวซ้ำ (ถ้าเจอ)
      if (duplicatesToDelete.length > 0) {
        console.log(
          `Auto-cleanup: Deleting ${duplicatesToDelete.length} duplicates...`
        );
        duplicatesToDelete.forEach((id) => {
          batch.delete(doc(topicsRef, id));
        });
        hasChanges = true;
      }

      // 4. เติมข้อมูลที่ขาด (Seeding Logic)
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

      // 5. บันทึกผลลง Firebase ทีเดียว (Atomic Commit)
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

  // --- B. User Progress ---

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
  }, [user]); // --- Handlers ---

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

  const handleExportData = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(knowledgeBase, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "medguide_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportData = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        setConfirmModal({
          message: `นำเข้า ${imported.length} รายการ? (ข้ามข้อมูลซ้ำ)`,
          onConfirm: async () => {
            setIsSyncing(true);
            const batch = writeBatch(db);
            let count = 0;
            const existingKeys = new Set(
              knowledgeBase.map((item) =>
                `${item.system}-${item.topic}`.toLowerCase().trim()
              )
            );
            for (const item of imported) {
              const key = `${item.system}-${item.topic}`.toLowerCase().trim();
              if (!existingKeys.has(key)) {
                const { id, ...cleanItem } = item;
                const newDocRef = doc(
                  collection(db, "artifacts", appId, "public", "data", "topics")
                );
                batch.set(newDocRef, cleanItem);
                count++;
              }
            }
            if (count > 0) {
              await batch.commit();
              showToast(`นำเข้าสำเร็จ ${count} รายการ`);
            } else {
              showToast("ไม่มีข้อมูลใหม่", "error");
            }
            setIsSyncing(false);
            setConfirmModal(null);
          },
        });
      } catch (err) {
        showToast("ไฟล์ไม่ถูกต้อง", "error");
      }
    };
    reader.readAsText(file);
  };

  // --- Filtering ---
  const systems = useMemo(
    () => [
      "All Systems",
      ...Array.from(new Set(knowledgeBase.map((k) => k.system))).sort(),
    ],
    [knowledgeBase]
  );
  const filteredData = useMemo(() => {
    return knowledgeBase.filter((item) => {
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
    });
  }, [selectedSystem, minYield, searchTerm, knowledgeBase]);

  // --- UI Components ---
  const SystemIcon = ({ name }) => {
    if (name.includes("Cardio"))
      return <Heart size={14} className="text-pink-500" />;
    if (name.includes("Hema"))
      return <Droplet size={14} className="text-red-500" />;
    if (name.includes("Musculo"))
      return <Bone size={14} className="text-amber-600" />;
    if (name.includes("Resp"))
      return <Wind size={14} className="text-sky-500" />;
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

  const TopicCard = ({ item, isRead, onToggle }) => {
    const [expanded, setExpanded] = useState(false);

    const renderSummary = (text) => {
      if (!text) return null;
      let formattedText = text
        .replace(/\s\/\/\s/g, "\n")
        .replace(/(\s)(\d\.)/g, "\n$2")
        .replace(/(\s)(\*\*)/g, "\n$2");

      const lines = formattedText.split("\n");

      return lines.map((line, lineIndex) => (
        <div key={lineIndex} className="mb-1 last:mb-0">
          {line.split(/(\*\*.*?\*\*)/g).map((part, i) =>
            part.startsWith("**") ? (
              <strong key={i} className="text-blue-700 font-semibold">
                {part.slice(2, -2)}
              </strong>
            ) : (
              part
            )
          )}
        </div>
      ));
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
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <SystemIcon name={item.system} /> {item.system}
                </span>
                {isRead && (
                  <span className="text-xs flex items-center gap-1 font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                    <CheckCircle size={10} /> อ่านแล้ว
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-800 leading-tight">
                {item.topic}
              </h3>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">
                  Yield:
                </span>
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
              {showAdmin && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(item);
                    }}
                    className="text-blue-400 hover:text-blue-600 p-1"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTopic(item.id);
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
                  src={item.image}
                  alt={item.topic}
                  className="w-full h-auto"
                />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-800 mb-2">
                  <FileText size={16} /> สรุป High-Yield
                </h4>
                <div className="text-sm text-gray-700 leading-relaxed">
                  {renderSummary(item.summary)}
                </div>
              </div>
              <div className="flex flex-col justify-between gap-4">
                <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-800 mb-2">
                    <AlertCircle size={16} /> ข้อควรระวัง / เก็งข้อสอบ
                  </h4>
                  <p className="text-sm text-gray-700">{item.exam_tip}</p>
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
                      <CheckCircle size={18} /> อ่านทบทวนแล้ว
                    </>
                  ) : (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/40" />{" "}
                      เช็คว่าอ่านแล้ว
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 relative">
      {/* Toast */}
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

      {/* Confirm Modal */}
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
            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowAdmin(!showAdmin)}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors"
              >
                {showAdmin ? <X size={16} /> : <Database size={16} />}{" "}
                {showAdmin ? "ปิด Admin Mode" : "Admin Mode (เพิ่มเนื้อหา)"}
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
                {isSyncing && (
                  <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    <RefreshCw size={12} className="animate-spin" /> Syncing New
                    Topics...
                  </div>
                )}
              </div>
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
              {/* Tools */}
              <div className="flex justify-end gap-2 mb-4">
                <button
                  onClick={handleExportData}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <Download size={14} /> Export JSON
                </button>

                <button
                  onClick={() => fileInputRef.current.click()}
                  className="flex items-center gap-1 text-xs text-green-600 hover:underline"
                >
                  <Upload size={14} /> Import JSON
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportData}
                  className="hidden"
                  accept=".json"
                />
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
                {/* --- วางตรงนี้เลยครับ (Yield 5 ดาว) --- */}
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
                    className="w-full p-2 border rounded-lg text-sm h-20"
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

                {/* Image Upload */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    แนบรูปภาพ (ถ้ามี)
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                      <ImageIcon size={16} /> เลือกรูปภาพ
                      <input
                        type="file"
                        ref={imageInputRef}
                        onChange={handleImageUpload}
                        className="hidden"
                        accept="image/*"
                      />
                    </label>
                    {newTopic.image && (
                      <div className="relative group">
                        <img
                          src={newTopic.image}
                          alt="Preview"
                          className="h-10 w-10 rounded object-cover border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setNewTopic({ ...newTopic, image: "" })
                          }
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    <span className="text-xs text-gray-400">
                      {newTopic.image ? "รูปพร้อมอัปโหลด" : "ยังไม่ได้เลือกรูป"}
                    </span>
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

        <div className="max-w-3xl mx-auto px-4 py-8 md:px-8">
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
          {isLoading ? (
            <div className="text-center py-20 text-gray-400">
              กำลังโหลดฐานข้อมูลจาก Cloud...
            </div>
          ) : filteredData.length === 0 ? (
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
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
