import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Sparkles, Copy, Save, CheckCircle, RefreshCw, Brain, Zap, FileText, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';
import { collection, addDoc, getFirestore } from 'firebase/firestore';
import { renderMath } from '../utils/textUtils';

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
  const [error, setError] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [targetSystem, setTargetSystem] = useState("Auto");

  const availableSystems = useMemo(() => {
    if (!allData) return [];
    const systems = new Set(allData.map((d) => d.system || "General"));
    return Array.from(systems).sort();
  }, [allData]);

  const [isExpanded, setIsExpanded] = useState(false);
  const [previewAnswer, setPreviewAnswer] = useState(null);
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
      setTargetSystem("Auto");
    }
  }, [isOpen]);

  useEffect(() => {
    setIsExpanded(true);
    setPreviewAnswer(null);
  }, [quizData]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!GEMINI_API_KEY) {
      setError("กรุณาตั้งค่า REACT_APP_GEMINI_API_KEY ในไฟล์ .env ก่อนใช้งาน AI");
      return;
    }
    if (!keyword.trim() && targetSystem === "Auto") {
      alert("กรุณาพิมพ์หัวข้อ หรือเลือกหมวดหมู่ก่อนครับ");
      return;
    }

    setLoading(true);
    setError(null);
    setQuizData(null);

    let contextDocs = [];

    if (!keyword.trim() && targetSystem !== "Auto") {
      let systemDocs = (allData || []).filter((d) => d.system === targetSystem);

      if (systemDocs.length === 0) {
        alert(
          `ยังไม่มีเนื้อหาในหมวด ${targetSystem} เลยครับ AI ไม่รู้จะออกอะไร`
        );
        setLoading(false);
        return;
      }
      const shuffled = systemDocs.sort(() => 0.5 - Math.random());
      contextDocs = shuffled.slice(0, 3);
    } else {
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
      const userRequest = keyword.trim()
        ? `User Keyword: "${keyword}"`
        : `User Keyword: NONE (Randomly select a HIGH-YIELD topic from the provided context)`;

      const systemInstruction =
        targetSystem === "Auto"
          ? "Classify this question into the most appropriate Medical System based on content."
          : `FORCE CLASSIFY this question as "${targetSystem}".`;

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
        generatedQuiz.correctIndex = 0;
      }

      setQuizData(generatedQuiz);
    } catch (err) {
      console.error(err);
      setError("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!quizData) return;
    try {
      const db = getFirestore();
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
              {error && (
                <div className="p-3 bg-red-100 text-red-700 text-sm rounded-lg border border-red-200 mt-2 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

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

export { AIQuizModal };
