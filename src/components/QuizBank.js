import React, { useState, useMemo } from 'react';
import { Search, Filter, Trash2, Pencil, Save, X, RefreshCw, CheckCircle, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { renderMath, getImageUrl } from '../utils/textUtils';
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
export { QuizBank };

