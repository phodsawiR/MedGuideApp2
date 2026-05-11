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
  Calculator,
  HeartPulse,
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
import { MASTER_SEED_DATA } from './data/seedData';
import { TopicCard } from './components/TopicCard';
import { AIQuizModal } from './components/AIQuizModal';
import { QuizBank } from './components/QuizBank';
import { ClinicalCalculatorModal } from './components/ClinicalCalculatorModal';
import { PocketGuideModal } from './components/PocketGuideModal';

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
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
const appId = typeof __app_id !== "undefined" ? __app_id : "medguide-master-db";

export default function MedGuideApp() {
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
  const [showAIQuiz, setShowAIQuiz] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showPocketGuide, setShowPocketGuide] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState([]);
  const [specificQuizData, setSpecificQuizData] = useState(null);

  const handleGenerateSpecific = async (topicData) => {
    const previousQuestions = questionHistory[topicData.id] || [];

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
      if (!GEMINI_API_KEY) {
        throw new Error("กรุณาตั้งค่า REACT_APP_GEMINI_API_KEY ในไฟล์ .env ก่อนใช้งาน AI");
      }

      const contextText = `Topic: ${topicData.topic}\nSystem: ${topicData.system}\nContent: ${topicData.summary}`;

      const avoidList = previousQuestions
        .slice(-3)
        .map((q, i) => `${i + 1}. ${q}`)
        .join("\n");

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
      if (data.error) throw new Error(data.error.message);
      if (!data.candidates) throw new Error("AI No Response");

      const textResponse = data.candidates[0].content.parts[0].text;
      const match = textResponse.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI ไม่ได้ส่ง JSON กลับมา");
      const jsonString = match[0];
      const generatedQuiz = JSON.parse(jsonString);

      const letterMap = { A: 0, B: 1, C: 2, D: 3, E: 4 };
      generatedQuiz.correctIndex = letterMap[generatedQuiz.correctLetter] ?? 0;

      setQuestionHistory((prev) => ({
        ...prev,
        [topicData.id]: [...(prev[topicData.id] || []), generatedQuiz.question],
      }));

      setSpecificQuizData(generatedQuiz);
    } catch (err) {
      alert("Error: " + err.message);
      setShowAIQuiz(false);
    }
  };
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
  const [activeTab, setActiveTab] = useState("knowledge");
  const [quizzes, setQuizzes] = useState([]);
  const [previewAnswers, setPreviewAnswers] = useState({});

  useEffect(() => {
    setPreviewAnswers({});
  }, [quizzes]);

  useEffect(() => {
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
          const targetWidth = Math.min(MAX_WIDTH, img.width);
          const scaleSize = targetWidth / img.width;
          canvas.width = targetWidth;
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
          const content = [item.topic, kw]
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
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Clinical Tools</label>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => { setShowPocketGuide(true); setIsSidebarOpen(false); }}
                    className="flex items-center justify-center gap-2 py-2.5 text-sm text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg font-bold transition-all shadow-sm"
                  >
                    <HeartPulse size={16} /> Ward Pocket Guide
                  </button>
                  
                  <button
                    onClick={() => { setShowCalculator(true); setIsSidebarOpen(false); }}
                    className="flex items-center justify-center gap-2 py-2.5 text-sm text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg font-bold transition-all shadow-sm"
                  >
                    <Calculator size={16} /> Clinical Calculator
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-200 my-1"></div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">General</label>
                <div className="flex flex-col gap-2">
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

            <div className="flex justify-center gap-4 mt-2 mb-1">
              <button
                onClick={() => setActiveTab("knowledge")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  activeTab === "knowledge"
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-600 dark:text-white shadow-md scale-105"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                }`}
              >
                <FileText size={16} /> สรุปเนื้อหา
              </button>
              <button
                onClick={() => setActiveTab("quiz")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  activeTab === "quiz"
                    ? "bg-pink-100 text-pink-700 dark:bg-pink-600 dark:text-white shadow-md scale-105"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
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

        <div className="max-w-3xl mx-auto px-4 py-8 md:px-8">
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
                      expanded={expandedTopicId === item.id}
                      onExpand={() =>
                        setExpandedTopicId((prev) =>
                          prev === item.id ? null : item.id
                        )
                      }
                      db={db}
                      appId={appId}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

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
                    ✨ <strong>New Formatting:</strong> ตอนนี้ช่อง Summary รองรับการจัดรูปแบบสำหรับเขียน SOAP Note หรือ Clinical Data แล้ว!
                    <ul className="list-disc ml-5 mt-1 text-xs text-blue-50">
                      <li>พิมพ์ <code># </code>, <code>## </code>, <code>### </code> นำหน้าบรรทัดเพื่อทำหัวข้อ (Headings)</li>
                      <li>พิมพ์ <code>- </code> หรือ <code>1. </code> นำหน้าเพื่อทำลิสต์ข้อๆ (Bullet / Numbered Lists)</li>
                      <li>พิมพ์ <code>&gt; </code> นำหน้าเพื่อเน้นข้อความ (Blockquote) คล้ายกล่องข้อควรระวัง</li>
                      <li>พิมพ์ <code>---</code> เพื่อสร้างเส้นคั่น (Divider)</li>
                    </ul>
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
        savedQuizzes={quizzes}
        systems={systems}
        externalQuizData={specificQuizData}
      />
      <ClinicalCalculatorModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
      />
      <PocketGuideModal
        isOpen={showPocketGuide}
        onClose={() => setShowPocketGuide(false)}
      />
    </div>
  );
}
