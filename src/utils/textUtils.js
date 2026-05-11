import React from "react";

export const renderMath = (text) => {
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
    8: "₈",
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

export const getImageUrl = (url) => {
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

export const sanitizeImageUrl = (u) => {
  if (!u || typeof u !== "string") return null;
  return /^(https?:|data:image\/)/i.test(u.trim()) ? u : null;
};
