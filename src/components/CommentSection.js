import React from "react";
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { Check, Image as ImageIcon, X } from "lucide-react";
import { getImageUrl, sanitizeImageUrl } from "../utils/textUtils";

export const CommentSection = ({ db, appId, system, topic }) => {
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
  }, [topicKey, db, appId]);

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
        const longest = Math.max(img.width, img.height);
        const scale = longest > 800 ? 800 / longest : 1;
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
          const rawImage = c.image || (isLegacyImage ? c.text : null);
          const displayImage = sanitizeImageUrl(rawImage);
          const finalImageUrl = displayImage
            ? getImageUrl
              ? getImageUrl(displayImage)
              : displayImage
            : null;

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
