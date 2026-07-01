// api/login.js
// POST { password } -> sets session cookie if correct, else 401.
// POST with action=logout -> clears the cookie.

const crypto = require("crypto");
const { setSessionCookie, clearSessionCookie, isAuthenticated } = require("./_auth");

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    // Still do a comparison to keep timing roughly consistent.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    // Lets the admin UI check "am I already logged in?" without posting a password.
    res.status(200).json({ authenticated: isAuthenticated(req) });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  if (body.action === "logout") {
    clearSessionCookie(res);
    res.status(200).json({ ok: true });
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    res.status(500).json({ error: "Server is missing ADMIN_PASSWORD configuration." });
    return;
  }

  const { password } = body;
  if (!password || !safeEqual(password, adminPassword)) {
    res.status(401).json({ error: "Incorrect password." });
    return;
  }

  setSessionCookie(res);
  res.status(200).json({ ok: true });
};
