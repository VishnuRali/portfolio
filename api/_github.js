// api/_github.js
// Minimal helper around the GitHub Contents API.
// Used to read and commit files (content.json, the resume PDF) directly
// to the repo that Vercel is already deployed from. No external services,
// no paid tiers — just GitHub's free REST API.

const GITHUB_API = "https://api.github.com";

function requiredEnv(name) {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

function repoConfig() {
  return {
    token: requiredEnv("GITHUB_TOKEN"),
    owner: requiredEnv("GITHUB_OWNER"),
    repo: requiredEnv("GITHUB_REPO"),
    branch: process.env.GITHUB_BRANCH || "main",
  };
}

async function githubFetch(url, options = {}) {
  const { token } = repoConfig();
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  return res;
}

// Get a file's current content (decoded) + its sha (needed to update it).
// Returns { content: string, sha: string } or { content: null, sha: null } if missing.
async function getFile(path) {
  const { owner, repo, branch } = repoConfig();
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(
    path
  )}?ref=${encodeURIComponent(branch)}`;

  const res = await githubFetch(url, { method: "GET" });

  if (res.status === 404) {
    return { content: null, sha: null };
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub getFile failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  // data.content is base64, possibly with newlines
  const decoded = Buffer.from(data.content, "base64").toString("utf-8");
  return { content: decoded, sha: data.sha };
}

// Get raw base64 content of a binary file + its sha.
async function getFileRawBase64(path) {
  const { owner, repo, branch } = repoConfig();
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(
    path
  )}?ref=${encodeURIComponent(branch)}`;

  const res = await githubFetch(url, { method: "GET" });

  if (res.status === 404) {
    return { base64: null, sha: null };
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub getFileRawBase64 failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  // GitHub may return content with embedded newlines; keep as-is, it's valid base64.
  return { base64: data.content, sha: data.sha };
}

// Create or update a file. `contentBase64` must already be base64-encoded.
// `sha` must be the current file's sha if it exists (omit/null to create new).
async function putFile(path, contentBase64, message, sha) {
  const { owner, repo, branch } = repoConfig();
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(
    path
  )}`;

  const body = {
    message,
    content: contentBase64,
    branch,
  };
  if (sha) body.sha = sha;

  const res = await githubFetch(url, {
    method: "PUT",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`GitHub putFile failed (${res.status}): ${errBody}`);
  }

  return res.json();
}

module.exports = {
  getFile,
  getFileRawBase64,
  putFile,
  repoConfig,
};
