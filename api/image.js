// api/image.js
// PUT { filename, fileBase64 } -> commits an image file to images/<filename> in the repo.
// Used by the admin panel when uploading certificate thumbnails.
// Authentication required. api/_github.js is NOT modified.

const { isAuthenticated } = require("./_auth");
const { getFileRawBase64, putFile } = require("./_github");

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

// Very light magic-byte check: PNG starts with \x89PNG, JPG with \xFF\xD8, WebP/GIF have their own.
function detectImageType(base64) {
  try {
    const buf = Buffer.from(base64.slice(0, 16), "base64");
    if (buf[0] === 0x89 && buf[1] === 0x50) return "png";
    if (buf[0] === 0xff && buf[1] === 0xd8) return "jpeg";
    if (buf.toString("utf8", 0, 4) === "RIFF") return "webp";
    if (buf.toString("utf8", 0, 6) === "GIF89a" || buf.toString("utf8", 0, 6) === "GIF87a") return "gif";
    return null;
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  // CORS pre-flight (admin panel same-origin, but be safe)
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

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

  const { filename, fileBase64 } = body;

  // Validate filename
  if (!filename || typeof filename !== "string") {
    res.status(400).json({ error: "filename is required." });
    return;
  }
  // Strip any path traversal attempts, keep only the basename
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.{2,}/g, "_");
  const ext = ("." + safeName.split(".").pop()).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    res.status(400).json({ error: "Only JPG, PNG, WebP, or GIF files are allowed." });
    return;
  }

  // Validate base64 payload
  if (!fileBase64 || typeof fileBase64 !== "string") {
    res.status(400).json({ error: "fileBase64 is required." });
    return;
  }

  // Strip data URL prefix if present (e.g. "data:image/png;base64,...")
  const cleaned = fileBase64.includes(",")
    ? fileBase64.slice(fileBase64.indexOf(",") + 1)
    : fileBase64;

  const approxBytes = Math.floor((cleaned.length * 3) / 4);
  if (approxBytes > MAX_BYTES) {
    res.status(400).json({ error: "Image is too large (max 5 MB)." });
    return;
  }

  // Magic-byte validation
  const imageType = detectImageType(cleaned);
  if (!imageType) {
    res.status(400).json({ error: "File does not appear to be a valid image." });
    return;
  }

  const repoPath = "images/" + safeName;

  try {
    // Get current SHA if the file already exists (required to overwrite via GitHub API).
    // getFileRawBase64 returns { base64, sha } — sha is null if file doesn't exist yet.
    const { sha } = await getFileRawBase64(repoPath);

    await putFile(
      repoPath,
      cleaned,
      `Upload certificate image: ${safeName} (via admin panel)`,
      sha
    );

    res.status(200).json({ ok: true, path: repoPath, filename: safeName });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
};
