// api/add-topic.js  — Vercel Edge Function
// ────────────────────────────────────────────────────────────────────────────
// วิธีใช้:
//   1. วางไฟล์นี้ที่  /api/add-topic.js  ในโปรเจกต์ MedGuideApp2
//   2. ไปที่ Vercel Dashboard → Project → Settings → Environment Variables
//      เพิ่ม 2 ตัวแปร:
//        TOPIC_API_SECRET  =  (รหัสลับที่คุณคิดเอง เช่น "medguide-secret-2025")
//        FIREBASE_API_KEY  =  AIzaSyA1PauDwTDzJ4UfeWjlIBU9IZqL6r67WvI
//   3. Redeploy → แล้วบอก Claude ว่า endpoint คือ https://your-app.vercel.app/api/add-topic
// ────────────────────────────────────────────────────────────────────────────

export const config = { runtime: "edge" };

// ─── Constants (อ่านจาก env) ──────────────────────────────────────────────────
const FIREBASE_PROJECT_ID = "medguide-34566";
const FIRESTORE_APP_ID    = "medguide-master-db";
const COLLECTION_PATH     = `artifacts/${FIRESTORE_APP_ID}/public/data/topics`;

// ─── CORS Headers ─────────────────────────────────────────────────────────────
const CORS = {
  "Content-Type":                "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
};

// ─── Firestore Field Converter ─────────────────────────────────────────────────
function toFields(obj) {
  const conv = (v) => {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === "boolean")        return { booleanValue: v };
    if (typeof v === "number")         return { integerValue: String(Math.round(v)) };
    if (Array.isArray(v))              return { arrayValue: { values: v.map(conv) } };
    return { stringValue: String(v) };
  };
  const fields = {};
  Object.entries(obj).forEach(([k, val]) => (fields[k] = conv(val)));
  return fields;
}

// ─── Firebase Anonymous Auth ───────────────────────────────────────────────────
async function getFirebaseToken(apiKey) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!data.idToken) throw new Error(`Firebase auth failed: ${JSON.stringify(data)}`);
  return data.idToken;
}

// ─── Write to Firestore ────────────────────────────────────────────────────────
async function writeToFirestore(token, topicData) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${COLLECTION_PATH}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      fields: toFields({
        system:      topicData.system,
        topic:       topicData.topic,
        yield_score: topicData.yield_score,
        keywords:    topicData.keywords,
        summary:     topicData.summary,
        exam_tip:    topicData.exam_tip,
        image:       topicData.image || "",
        createdAt:   new Date().toISOString(),
      }),
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Firestore write failed");
  }
  return await res.json();
}

// ─── Validation ────────────────────────────────────────────────────────────────
const VALID_SYSTEMS = [
  "Nervous System","Gastrointestinal System","Hematology System",
  "Cardiovascular System","Respiratory System","Musculoskeletal System",
  "Endocrine System","Reproductive System","Renal & Urinary System",
  "Infectious Diseases","Immunology System","Cell Biology & Biochemistry",
  "Genetics & Embryology","Pharmacology & Toxicology","Psychiatry",
  "Epidemiology & Statistics",
];

function validatePayload(body) {
  const required = ["system","topic","yield_score","keywords","summary","exam_tip"];
  for (const field of required) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      return `Missing or empty field: "${field}"`;
    }
  }
  if (!VALID_SYSTEMS.includes(body.system)) {
    return `Invalid system: "${body.system}". Must be one of the 16 valid systems.`;
  }
  if (typeof body.yield_score !== "number" || body.yield_score < 1 || body.yield_score > 5) {
    return `yield_score must be a number between 1–5, got: ${body.yield_score}`;
  }
  if (!Array.isArray(body.keywords) || body.keywords.length === 0) {
    return `keywords must be a non-empty array`;
  }
  return null; // valid
}

// ─── Main Handler ──────────────────────────────────────────────────────────────
export default async function handler(req) {
  // 1. Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  // 2. Method guard
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      { status: 405, headers: CORS }
    );
  }

  // 3. Auth: check x-api-key header
  const secret = process.env.TOPIC_API_SECRET;
  const provided = req.headers.get("x-api-key");

  if (!secret) {
    return new Response(
      JSON.stringify({ error: "Server misconfigured: TOPIC_API_SECRET not set." }),
      { status: 500, headers: CORS }
    );
  }
  if (!provided || provided !== secret) {
    return new Response(
      JSON.stringify({ error: "Unauthorized: invalid or missing x-api-key." }),
      { status: 401, headers: CORS }
    );
  }

  // 4. Parse body
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body." }),
      { status: 400, headers: CORS }
    );
  }

  // 5. Validate payload
  const validationError = validatePayload(body);
  if (validationError) {
    return new Response(
      JSON.stringify({ error: validationError }),
      { status: 400, headers: CORS }
    );
  }

  // 6. Write to Firebase
  try {
    const firebaseKey = process.env.FIREBASE_API_KEY;
    const token = await getFirebaseToken(firebaseKey);
    const result = await writeToFirestore(token, body);

    // Extract doc ID from Firestore response name (e.g. "...documents/topics/ABC123")
    const docId = result.name?.split("/").pop() ?? "unknown";

    return new Response(
      JSON.stringify({
        success: true,
        id:      docId,
        topic:   body.topic,
        system:  body.system,
        message: `✅ "${body.topic}" added to ${body.system}`,
      }),
      { status: 200, headers: CORS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: CORS }
    );
  }
}