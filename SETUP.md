# Setup Guide — Admin Panel for vishnuvardhanrali.com

This adds a free, GitHub-backed admin panel to your existing static site.
Nothing about the public site's HTML/CSS/visual output changed — only
invisible `id` attributes and one extra script were added to `index.html`
so it can load content from `content.json` at runtime.

---

## 1. How it works (quick recap)

- `content.json` in your repo is the single source of truth for editable text.
- `index.html` fetches `content.json` on page load and fills in the page.
  If that fetch ever fails, the static fallback content already in the
  HTML is shown — so the site can never go blank or break.
- `/admin` is a password-protected page. Saving there calls a serverless
  function (`/api/content`), which commits the updated `content.json`
  straight to your GitHub repo using the GitHub REST API.
- Because Vercel is connected to your GitHub repo, every commit to `main`
  triggers an automatic redeploy — no extra step needed on your end.
- Replacing the resume PDF works the same way: it's committed to the repo
  under its exact existing filename, so every old link keeps working.

No database, no paid storage, no third-party service. Just GitHub + Vercel,
both on their free tiers, forever.

---

## 2. Create a GitHub Personal Access Token (safely)

You need a token that can read/write only the one repo this site lives in.
Use a **fine-grained token**, scoped as narrowly as possible:

1. Go to **github.com → Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
2. Click **Generate new token**.
3. **Token name**: something memorable, e.g. `portfolio-admin-panel`.
4. **Expiration**: choose a date (e.g. 1 year). You can always generate a new one later — this is safer than "no expiration."
5. **Repository access**: select **Only select repositories** → choose your portfolio repo only. Do **not** grant access to all repos.
6. **Permissions** → under **Repository permissions**, set:
   - **Contents: Read and write** (this is the only permission actually needed)
   - Leave everything else as "No access."
7. Click **Generate token**, then **copy it immediately** — GitHub only shows it once.

Treat this token like a password:
- Never commit it to the repository.
- Never paste it into chat, code comments, or the `.env.example` file.
- It only ever goes into Vercel's environment variable settings (next section).
- If it's ever exposed, revoke it immediately from the same Settings page and generate a new one.

---

## 3. Configure environment variables in Vercel

1. Open your project on **vercel.com → your project → Settings → Environment Variables**.
2. Add the following (apply each to **Production**, and **Preview** if you use preview deployments):

| Name | Value |
|---|---|
| `GITHUB_TOKEN` | the fine-grained token you just created |
| `GITHUB_OWNER` | your GitHub username, e.g. `VishnuRali` |
| `GITHUB_REPO` | the repository name only, e.g. `portfolio` (not the full URL) |
| `GITHUB_BRANCH` | `main` (or whatever your default branch is called) |
| `ADMIN_PASSWORD` | a long, unique password you'll use to log into `/admin` |

3. Click **Save**.
4. Go to **Deployments** and trigger a redeploy (or just push any commit) so the new environment variables take effect.

You never need to put real values in `.env.example` — that file only documents the variable *names* for reference.

---

## 4. First-time repo setup

Make sure these new files are committed to your repo's default branch (the
one Vercel deploys from):

```
content.json
api/_auth.js
api/_github.js
api/login.js
api/content.js
api/resume.js
admin/login.html
admin/index.html
admin/admin.js
vercel.json
package.json
.gitignore
.env.example
```

And that `index.html` is replaced with the updated version (same visuals,
added IDs + loader script at the bottom).

Once pushed, Vercel will redeploy automatically.

---

## 5. Using the admin panel

1. Visit `https://vishnuvardhanrali.com/admin`.
2. Enter the password you set as `ADMIN_PASSWORD`.
3. Edit any tab (Home, Experience, Projects, Skills, Certifications, Contact, Resume).
4. Click **Save changes** — this commits `content.json` to GitHub.
5. Vercel redeploys automatically; changes are live within roughly 30–60 seconds.
6. To replace your resume PDF, go to the **Resume** tab, choose a new PDF, and click **Upload & Replace** — the filename stays exactly the same, so the existing download links keep working.

---

## 6. Security notes

- The admin password protects write access. Choose something long and not reused elsewhere.
- The session cookie is `HttpOnly` and signed (HMAC), so it can't be read or forged from the browser console.
- The GitHub token has access to only this one repo and only to its contents — even if somehow leaked, the blast radius is limited to that repo.
- If you ever suspect the password or token has leaked, rotate both immediately: generate a new GitHub token (and revoke the old one) and update `ADMIN_PASSWORD` in Vercel.
