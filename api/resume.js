// api/resume.js
// PUT { fileBase64 } -> replaces the resume PDF in the repo, keeping the
// exact same filename it has always had, so every existing link
// (nav "Resume" button, contact card, resume.html download button) keeps
// working without any changes elsewhere.

const { isAuthenticated } = require("./_auth");
const { getFile, getFileRawBase64, putFile } = require("./_github");

// This filename must stay in sync with the file that already exists in the
// repo today. It is also reflected in content.json's resume.filename field,
// which the frontend can use if it ever needs to read it dynamically.
const RESUME_PATH = "RALI_VISHNU_VARDHAN_RESUME_.pdf";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB safety cap

module.exports = async function handler(req, res) {
  if (req.method !== "PUT") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: "Invalid JSON body." });
      return;
    }
  }
  body = body || {};

  const { fileBase64 } = body;
  if (!fileBase64 || typeof fileBase64 !== "string") {
    res.status(400).json({ error: "fileBase64 is required." });
    return;
  }

  // Strip a data URL prefix if the browser included one (e.g. "data:application/pdf;base64,").
  const cleaned = fileBase64.includes(",")
    ? fileBase64.slice(fileBase64.indexOf(",") + 1)
    : fileBase64;

  const approxBytes = Math.floor((cleaned.length * 3) / 4);
  if (approxBytes > MAX_BYTES) {
    res.status(400).json({ error: "PDF is too large (max 8MB)." });
    return;
  }

  // Quick sanity check that this is actually a PDF (starts with %PDF after decoding).
  try {
    const headerBuf = Buffer.from(cleaned.slice(0, 12), "base64");
    if (!headerBuf.toString("utf-8", 0, 4).startsWith("%PDF")) {
      res.status(400).json({ error: "File does not look like a valid PDF." });
      return;
    }
  } catch {
    res.status(400).json({ error: "Could not read uploaded file." });
    return;
  }

  try {
    const { sha } = await getFileRawBase64(RESUME_PATH);
    await putFile(
      RESUME_PATH,
      cleaned,
      "Replace resume PDF via admin panel (filename unchanged)",
      sha
    );
    res.status(200).json({ ok: true, filename: RESUME_PATH });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
};
