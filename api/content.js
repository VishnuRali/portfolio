// api/content.js
// GET  -> returns current content.json from the GitHub repo (source of truth).
// PUT  -> commits a new content.json to the repo (auth required). Vercel
//         then auto-redeploys because the repo is connected to the project.

const { isAuthenticated } = require("./_auth");
const { getFile, putFile } = require("./_github");

const CONTENT_PATH = "content.json";

function validateContentShape(data) {
  // Light validation: make sure required top-level keys exist and are the
  // right basic type. This is intentionally not exhaustive — the admin UI
  // is the only client, but this guards against obviously malformed saves
  // wiping the site.
  if (!data || typeof data !== "object") return "Content must be an object.";
  const requiredObjectKeys = ["hero", "ctas", "contact", "skills", "education", "footer", "resume"];
  for (const key of requiredObjectKeys) {
    if (!data[key] || typeof data[key] !== "object") {
      return `Missing or invalid "${key}" section.`;
    }
  }
  const requiredArrayKeys = ["experience", "projects", "certifications"];
  for (const key of requiredArrayKeys) {
    if (!Array.isArray(data[key])) {
      return `"${key}" must be a list.`;
    }
  }
  if (typeof data.hero.name !== "string" || !data.hero.name.trim()) {
    return "hero.name is required.";
  }
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const { content } = await getFile(CONTENT_PATH);
      if (content == null) {
        res.status(404).json({ error: "content.json not found in repo." });
        return;
      }
      res.setHeader("Content-Type", "application/json");
      res.status(200).send(content);
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
    return;
  }

  if (req.method === "PUT") {
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

    const validationError = validateContentShape(body);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    try {
      const { sha } = await getFile(CONTENT_PATH);
      const jsonString = JSON.stringify(body, null, 2);
      const contentBase64 = Buffer.from(jsonString, "utf-8").toString("base64");

      await putFile(
        CONTENT_PATH,
        contentBase64,
        "Update site content via admin panel",
        sha
      );

      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
};
