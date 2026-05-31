# MCQ Quiz Generator

Past-paper images and PDFs → structured text → interactive MCQ quizzes (Next.js 15).

## Quick start (local)

```bash
npm install
npm run process-images -- --force   # OCR images in data/
npm run build-mcqs                  # → storage/mcqs.json + super.txt
npm run dev                         # http://localhost:3000
```

SPSC PDF (scanned, 165 pages):

```bash
npm run process-spsc-pdf            # slow — OCR per page
npm run build-super                 # refresh storage/super.txt
```

## Deploy on Vercel

1. Push this repo to GitHub (see below).
2. Import the repo at [vercel.com/new](https://vercel.com/new).
3. Framework preset: **Next.js** (auto-detected).
4. Deploy — `storage/mcqs.json` is included so quizzes work without re-OCR on the server.

**Note:** PDF/image OCR is too heavy for Vercel serverless. Run `process-images` / `process-spsc-pdf` locally, commit updated `storage/mcqs.json`, then redeploy.

Optional: set `OPENAI_API_KEY` in Vercel env for better MCQ generation on upload.

## Project layout

| Path | Purpose |
|------|---------|
| `data/` | Source images/PDFs (gitignored — add locally) |
| `storage/extracted/` | Raw OCR text per image/page |
| `storage/structured/` | Structured Q&A per image |
| `storage/pdf-batches/` | SPSC PDF MCQs, 50 per file |
| `storage/mcqs.json` | Quiz database for the app |
| `storage/super.txt` | All MCQs (images + PDF), structured |

## API

- `GET /api/mcqs`
- `POST /api/quiz/start`
- `POST /api/quiz/submit`
- `POST /api/upload-pdf` (images)
- `POST /api/generate-mcqs` (`{ "imagesOnly": true, "useData": true }`)

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: MCQ quiz app with image/PDF pipeline"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mcqs.git
git push -u origin main
```

Replace `YOUR_USERNAME/mcqs` with your repository URL.
