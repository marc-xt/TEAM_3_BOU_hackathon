# Contributing Guide — TEAM_3_BOU_hackathon

This is the workflow everyone on the team follows to push and merge code
without stepping on each other. Read it once, then keep it open as a
reference for the first few days.

**Golden rule: nobody commits directly to `main`.** All work happens on a
branch and comes in through a Pull Request (PR). This is what keeps CI
green and lets us catch problems before they hit everyone else's machine.

---

## 1. One-time setup (do this once per laptop)

```powershell
# Clone the repo
git clone https://github.com/marc-xt/TEAM_3_BOU_hackathon.git
cd TEAM_3_BOU_hackathon

# Tell git who you are (skip if already set globally)
git config user.name "Your Name"
git config user.email "you@example.com"
```

Then install dependencies for the part of the project you're working on:

```powershell
# Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
cd ..

# Borrower app
cd borrower-app
npm install
cd ..

# Dashboard
cd dashboard
npm install
cd ..
```

You only need to set up the folder(s) you're actively working in.

---

## 2. Branch naming

Create a new branch for every task — never work on `main` directly.

```
<area>/<short-description>
```

| Area       | Example                          |
|------------|-----------------------------------|
| `backend`  | `backend/fix-score-race-condition` |
| `dashboard`| `dashboard/exposure-heatmap`       |
| `borrower` | `borrower/sms-input-validation`    |
| `docs`     | `docs/update-api-contract`         |

This makes it obvious at a glance who touched what, and keeps everyone's
work in their own lane, which avoids most merge conflicts by default since
the three apps mostly don't share files.

---

## 3. Daily workflow

**Step 1 — Always start from an up-to-date `main`:**

```powershell
git checkout main
git pull origin main
```

**Step 2 — Create your branch:**

```powershell
git checkout -b backend/fix-score-race-condition
```

**Step 3 — Do your work, then check what changed:**

```powershell
git status
git diff
```

**Step 4 — Stage and commit in small, logical chunks** (not one giant
commit at the end of the day):

```powershell
git add backend/core/views.py
git commit -m "Fix double-increment on score update"
```

**Step 5 — Push your branch:**

```powershell
git push -u origin backend/fix-score-race-condition
```

The `-u` only needs to happen the first time you push that branch — after
that, `git push` alone is enough.

---

## 4. Commit message style

Keep it short, present tense, and specific:

```
Fix timezone bug in isScheduledForToday
Add WebSocket reconnect backoff
Update API contract for /cases endpoint
```

Avoid vague messages like `fix stuff` or `updates` — six months from now
(or six hours into a hackathon) nobody will know what that means.

---

## 5. Opening a Pull Request

1. Go to the repo on GitHub — you'll usually see a yellow banner offering
   to open a PR for your just-pushed branch. Click **Compare & pull request**.
2. Base branch: `main`. Compare branch: your feature branch.
3. Title: a one-line summary of the change.
4. Description: what you changed and why, plus anything reviewers should
   pay attention to (e.g. "touches the WebSocket reconnect logic, please
   test the live match card").
5. Click **Create pull request**.

This automatically kicks off the CI workflows (Backend CI, Dashboard CI,
Borrower App CI) — only the ones matching the folders you touched will run.

---

## 6. Wait for CI, then request review

- Watch the **checks** section at the bottom of the PR page.
- ✅ Green = safe to review/merge.
- ❌ Red = click **Details** next to the failing check, find the error in
  the log, and fix it on the same branch (commit + push again — the PR
  updates automatically, no need to open a new one).
- Once checks are green, tag a teammate for review, or if you're solo on
  that area, a quick self-review of the **Files changed** tab still
  catches typos and leftover debug code.

---

## 7. Merging

Once CI is green and the PR is approved:

1. On the PR page, click **Merge pull request**.
2. Use **Squash and merge** (keeps `main`'s history clean — your 12 messy
   commits become 1 tidy one).
3. Delete the branch afterward (GitHub prompts you with a button right
   there) — keeps the branch list from getting cluttered.

Then, on your local machine, sync back up:

```powershell
git checkout main
git pull origin main
git branch -d backend/fix-score-race-condition
```

---

## 8. Keeping your branch updated (avoiding conflicts)

If your PR sits open for a while and `main` moves ahead, update your
branch before merging:

```powershell
git checkout backend/fix-score-race-condition
git pull origin main
```

This merges the latest `main` into your branch. If there's a conflict,
git will mark the affected files — open them, look for the
`<<<<<<< / ======= / >>>>>>>` markers, decide which version (or
combination) is correct, delete the markers, then:

```powershell
git add <the-fixed-files>
git commit
git push
```

The PR updates automatically.

---

## 9. Rules of thumb to avoid conflicts entirely

- **Stay in your lane** — backend dev works mostly in `backend/`,
  dashboard dev in `dashboard/`, borrower dev in `borrower-app/`. Shared
  docs (`docs/API_CONTRACT.md`) are the main place conflicts happen —
  message the team before editing those.
- **Pull `main` at the start of every session**, not just when starting a
  new branch.
- **Keep branches short-lived** — merge within a day or two rather than
  letting a branch sit for a week accumulating drift from `main`.
- **One task per branch/PR** — makes review faster and rollback easier if
  something breaks.

---

## 10. Quick reference

```powershell
# Start new work
git checkout main
git pull origin main
git checkout -b <area>/<short-description>

# Save work
git add <files>
git commit -m "Clear description of the change"
git push -u origin <branch-name>

# Update your branch with latest main
git pull origin main

# After merge, clean up
git checkout main
git pull origin main
git branch -d <branch-name>
```
