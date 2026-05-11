import React from 'react';
import { 
  Heart, Droplet, Bone, Wind, Utensils, Activity, Brain, Zap, Baby, Bug, 
  Shield, Atom, Dna, Pill, Smile, BarChart2, Stethoscope, Star, CheckCircle, 
  Pencil, Trash2, ChevronUp, ChevronDown, FileText, AlertCircle, Maximize2 
} from 'lucide-react';
import { getImageUrl } from '../utils/textUtils';
import { CommentSection } from './CommentSection';
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
  db,
  appId,
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
                <div className="overflow-x-auto max-h-96 w-full">{TableNode}</div>
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
export { SystemIcon, TopicCard };

